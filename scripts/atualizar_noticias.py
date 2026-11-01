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
            self.cur = {"titulo": "", "href": "", "data": "", "resumo": ""}
        elif self.cur is not None:
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
            texto = norm(f"{titulo} {resumo}")
            if d < DESDE or it["href"] in vistos:
                continue
            if any(x in texto for x in EXCLUIR):
                continue
            if any(p in texto for p in PALAVRAS):
                vistos.add(it["href"])
                achadas.append({"data": d, "titulo": titulo, "resumo": resumo, "href": BASE + it["href"]})
        print(f"página {pg}: {len(lista.itens)} notícias até {ultima}; {len(achadas)} relevantes")
        if ultima and ultima < DESDE:
            break
        time.sleep(0.5)

    achadas.sort(key=lambda n: n["data"], reverse=True)
    achadas = achadas[:MAXIMO]
    SAIDA.write_text(json.dumps({
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fonte": f"{BASE}/noticias", "noticias": achadas,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"OK: {len(achadas)} notícias -> {SAIDA}")
    for n in achadas:
        print(" ", n["data"], n["titulo"][:95])


if __name__ == "__main__":
    main()
