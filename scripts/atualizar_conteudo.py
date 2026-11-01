#!/usr/bin/env python3
"""
Atualiza o conteúdo do portal a partir das páginas públicas do Tesouro Estadual
no site da SEFAZ (https://sefaz.es.gov.br).

Gera:
  data/paginas.json: cada página do Tesouro: texto (HTML saneado) e grupos de arquivos
  data/acervo.json: lista plana de todos os arquivos (usada na busca de /publicacoes)

Uso:
    python3 scripts/atualizar_conteudo.py

Somente biblioteca padrão. Os PDFs NÃO são copiados: o portal aponta para o arquivo
oficial na SEFAZ, que continua sendo a fonte única da verdade (evita versões
desatualizadas de documentos fiscais e repositório com gigabytes de PDFs).

Atenção: a data que a SEFAZ exibe em cada linha é a de ATUALIZAÇÃO do arquivo, não a do
período de referência. Por isso `ano`/`periodo` (extraídos do título) ficam separados
de `atualizadoEm`.
"""
import hashlib
import html
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

BASE = "https://sefaz.es.gov.br"
DADOS = Path(__file__).resolve().parent.parent / "data"

# slug na SEFAZ -> (categoria de filtro, seção do portal, rótulo para título de exibição ou None)
# `categoria` é o `tipo` usado nos filtros de /publicacoes.
PAGINAS = {
    # Relatórios fiscais
    "resultado-do-tesouro-estadual": ("resultado-tesouro", "Relatórios fiscais", "Resultado do Tesouro Estadual"),
    "rreo": ("rreo", "Relatórios fiscais", "RREO"),
    "rgf": ("rgf", "Relatórios fiscais", "RGF"),
    "relatorio-anual-da-divida-publica-e-do-progarma-de-ajuste-fiscal": ("divida-paf", "Relatórios fiscais", "Relatório Anual da Dívida Pública e do PAF"),
    "GrupodeArquivos/balanco-de-execucao-do-propag": ("divida-paf", "Relatórios fiscais", None),
    "programa-de-reestruturacao-e-de-ajuste-fiscal-paf": ("divida-paf", "Relatórios fiscais", None),
    # Tesouro Cidadão
    "balanco-cidadao": ("cidadao", "Tesouro Cidadão", "Balanço Cidadão"),
    "rreo-cidadao": ("cidadao", "Tesouro Cidadão", "RREO Cidadão"),
    "rgf-cidadao": ("cidadao", "Tesouro Cidadão", "RGF Cidadão"),
    # Contabilidade aplicada
    "resultado-de-caixa-do-tesouro-estadual": ("resultado-caixa", "Contabilidade aplicada", "Resultado de Caixa do Tesouro"),
    "transferencias-constitucionais-aos-municipios": ("municipios", "Contabilidade aplicada", "Distribuição mensal aos Municípios"),
    "receita-realizada-mensal-2": ("receita-realizada", "Contabilidade aplicada", None),
    "manual-de-contabilidade-mcont": ("normas-contabeis", "Contabilidade aplicada", None),
    "GrupodeArquivos/manual-de-retencao-ir-pj": ("normas-contabeis", "Contabilidade aplicada", None),
    "novas-tecnicas": ("normas-contabeis", "Contabilidade aplicada", None),
    "sistema-de-contabilidade": ("normas-contabeis", "Contabilidade aplicada", None),
    "sistema-financeiro": ("normas-contabeis", "Contabilidade aplicada", None),
    "legislacao-para-orientacoes-contabeis": ("legislacao", "Legislação do Tesouro", None),
    "demais-legislacoes-contabeis": ("legislacao", "Legislação do Tesouro", None),
    "imposto-de-renda-retido-na-fonte": ("legislacao", "Legislação do Tesouro", None),
    "consulta-publica": ("legislacao", "Consulta pública", None),
    "consulta-publica-2": ("legislacao", "Consulta pública", None),
    "GrupodeArquivos/normativos": ("legislacao", "Consulta pública", None),
    # Finanças
    "abertura-de-contas-bancarias": ("financas", "Finanças", None),
    "execucao-financeira-tesouro": ("financas", "Finanças", None),
    "GrupodeArquivos/notas-tecnicas": ("notas-tecnicas", "Finanças", None),
    "obrigacoes-de-pequeno-valor-opv-nao-dativos": ("opv", "Finanças", None),
    "obrigacoes-de-pequeno-valor-opv-dativos": ("opv", "Finanças", None),
    "transferencias-especiais": ("transferencias-especiais", "Finanças", None),
    "boletim-informativo-2": ("boletins", "Finanças", None),
    "boletim-informativo": ("boletins", "Sistema de Custos", None),
    # Outras áreas
    "funses": ("funses", "Fundo Soberano", None),
    "prestacao-de-contas-do-governador": ("prestacao-contas", "Prestação de contas", None),
    "sigefes-links": ("sistemas", "Sistemas", None),
    "siafem": ("sistemas", "Sistemas", None),
}

