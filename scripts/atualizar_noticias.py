#!/usr/bin/env python3
"""
Atualiza data/noticias.json com as notícias da SEFAZ que dizem respeito ao Tesouro Estadual
(gestão fiscal, contabilidade, dívida, transferências, programas de ajuste fiscal etc.).

A SEFAZ publica notícias de todas as áreas (tributos, fiscalização, Nota Premiada…); aqui
filtramos por palavras-chave no título e no resumo. Ajuste PALAVRAS para refinar o filtro.

Uso:
    python3 scripts/atualizar_noticias.py
"""
import html
import json
import re
import sys
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://sefaz.es.gov.br"
SAIDA = Path(__file__).resolve().parent.parent / "data" / "noticias.json"
CURADORIA = SAIDA.parent / "curadoria-noticias.json"
DESDE = "2024-01-01"      # só considera notícias a partir desta data
MAX_PAGINAS = 20          # 100 notícias por página
MAXIMO = 24               # quantas manter

PALAVRAS = [
    "gestao fiscal", "gestao das financas", "financas publicas", "contas publicas", "equilibrio fiscal",
    "responsabilidade fiscal", "solidez fiscal", "resultado fiscal", "ajuste fiscal", "capacidade de pagamento",
    "capag", "tesouro estadual", "tesouro nacional", "secretaria do tesouro", "stn", "divida publica",
    "contabil", "contabilidade", "balanco", "prestacao de contas", "lrf", "rgf", "rreo",
    "transferencias", "repasse", "cota-parte", "royalties", "fundo soberano", "funses", "propag",
    "profisco", "programacao orcamentaria", "orcamentaria e financeira", "restos a pagar", "ranking",
    "endividamento", "poupanca", "aplicacoes financeiras", "nota a",
]
EXCLUIR = ["nota premiada", "sorteio", "cafe", "cassacao", "apreende", "ipva", "itcmd", "icms", "conformidade tributaria",
           "receita em foco", "plano de contratacoes", "manutencao e adequacao", "jetiba"]


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


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def baixar(url: str) -> str:
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tesouro-portal-noticias/1.0"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read().decode("utf-8", errors="ignore")
        except Exception:  # noqa: BLE001
            time.sleep(4 * (i + 1))
    raise RuntimeError(f"falha ao baixar {url}")


