#!/usr/bin/env python3
"""
Extrai os quadros macro da PLOA 2027 (Mensagem nº 189/2026, PDF digitalizado) e grava data/ploa2027-macro.json:

  p. 97   "Evolução da Receita" (Lei 4.320, art. 22): 2023 a 2025 (arrecadação), orçamento 2026, arrecadação provável 2026 e estimativa 2027
  p. 130  "Evolução da Despesa": execução 2023 a 2025, orçamento 2026, execução provável 2026 e proposta 2027

As linhas são lidas por OCR (Tesseract) e só são aceitas se fecharem as equações do próprio quadro (por exemplo,
receitas correntes = soma das origens; total = correntes + capital + intraorçamentárias - deduções). Células que não
fecham são trocadas pela leitura alternativa (outra resolução de página) que feche; se nenhuma fechar, o script falha.

Uso: python3 scripts/ploa/macro_ploa.py ARQUIVO.pdf
Requisitos: poppler-utils (pdftoppm) e tesseract-ocr com o idioma por.
"""
import itertools
import json
import re
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / "data" / "ploa2027-macro.json"
# tolerância de arredondamento do próprio quadro (os totais impressos diferem da soma dos itens por até R$ 2)
TOL = 2
COLUNAS = ["2023", "2024", "2025", "orcamento2026", "provavel2026", "estimativa2027"]

# (chave, rótulo, nível, regex do início do rótulo na linha lida)
RECEITA = [
    ("receitas_correntes", "Receitas correntes", 0, r"^RECEITAS CORRENTES\b(?! INTRA)"),
    ("impostos_taxas_cm", "Impostos, taxas e contribuições de melhoria", 1, r"^IMPOSTOS, TAXAS"),
    ("impostos", "Impostos", 2, r"^IMPOSTOS$"),
    ("irrf", "IRRF", 3, r"^IRRF"),
    ("ipva", "IPVA", 3, r"^IPVA"),
    ("itcd", "ITCD", 3, r"^ITCD"),
    ("icms", "ICMS", 3, r"^ICMS"),
    ("taxas", "Taxas", 2, r"^TAXAS"),
    ("contrib_melhoria", "Contribuições de melhoria", 2, r"^CONTRIBUIÇÕES DE MELHORIA"),
    ("contribuicoes", "Receita de contribuições", 1, r"^RECEITA DE CONTRIBUIÇÕES"),
    ("patrimonial", "Receita patrimonial", 1, r"^RECEITA PATRIMONIAL"),
    ("agropecuaria", "Receita agropecuária", 1, r"^RECEITA AGROPECUÁRIA"),
    ("industrial", "Receita industrial", 1, r"^RECEITA INDUSTRIAL"),
    ("servicos", "Receita de serviços", 1, r"^RECEITA DE SERVIÇOS"),
    ("transf_correntes", "Transferências correntes", 1, r"^TRANSFERÊNCIAS CORRENTES"),
    ("transf_corr_uniao", "Transferências da União", 2, r"^TRANSFERÊNCIAS DA UNI"),
    ("transf_corr_outras", "Outras transferências", 2, r"^OUTRAS TRANSFERÊNCIAS"),
    ("outras_correntes", "Outras receitas correntes", 1, r"^OUTRAS RECEITAS CORRENTES"),
    ("intra", "Receitas correntes intraorçamentárias", 0, r"^RECEITAS CORRENTES INTRA"),
    ("receitas_capital", "Receitas de capital", 0, r"^RECEITAS DE CAPITAL"),
    ("operacoes_credito", "Operações de crédito", 1, r"^OPERAÇÕES DE CRÉDITO"),
    ("alienacao", "Alienação de bens", 1, r"^ALIENAÇÃO DE BENS"),
    ("amortizacao_emprestimos", "Amortização de empréstimos", 1, r"^AMORTIZAÇÃO DE EMPR"),
    ("transf_capital", "Transferências de capital", 1, r"^TRANSFERÊNCIAS DE CAPITAL"),
    ("transf_cap_uniao", "Transferências da União", 2, r"^TRANSFERÊNCIAS DA UNI"),
    ("transf_cap_outras", "Outras transferências", 2, r"^OUTRAS TRANSFERÊNCIAS"),
    ("outras_capital", "Outras receitas de capital", 1, r"^OUTRAS RECEITAS DE CAPITAL"),
    ("deducoes", "Deduções da receita", 0, r"^DEDUÇÕES DA RECEITA"),
    ("ded_municipios", "Transferências a municípios", 1, r"^TRANSFERÊNCIAS A MUNIC"),
    ("ded_fundeb", "FUNDEB", 1, r"^FUNDEB"),
    ("ded_outras", "Outras deduções", 1, r"^OUTRAS DEDUÇÕES"),
    ("total", "Total", 0, r"^TOTAL$"),
]
DESPESA = [
    ("despesas_correntes", "Despesas correntes", 0, r"^DESPESAS CORRENTES"),
    ("pessoal", "Pessoal e encargos sociais", 1, r"^PESSOAL E ENCARGOS"),
    ("juros", "Juros e encargos da dívida pública", 1, r"^JUROS E ENCARGOS"),
    ("outras_correntes", "Outras despesas correntes", 1, r"^OUTRAS DESPESAS CORRENTES"),
    ("despesas_capital", "Despesas de capital", 0, r"^DESPESAS DE CAPITAL"),
    ("investimento", "Investimentos", 1, r"^INVESTIMENTO"),
    ("inversoes", "Inversões financeiras", 1, r"^INVERSÕES FINANCEIRAS"),
    ("amortizacao", "Amortização da dívida pública", 1, r"^AMORTIZAÇÃO DA D"),
    ("reserva_rpps", "Reserva do RPPS", 0, r"^RESERVA DO RPPS"),
    ("reserva_contingencia", "Reserva de contingência", 0, r"^RESERVA DE CONTING"),
    ("total", "Total", 0, r"^TOTAL$"),
]