ORDINAIS = {"primeiro": 1, "segundo": 2, "terceiro": 3, "quarto": 4, "quinto": 5, "sexto": 6}
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]
SLUG_INTERNO = {s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") for s in PAGINAS}
SLUG_POR_URL = {s.lower(): v for s, v in SLUG_INTERNO.items()}

PERMITIDAS = {"p", "strong", "b", "em", "i", "ul", "ol", "li", "a", "blockquote", "h4", "h5", "h6"}
IGNORAR = {"script", "style", "svg", "nav", "footer", "noscript", "form", "select", "textarea", "label", "iframe"}
TITULOS = {"h2", "h3", "h4", "h5", "h6"}


def sem_travessao(t):
    """Troca travessões (— e –) por pontuação comum: sigla vira parênteses, o resto vira vírgula ou dois-pontos."""
    if not t or ("–" not in t and "—" not in t):
        return t
    t = re.sub(r"\s+[–—]\s+([A-ZÀ-Ý][A-ZÀ-Ý0-9\-]{1,9})(?=$|[.,;:)])", r" (\1)", t)
    t = re.sub(r"\s+[–—]\s+(?=[a-zà-ÿ])", ", ", t)
    return re.sub(r"\s*[–—]\s*", ": ", t)


def sem_travessao_html(h):
    """Idem, só no texto (fora das marcações HTML)."""
    return "".join(p if p.startswith("<") else sem_travessao(p) for p in re.split(r"(<[^>]+>)", h))


def baixar(url: str, tentativas=3) -> str:
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tesouro-portal-conteudo/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8", errors="ignore")
        except Exception as e:  # noqa: BLE001
            if i == tentativas - 1:
                raise
            time.sleep(3 * (i + 1))
    return ""


def limpar(s: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", s)).strip()


def absoluto(href: str) -> str | None:
    href = href.strip()
    if not href or href == "#" or href.startswith(("javascript:", "\\")):
        return None
    if href.startswith(("mailto:", "tel:")):
        return href
    url = urljoin(BASE + "/", href)
    return url if url.startswith(("http://", "https://")) else None


class Extrator(HTMLParser):
    """Percorre o <main> e separa texto corrido (HTML saneado) de tabelas de arquivos."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.segmentos: list[dict] = []
        self.titulo_pagina = ""
        self.buf: list[str] = []
        self.pilha: list[str] = []
        self.ignorar = 0          # nav / footer / tags / script
        self.em_header = False
        self.em_titulo = None     # h2..h6 corrente
        self.txt_titulo = ""
        self.em_botao = False
        self.grupo_titulo = ""
        self.tabela = None
        self.linha = None
        self.celula = None
        self.link_atual = None

    # -------- texto saneado
    def _flush(self):
        h = "".join(self.buf).strip()
        self.buf = []
        h = re.sub(r"(<br>\s*){3,}", "<br><br>", h)
        h = re.sub(r"<p>\s*(<br>\s*)*</p>", "", h)
        h = re.sub(r"<(ul|ol)>\s*</\1>", "", h)
        h = re.sub(r"\s+", " ", h).strip()
        plano = re.sub(r"<[^>]+>", " ", h)
        if re.search(r"arquivos\s+Exibir", plano) or not plano.strip():
            return
        if re.fullmatch(r"\s*\d+\s*-\s*\d+\s+de\s+\d+\s+arquivos\s*", plano):
            return
        h = re.sub(r"^(\s*</(?:li|ul|ol)>)+", "", h).strip()
        # <br> entre blocos só cria vazio: remove
        h = re.sub(r"(</(?:p|ul|ol|blockquote)>)\s*(?:<br>\s*)+", r"\1 ", h)
        h = re.sub(r"(?:<br>\s*)+(<(?:p|ul|ol|blockquote)>)", r"\1", h)
        h = re.sub(r"(<(?:p|li)>)\s*(?:<br>\s*)+", r"\1", h)
        h = re.sub(r"(?:<br>\s*)+(</(?:p|li)>)", r"\1", h)
        if h:
            self.segmentos.append({"tipo": "texto", "html": h})

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in IGNORAR:
            self.ignorar += 1
            return
        if self.ignorar:
            return
        if tag == "br" and self.tabela is None and not self.em_titulo:
            self.buf.append("<br>")
            return
        if tag == "a" and a.get("href", "").startswith("/tags/"):
            self.ignorar += 1
            self.pilha.append("tagslink")
            return
        if tag == "header":
            self.em_header = True
        if tag == "table":
            self._flush()
            self.tabela = {"titulo": self.grupo_titulo, "itens": []}
            self.grupo_titulo = ""
            return
        if self.tabela is not None:
            if tag == "tr":
                self.linha = []
            elif tag in ("td", "th"):
                self.celula = {"txt": [], "links": [], "th": tag == "th"}
            elif tag == "a" and self.celula is not None:
                self.link_atual = {"href": a.get("href", ""), "txt": []}
            return
        if tag in TITULOS:
            self.em_titulo = tag
            self.txt_titulo = ""
            return
        if tag == "button":
            self.em_botao = True
            return
        if tag in PERMITIDAS:
            if tag == "a":
                href = absoluto(a.get("href", ""))
                if not href:
                    self.pilha.append("a-sem-href")
                    return
                self.pilha.append("a")
                self.buf.append(f'<a href="{html.escape(href, quote=True)}">')
                return
            self.pilha.append(tag)
            self.buf.append(f"<{tag}>")

    def handle_endtag(self, tag):
        if tag == "br":
            return
        if tag in IGNORAR:
            self.ignorar = max(0, self.ignorar - 1)
            return
        if self.pilha and self.pilha[-1] == "tagslink" and tag == "a":
            self.pilha.pop(); self.ignorar = max(0, self.ignorar - 1)
            return
        if self.ignorar:
            return
        if tag == "header":
            self.em_header = False
        if self.tabela is not None:
            if tag == "a" and self.link_atual is not None and self.celula is not None:
                self.celula["links"].append(self.link_atual); self.link_atual = None
            elif tag in ("td", "th") and self.celula is not None and self.linha is not None:
                self.linha.append(self.celula); self.celula = None
            elif tag == "tr" and self.linha is not None:
                self._linha_arquivo(self.linha); self.linha = None
            elif tag == "table":
                if self.tabela["itens"]:
                    self.segmentos.append({"tipo": "arquivos", "titulo": self.tabela["titulo"], "itens": self.tabela["itens"]})
                self.tabela = None
            return
        if tag in TITULOS and self.em_titulo == tag:
            t = limpar(self.txt_titulo)
            self.em_titulo = None
            if not t:
                return
            if self.em_header and not self.titulo_pagina:
                self.titulo_pagina = t
            else:
                # título de grupo: serve de rótulo para a tabela seguinte; se vier texto depois, vira subtítulo
                self._flush()
                self.grupo_titulo = t
                self.segmentos.append({"tipo": "subtitulo", "texto": t})
            return
        if tag == "button":
            self.em_botao = False
            return
        if tag in PERMITIDAS:
            if tag == "a":
                if self.pilha and self.pilha[-1] == "a":
                    self.pilha.pop(); self.buf.append("</a>")
                elif self.pilha and self.pilha[-1] == "a-sem-href":
                    self.pilha.pop()
                return
            if tag in self.pilha:
                while self.pilha:
                    topo = self.pilha.pop()
                    self.buf.append(f"</{topo}>" if topo not in ("a-sem-href", "tagslink") else "")
                    if topo == tag:
                        break
        elif tag in ("div", "section", "article") and self.buf and self.buf[-1] != "<br>":
            pass

    def handle_data(self, data):
        if self.ignorar:
            return
        if self.tabela is not None:
            if self.celula is not None:
                self.celula["txt"].append(data)
                if self.link_atual is not None:
                    self.link_atual["txt"].append(data)
            return
        if self.em_titulo:
            self.txt_titulo += data
            return
        if self.em_botao:
            self.txt_titulo += data
            return
        self.buf.append(html.escape(data))

    def fechar(self):
        self._flush()

    # -------- linhas de tabela
    def _linha_arquivo(self, cels):
        if not cels or all(c["th"] for c in cels):
            return
        c0 = cels[0]
        texto0 = limpar("".join(c0["txt"]))
        links0 = [l for l in c0["links"] if absoluto(l["href"])]
        url = absoluto(links0[0]["href"]) if links0 else None
        if not url:
            for c in reversed(cels):
                ls = [l for l in c["links"] if absoluto(l["href"])]
                if ls:
                    url = absoluto(ls[0]["href"]); break
        if not url or not texto0:
            return
        titulo = limpar("".join(links0[0]["txt"])) if links0 else texto0
        descr = texto0.replace(titulo, "", 1).strip(" -:") if titulo and titulo != texto0 else ""
        resto = " ".join(limpar("".join(c["txt"])) for c in cels[1:])
        d = re.search(r"\d{2}/\d{2}/\d{4}", resto)
        tam = re.search(r"\d+(?:[.,]\d+)?\s*(?:KB|MB|GB)", resto, re.I)
        fmt = re.search(r"\b(pdf|xlsx?|docx?|zip|csv|odt|ods|pptx?)\b", resto, re.I)
        self.tabela["itens"].append({
            "titulo": titulo, "descricao": descr[:600],
            "atualizadoEm": d.group(0) if d else None,
            "tamanho": re.sub(r"\s+", " ", tam.group(0)).upper().replace(" ", " ") if tam else None,
            "formato": fmt.group(1).lower() if fmt else ("pdf" if url.lower().endswith(".pdf") else "link"),
            "url": url,
        })


def processar(slug_sefaz: str):
    categoria, secao, rotulo = PAGINAS[slug_sefaz]
    pagina = baixar(f"{BASE}/{slug_sefaz}")
    m = re.search(r"<main[\s\S]*?</main>", pagina)
    corpo = m.group(0) if m else pagina
    ex = Extrator()
    ex.feed(corpo)
    ex.fechar()
    titulo = sem_travessao(ex.titulo_pagina or slug_sefaz)
    for sg in ex.segmentos:
        if sg["tipo"] == "texto":
            sg["html"] = sem_travessao_html(sg["html"])
        elif sg["tipo"] == "subtitulo":
            sg["texto"] = sem_travessao(sg["texto"])
        else:
            sg["titulo"] = sem_travessao(sg["titulo"])
            for it in sg["itens"]:
                it["titulo"] = sem_travessao(it["titulo"])
                it["descricao"] = sem_travessao(it["descricao"])

    # reescreve links internos (…/slug de página já ingerida) para rotas do portal
    def reescrever(h: str) -> str:
        def sub(mm):
            href = mm.group(1)
            p = re.match(rf"{re.escape(BASE)}/([^?#]+)$", href)
            if p and p.group(1).lower() in SLUG_POR_URL:
                return f'<a href="/tesouro/{SLUG_POR_URL[p.group(1).lower()]}">'
            return mm.group(0)
        return re.sub(r'<a href="([^"]+)">', sub, h)

    segs = []
    for s in ex.segmentos:
        if s["tipo"] == "texto":
            s["html"] = reescrever(s["html"])
        segs.append(s)
    # Um mesmo título não pode aparecer duas vezes: se o subtítulo vem logo antes da tabela com o mesmo
    # nome, fica só o da tabela; se há texto no meio, fica o subtítulo e a tabela perde o rótulo.
    limpos = []
    ultimo_sub = ""
    for i, sg in enumerate(segs):
        if sg["tipo"] == "subtitulo":
            prox = segs[i + 1] if i + 1 < len(segs) else None
            if prox and prox["tipo"] == "arquivos" and prox["titulo"] == sg["texto"]:
                continue
            if sg["texto"] == titulo:
                continue
            ultimo_sub = sg["texto"]
        elif sg["tipo"] == "arquivos" and sg["titulo"] and sg["titulo"] == ultimo_sub:
            sg["titulo"] = ""
        limpos.append(sg)
    return {
        "slug": SLUG_INTERNO[slug_sefaz], "slugSefaz": slug_sefaz, "titulo": titulo, "secao": secao,
        "categoria": categoria, "fonte": f"{BASE}/{slug_sefaz}", "segmentos": limpos,
    }, rotulo


def ano_de(*textos):
    for t in textos:
        if t:
            m = re.search(r"\b(19|20)\d{2}\b", t)
            if m:
                return int(m.group(0))
    return None


def periodo_de(titulo: str):
    t = titulo.lower()
    m = re.search(r"(primeiro|segundo|terceiro|quarto|quinto|sexto|[1-6])\s*[°º]?\s*(bimestre|bim|quadrimestre|quad)", t)
    if m:
        n = ORDINAIS.get(m.group(1)) or int(m.group(1))
        return f"{n}º {'bimestre' if m.group(2).startswith('bim') else 'quadrimestre'}", n
    m = re.search(r"(primeiro|segundo|terceiro|quarto|quinto|sexto)\s+bimestre", t)
    if m:
        n = ORDINAIS[m.group(1)]
        return f"{n}º bimestre", n
    for i, mes in enumerate(MESES, 1):
        if mes in t:
            return mes.capitalize(), i
    m = re.search(r"(?:distribui[çc][ãa]o mensal[^\d]*)(\d{2})[_ ]\d{4}", t)
    if m and 1 <= int(m.group(1)) <= 12:
        n = int(m.group(1))
        return MESES[n - 1].capitalize(), n
    return None, 0


def iso(d):
    return datetime.strptime(d, "%d/%m/%Y").date().isoformat() if d else None


def main():
    DADOS.mkdir(parents=True, exist_ok=True)
    paginas, acervo, vistos = [], [], set()
    for slug_sefaz in PAGINAS:
        try:
            pag, rotulo = processar(slug_sefaz)
        except Exception as e:  # noqa: BLE001
            print(f"AVISO: falha em {slug_sefaz}: {e}", file=sys.stderr)
            continue
        categoria = pag["categoria"]
        n = 0
        for seg in pag["segmentos"]:
            if seg["tipo"] != "arquivos":
                continue
            for it in seg["itens"]:
                titulo = it["titulo"]
                chave = (pag["slug"], titulo, it["url"])
                if chave in vistos:
                    continue
                vistos.add(chave)
                ano = ano_de(titulo, seg["titulo"])
                periodo, ordem = periodo_de(titulo)
                exib = titulo
                if rotulo and ano and periodo and categoria != "divida-paf":
                    if re.search(r"º (bimestre|quadrimestre)$", periodo):
                        exib = f"{rotulo} do {periodo} de {ano}"
                    else:  # mês
                        exib = f"{rotulo} de {periodo.lower()} de {ano}"
                elif categoria == "divida-paf" and rotulo and re.fullmatch(r"\d{4}", titulo.strip()):
                    exib = f"{rotulo} de {titulo.strip()}"
                it["exibicao"] = exib
                acervo.append({
                    "id": hashlib.sha1(f"{pag['slug']}|{titulo}|{it['url']}".encode()).hexdigest()[:10],
                    "tipo": categoria, "pagina": pag["slug"], "titulo": exib, "tituloOriginal": titulo,
                    "descricao": it["descricao"], "grupo": seg["titulo"] or None,
                    "ano": ano, "periodo": periodo, "ordem": ordem,
                    "atualizadoEm": iso(it["atualizadoEm"]), "tamanho": it["tamanho"],
                    "formato": it["formato"], "url": it["url"], "fonte": pag["fonte"],
                })
                n += 1
        paginas.append(pag)
        textos = sum(len(re.sub(r"<[^>]+>", "", s["html"])) for s in pag["segmentos"] if s["tipo"] == "texto")
        print(f"{pag['slug']}: {n} arquivos, {textos} caracteres de texto")
        time.sleep(0.4)

    acervo.sort(key=lambda i: (i["ano"] or 0, i["ordem"], i["atualizadoEm"] or ""), reverse=True)
    agora = datetime.now(timezone.utc).isoformat(timespec="seconds")
    (DADOS / "acervo.json").write_text(json.dumps({"geradoEm": agora, "fonte": BASE, "total": len(acervo), "itens": acervo}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (DADOS / "paginas.json").write_text(json.dumps({"geradoEm": agora, "fonte": BASE, "paginas": paginas}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"OK: {len(paginas)} páginas, {len(acervo)} arquivos")


if __name__ == "__main__":
    main()