class Lista(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.itens, self.cur, self.campo = [], None, None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "article":
            self.cur = {"titulo": "", "href": "", "data": "", "resumo": "", "img": ""}
        elif self.cur is not None:
            if tag == "img" and not self.cur["img"]:
                self.cur["img"] = a.get("src", "")
            if tag == "h4":
                self.campo = "titulo"
            elif tag == "a" and self.campo == "titulo" and not self.cur["href"]:
                self.cur["href"] = a.get("href", "")
            elif tag == "p":
                self.campo = "resumo"
            elif tag == "div":
                self.campo = self.campo if self.campo in ("titulo",) else "data?"

    def handle_endtag(self, tag):
        if tag == "article" and self.cur is not None:
            self.itens.append(self.cur); self.cur = None; self.campo = None
        elif tag in ("h4", "p"):
            self.campo = None

    def handle_data(self, data):
        if self.cur is None:
            return
        if self.campo == "titulo":
            self.cur["titulo"] += data
        elif self.campo == "resumo":
            self.cur["resumo"] += data
        else:
            m = re.search(r"(\d{2}/\d{2}/\d{4})(?:\s+(\d{2}:\d{2}))?", data)
            if m and not self.cur["data"]:
                self.cur["data"] = m.group(1)


PERMITIDAS_CORPO = {"p", "strong", "em", "ul", "ol", "li", "a", "blockquote", "h2", "h3", "br"}
ALIAS_CORPO = {"b": "strong", "i": "em", "h1": "h2", "h2": "h2", "h3": "h2", "h4": "h3", "h5": "h3", "h6": "h3"}
DESCARTAR_CORPO = {"script", "style", "iframe", "svg", "button", "form", "noscript"}


def href_absoluto(href: str):
    href = (href or "").strip()
    if not href or href.startswith(("#", "javascript:", "\\")):
        return None
    if href.startswith(("mailto:", "tel:")):
        return href
    from urllib.parse import urljoin
    url = urljoin(BASE + "/", href)
    return url if url.startswith(("http://", "https://")) else None


class Corpo(HTMLParser):
    """Extrai o texto de `div.noticia-texto` e o reescreve só com marcas simples (sem estilos do Word, imagens ou scripts)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.dentro = False
        self.nivel = 0
        self.saida = []
        self.pilha = []
        self.descarta = 0
        self.ignoradas = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if not self.dentro:
            if tag == "div" and "noticia-texto" in (a.get("class") or ""):
                self.dentro, self.nivel = True, 1
            return
        if tag == "div":
            self.nivel += 1
            return
        if tag in DESCARTAR_CORPO:
            self.descarta += 1
            return
        t = ALIAS_CORPO.get(tag, tag)
        if t == "br":
            self.saida.append("<br>")
            return
        if t in PERMITIDAS_CORPO:
            if t == "a":
                href = href_absoluto(a.get("href", ""))
                if not href:
                    self.pilha.append("a-vazio")
                    return
                self.pilha.append("a")
                self.saida.append(f'<a href="{html.escape(href, quote=True)}">')
                return
            self.pilha.append(t)
            self.saida.append(f"<{t}>")
        elif tag not in {"span", "o:p", "font", "u", "sup", "sub", "div", "figure", "figcaption"}:
            self.ignoradas[tag] = self.ignoradas.get(tag, 0) + 1

    def handle_endtag(self, tag):
        if not self.dentro:
            return
        if tag == "div":
            self.nivel -= 1
            if self.nivel == 0:
                self.dentro = False
            return
        if tag in DESCARTAR_CORPO:
            self.descarta = max(0, self.descarta - 1)
            return
        t = ALIAS_CORPO.get(tag, tag)
        if t in PERMITIDAS_CORPO and t != "br" and self.pilha:
            # fecha até a marca correspondente (HTML do Word costuma vir mal fechado)
            while self.pilha:
                topo = self.pilha.pop()
                if topo == "a-vazio":
                    if t == "a":
                        break
                    continue
                self.saida.append(f"</{topo}>")
                if topo == t:
                    break

    def handle_data(self, data):
        if self.dentro and not self.descarta:
            self.saida.append(html.escape(sem_travessao(data.replace("\xa0", " ")), quote=False))

    def resultado(self) -> str:
        h = "".join(self.saida)
        while self.pilha:
            topo = self.pilha.pop()
            if topo != "a-vazio":
                h += f"</{topo}>"
        h = re.sub(r"[ \t\r\n]+", " ", h)
        h = re.sub(r"<(p|strong|em|blockquote|h2|h3|li)>\s*</\1>", "", h)
        h = re.sub(r"<(p|strong|em|blockquote|h2|h3|li)>\s*</\1>", "", h)
        h = re.sub(r"(<br>\s*){3,}", "<br><br>", h)
        h = re.sub(r"\s*(<(?:/?(?:p|ul|ol|li|blockquote|h2|h3)|br)>)\s*", r"\1", h)
        return h.strip()


def baixar_corpos(noticias):
    """Traz o texto completo de cada matéria, para que ela abra dentro do portal."""
    for n in noticias:
        n["slug"] = n["href"].rsplit("/", 1)[-1]
        try:
            c = Corpo()
            c.feed(baixar(n["href"]))
            n["corpo"] = c.resultado()
            if c.ignoradas:
                print("   marcas descartadas em", n["slug"][:50], c.ignoradas)
        except Exception as e:  # noqa: BLE001
            print("   sem corpo:", n["slug"], e)
            n["corpo"] = ""
        time.sleep(0.4)



def tipo_imagem(im) -> str:
    """'arte' = cartão gráfico (fundo chapado, texto embutido); 'foto' = fotografia. Heurística simples."""
    t = im.convert("RGB").resize((48, 27))
    cont: dict = {}
    for px in getattr(t, "get_flattened_data", t.getdata)():
        k = tuple(v // 52 for v in px)
        cont[k] = cont.get(k, 0) + 1
    return "arte" if max(cont.values()) / (48 * 27) > 0.30 else "foto"


def baixar_imagens(noticias):
    """Baixa e reduz a imagem de cada notícia para public/img/noticias (requer Pillow; sem ele, segue sem imagens)."""
    try:
        from PIL import Image, ImageOps
        from io import BytesIO
        from urllib.parse import quote
    except ImportError:
        print("AVISO: Pillow não instalado; notícias ficarão sem imagem (pip install pillow)", file=sys.stderr)
        for n in noticias:
            n.pop("_img", None)
        return
    try:
        ajustes = json.loads(CURADORIA.read_text(encoding="utf-8")).get("imagemTipo", {})
    except Exception:  # noqa: BLE001
        ajustes = {}
    pasta = SAIDA.parent.parent / "public" / "img" / "noticias"
    pasta.mkdir(parents=True, exist_ok=True)
    manter = set()
    for n in noticias:
        src = n.pop("_img", "")
        if not src:
            continue
        nome = re.sub(r"[^a-z0-9]+", "-", n["href"].rsplit("/", 1)[-1].lower()).strip("-")[:70] + ".jpg"
        destino = pasta / nome
        manter.add(nome)
        try:
            if not destino.exists():
                url = quote(src if src.startswith("http") else BASE + src, safe=":/%?=&")
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "tesouro-portal-noticias/1.0"}), timeout=90) as r:
                    im = ImageOps.exif_transpose(Image.open(BytesIO(r.read())))
                im.thumbnail((1280, 1280))
                im.convert("RGB").save(destino, "JPEG", quality=80, optimize=True, progressive=True)
            im = Image.open(destino)
            n["imagem"] = f"/img/noticias/{nome}"
            n["imagemLargura"], n["imagemAltura"] = im.size
            n["imagemTipo"] = ajustes.get(n["href"].rsplit("/", 1)[-1]) or tipo_imagem(im)
        except Exception as e:  # noqa: BLE001
            print(f"AVISO: imagem de {n['href']}: {e}", file=sys.stderr)
    for f in pasta.glob("*.jpg"):
        if f.name not in manter:
            f.unlink()


def main():
    achadas, vistos = [], set()
    for pg in range(1, MAX_PAGINAS + 1):
        lista = Lista()
        lista.feed(baixar(f"{BASE}/noticias?pageSize=100&pagenum={pg}"))
        if not lista.itens:
            break
        ultima = None
        for it in lista.itens:
            if not it["data"] or not it["href"]:
                continue
            d = datetime.strptime(it["data"], "%d/%m/%Y").date().isoformat()
            ultima = d
            titulo = re.sub(r"\s+", " ", html.unescape(it["titulo"])).strip()
            resumo = re.sub(r"\s*Leia mais\s*$", "", re.sub(r"\s+", " ", html.unescape(it["resumo"])).strip()).rstrip(". …")
            resumo = re.sub(r"\s*\.\.\.$", "", resumo).strip()
            titulo, resumo = sem_travessao(titulo), sem_travessao(resumo)
            texto = norm(f"{titulo} {resumo}")
            if d < DESDE or it["href"] in vistos:
                continue
            if any(x in texto for x in EXCLUIR):
                continue
            if any(p in texto for p in PALAVRAS):
                vistos.add(it["href"])
                achadas.append({"data": d, "titulo": titulo, "resumo": resumo, "href": BASE + it["href"], "_img": it["img"]})
        print(f"página {pg}: {len(lista.itens)} notícias até {ultima}; {len(achadas)} relevantes")
        if ultima and ultima < DESDE:
            break
        time.sleep(0.5)

    achadas.sort(key=lambda n: n["data"], reverse=True)
    achadas = achadas[:MAXIMO]
    baixar_imagens(achadas)
    baixar_corpos(achadas)
    try:
        capas = json.loads(CURADORIA.read_text(encoding="utf-8")).get("destaques", [])
    except Exception:  # noqa: BLE001
        capas = []
    for n in achadas:
        if n["href"].rsplit("/", 1)[-1] in capas:
            n["destaque"] = True
    SAIDA.write_text(json.dumps({
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": f"{BASE}/noticias", "noticias": achadas,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"OK: {len(achadas)} notícias -> {SAIDA}")
    for n in achadas:
        print(" ", n["data"], n["titulo"][:95])


if __name__ == "__main__":
    main()