def render(pdf, pag, dpi):
    d = tempfile.mkdtemp()
    base = f"{d}/p"
    subprocess.run(["pdftoppm", "-r", str(dpi), "-gray", "-f", str(pag), "-l", str(pag), "-png", "-singlefile", pdf, base], check=True)
    return base + ".png"


def ocr(png):
    r = subprocess.run(["tesseract", png, "stdout", "-l", "por", "--psm", "6"], capture_output=True, text=True)
    return r.stdout


def _valor(tok):
    if tok == "-":
        return 0
    neg = tok.startswith("(")
    v = int(re.sub(r"\D", "", tok))
    return -v if neg else v


def _formato_ok(tok):
    return bool(re.fullmatch(r"\(?\d{1,3}(?:\.\d{3})*\)?|-", tok))


def numeros(trecho, n=6):
    """
    Lê os n valores de uma linha. O OCR às vezes parte um número em dois (por exemplo, "164.093 138"):
    quando sobram tokens, escolhe-se a junção que deixa todos com formato de milhar válido e com ordens de grandeza
    parecidas entre si (as colunas de um mesmo quadro têm valores do mesmo porte).
    """
    t = re.sub(r"\s*([.,]+)\s*", ".", trecho)
    toks = re.findall(r"\(?\d[\d.]*\)?|(?<!\S)-(?!\S)", t)
    toks = [x.strip(".") if not x.startswith("(") else x for x in toks]
    if len(toks) > n:
        melhor = None
        for pontos in itertools.combinations(range(len(toks) - 1), len(toks) - n):
            novos, i = [], 0
            while i < len(toks):
                if i in pontos:
                    # junta com o seguinte (pode encadear)
                    j = i
                    acum = toks[i]
                    while j in pontos:
                        j += 1
                        acum = acum.rstrip(")") + "." + toks[j].lstrip("(")
                    novos.append(acum)
                    i = j + 1
                else:
                    novos.append(toks[i])
                    i += 1
            if len(novos) != n or not all(_formato_ok(x) for x in novos):
                continue
            tam = [len(re.sub(r"\D", "", x)) for x in novos if x != "-"]
            var = (max(tam) - min(tam)) if tam else 0
            if melhor is None or var < melhor[0]:
                melhor = (var, novos)
        if melhor:
            toks = melhor[1]
    return [_valor(x) for x in toks]


def separa(linha):
    """Separa o rótulo (texto) dos valores (números, '-' e parênteses) de uma linha lida."""
    l = re.sub(r"^[^A-ZÀ-Ú]*", "", linha.strip().upper())
    m = re.search(r"[\d(]|\s-\s|\s-$", l)
    if not m:
        return l.strip(), ""
    return l[:m.start()].strip(" ,.?²"), l[m.start():]


def le_quadro(texto, linhas_def):
    linhas = [separa(l) for l in texto.splitlines() if l.strip()]
    achados, pos = {}, 0
    for chave, rotulo, nivel, rx in linhas_def:
        for i in range(pos, len(linhas)):
            rot, resto = linhas[i]
            if re.search(rx, rot):
                achados[chave] = numeros(resto)
                pos = i + 1
                break
    return achados


CONFUSOES = {"0": "86", "8": "03569", "3": "58", "5": "36", "6": "58", "1": "7", "7": "1", "9": "48", "4": "9", "2": "7"}


def variantes_1_digito(n):
    """Valores que diferem de n por um dígito, trocado por um parecido (3 e 5, 6 e 8, 1 e 7...)."""
    s, sinal = str(abs(n)), (-1 if n < 0 else 1)
    for i, ch in enumerate(s):
        for alt in CONFUSOES.get(ch, ""):
            r = s[:i] + alt + s[i + 1:]
            if r[0] != "0" or len(r) == 1:
                yield sinal * int(r)


def fecha_receita(v, c):
    g = lambda k: v[k][c]
    erros = []
    def eq(nome, a, b):
        if abs(a - b) > TOL:
            erros.append((nome, a, b))
    eq("impostos_taxas_cm", g("impostos_taxas_cm"), g("impostos") + g("taxas") + g("contrib_melhoria"))
    eq("receitas_correntes", g("receitas_correntes"), g("impostos_taxas_cm") + g("contribuicoes") + g("patrimonial") + g("agropecuaria") + g("industrial") + g("servicos") + g("transf_correntes") + g("outras_correntes"))
    eq("transf_correntes", g("transf_correntes"), g("transf_corr_uniao") + g("transf_corr_outras"))
    eq("transf_capital", g("transf_capital"), g("transf_cap_uniao") + g("transf_cap_outras"))
    eq("receitas_capital", g("receitas_capital"), g("operacoes_credito") + g("alienacao") + g("amortizacao_emprestimos") + g("transf_capital") + g("outras_capital"))
    eq("deducoes", g("deducoes"), g("ded_municipios") + g("ded_fundeb") + g("ded_outras"))
    eq("total", g("total"), g("receitas_correntes") + g("intra") + g("receitas_capital") + g("deducoes"))
    eq("impostos", g("impostos"), g("irrf") + g("ipva") + g("itcd") + g("icms"))
    return erros


def fecha_despesa(v, c):
    g = lambda k: v[k][c]
    erros = []
    def eq(nome, a, b):
        if abs(a - b) > TOL:
            erros.append((nome, a, b))
    eq("despesas_correntes", g("despesas_correntes"), g("pessoal") + g("juros") + g("outras_correntes"))
    eq("despesas_capital", g("despesas_capital"), g("investimento") + g("inversoes") + g("amortizacao"))
    eq("total", g("total"), g("despesas_correntes") + g("despesas_capital") + g("reserva_rpps") + g("reserva_contingencia"))
    return erros


def preenche_faltantes(v, defs):
    for chave, *_ in defs:
        v.setdefault(chave, [0] * 6)
        if len(v[chave]) < 6:
            v[chave] = (v[chave] + [0] * 6)[:6]
    return v


def le_total_recortado(png):
    """A linha TOTAL da receita fica numa caixa com borda e o OCR da página inteira a ignora: lê-se o recorte."""
    from PIL import Image
    im = Image.open(png)
    w, h = im.size
    for y0, y1 in ((0.428, 0.452), (0.425, 0.455), (0.43, 0.448)):
        cut = im.crop((0, int(h * y0), w, int(h * y1)))
        cut = cut.resize((cut.width * 2, cut.height * 2))
        tmp = png.replace(".png", "_tot.png")
        cut.save(tmp)
        r = subprocess.run(["tesseract", tmp, "stdout", "-l", "por", "--psm", "7"], capture_output=True, text=True)
        rot, resto = separa(r.stdout.strip().replace("|", " "))
        vals = numeros(re.sub(r"^[^\d(]*", "", r.stdout.replace("|", " ")))
        if len(vals) == 6:
            return vals
    return None


def extrai(pdf, pag, defs, fecha):
    leituras = []
    for dpi in (300, 400, 250):
        png = render(pdf, pag, dpi)
        t = ocr(png)
        lido = le_quadro(t, defs)
        if "total" not in lido:
            tot = le_total_recortado(png)
            if tot:
                lido["total"] = tot
        v = preenche_faltantes(lido, defs)
        # linhas com número de colunas diferente de 6 são suspeitas
        leituras.append(v)
    base = {k: list(v) for k, v in leituras[0].items()}
    desvio = lambda v, c: sum(abs(a - b) for _, a, b in fecha(v, c))
    for c in range(6):
        if not fecha(base, c):
            continue
        # tenta a coluna inteira de cada leitura alternativa
        for alt in leituras[1:]:
            teste = {k: list(v) for k, v in base.items()}
            for k in teste:
                teste[k][c] = alt[k][c]
            if desvio(teste, c) < desvio(base, c):
                base = teste
            if not fecha(base, c):
                break
        # troca uma célula por vez enquanto o desvio cair
        melhorou = True
        while fecha(base, c) and melhorou:
            melhorou = False
            for k, *_ in defs:
                for alt in leituras:
                    if alt[k][c] == base[k][c]:
                        continue
                    teste = {kk: list(vv) for kk, vv in base.items()}
                    teste[k][c] = alt[k][c]
                    if desvio(teste, c) < desvio(base, c):
                        base = teste
                        melhorou = True
    # último recurso: troca de um dígito por confusão visual, só se a equação passar a fechar
    for c in range(6):
        while fecha(base, c):
            falhas = fecha(base, c)
            achou = False
            for k, *_ in defs:
                for alt in variantes_1_digito(base[k][c]):
                    teste = {kk: list(vv) for kk, vv in base.items()}
                    teste[k][c] = alt
                    if len(fecha(teste, c)) < len(falhas):
                        base, achou = teste, True
                        break
                if achou:
                    break
            if not achou:
                break
    pendencias = {COLUNAS[c]: fecha(base, c) for c in range(6) if fecha(base, c)}
    return base, pendencias


def main():
    pdf = sys.argv[1]
    out = {"extraido_em": date.today().isoformat(), "colunas": COLUNAS,
           "documento": "Mensagem nº 189/2026 (PLOA 2027), Evolução da Receita (p. 97) e Evolução da Despesa (p. 130)"}
    falhou = False
    for nome, pag, defs, fecha in (("receita", 97, RECEITA, fecha_receita), ("despesa", 130, DESPESA, fecha_despesa)):
        base, pend = extrai(pdf, pag, defs, fecha)
        out[nome] = [{"chave": k, "rotulo": r, "nivel": n, "valores": base[k]} for k, r, n, _ in defs]
        if pend:
            falhou = True
            print(f"{nome}: equações que não fecham:", json.dumps(pend, ensure_ascii=False, indent=1))
        else:
            print(f"{nome}: todas as equações fecham nas 6 colunas")
    # controles externos: orçamento 2026 = dotação inicial de 2026; estimativa/proposta 2027 = total da PLOA
    tot_r = next(x for x in out["receita"] if x["chave"] == "total")["valores"]
    tot_d = next(x for x in out["despesa"] if x["chave"] == "total")["valores"]
    assert tot_r[3] == tot_d[3] == 32030806668, ("orçamento 2026 deve ser a dotação inicial", tot_r[3], tot_d[3])
    assert tot_r[5] == tot_d[5] == 35426564064, ("2027 deve ser o total geral da PLOA", tot_r[5], tot_d[5])
    if falhou:
        sys.exit("há células que não fecham; nada foi gravado")
    SAIDA.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("gravado", SAIDA)


if __name__ == "__main__":
    main()
