#!/usr/bin/env python3
"""
Grava data/ploa2027.json e data/ploa2027-auditoria.json a partir da saída de montar_ploa.py.

Falha (e não grava nada) se a soma das linhas não for igual ao total geral impresso no documento (R$ 35.426.564.064).
Uso: python3 scripts/ploa/exporta_ploa.py montagem.json
"""
import sys
import ast, json, hashlib
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
T=str(Path(__file__).resolve().parents[2] / "data")
mm=json.load(open(sys.argv[1]))
m, rel = mm["m"], mm["rel"]
o=json.load(open(f"{T}/orcamento.json"))
L=[l for l in m["linhas"] if "valor" in l]
assert len(L)==len(m["linhas"])
total=sum(l["valor"] for l in L)
assert total==35426564064, total
# funcao e subfuncao: so da base de 2026 (a leitura por OCR dessas duas colunas coincide em ~82%, nao serve)
fs=defaultdict(Counter)
for r in o["anos"]["2026"]["linhas"]:
    fs[(r[0],r[1],r[2])][(r[5],r[6])]+=1
def func(l):
    c=fs.get((l["uo"],l["prog"],l["acao"]))
    return c.most_common(1)[0][0] if c else ("","")
linhas=[]
for l in sorted(L,key=lambda x:(x["uo"],x["prog"],x["acao"],x["gnd"],x["fonte"],x["pag"],x["y"])):
    f,s=func(l)
    linhas.append([l["uo"],l["prog"],l["acao"],l["gnd"],l["fonte"],f,s,l["valor"],l["pag"]])
# nomes: so os codigos que a base de 2026 nao tem
nomes={"uo":{}, "programa":{}, "acao":{}}
for k,v in m["nomes"]["uo"].items():
    if k not in o["nomes"]["uo"]: nomes["uo"][k]=v
for k,v in m["nomes"]["prog"].items():
    uo,prog=ast.literal_eval(k)
    if prog not in o["nomes"]["programa"] and prog: nomes["programa"][prog]=v
for k,v in m["nomes"]["acao"].items():
    uo,prog,ac=ast.literal_eval(k)
    if ac and ac not in o["nomes"]["acao"]: nomes["acao"][ac]=v
doc={
 "extraido_em": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
 "documento":{
   "titulo":"Mensagem nº 189/2026 (PLOA 2027), Programa de Trabalho do Orçamento Fiscal e da Seguridade Social (art. 7º, XI)",
   "paginas":"200 a 275 (de 472) do arquivo; total geral na p. 186",
   "url":"https://planejamento.es.gov.br/media/Or%C3%A7amento/Or%C3%A7amentos/Or%C3%A7amento_Anual_2027/PLOA/ploa-2027-mensagem-texto-complemento-e-anexo.pdf",
   "sha256":"c90e69353555bd645b6f5ee19fb0ff0bbc6995edaedffcb81297dbb47d02b830"},
 "metodo":"O PDF é digitalizado (imagem). As tabelas foram lidas por OCR (Tesouro/Tesseract) e conferidas por soma contra os totais impressos no próprio documento: linhas de cada ação, ações de cada programa, programas de cada unidade orçamentária, unidades de cada órgão, e unidade por GND e fonte contra o Resumo geral do órgão. Nenhum valor foi aceito sem fechar essas somas. Função e subfunção vêm da base de 2026 para as chaves existentes nos dois anos e ficam em branco nas demais.",
 "conferencia":{
   "total_linhas":total,"total_impresso":35426564064,
   "acoes_total":len(m["H"]["acao"]),"acoes_fechadas":rel["acao_ok"],
   "programas":len(m["H"]["prog"]),"unidades":len({l["uo"] for l in L}),"orgaos":len({l["org"] for l in L}),
   "divergencias_programa":len(rel["prog_div"]),"divergencias_unidade":len(rel["uo_div"]),"divergencias_orgao":len(rel["org_div"]),
   "unidades_gnd_fonte_ok":rel["atribuicao"]["uo_ok"]+rel["atribuicao"]["uo_resolvida"],"unidades_gnd_fonte_falha":len(rel["atribuicao"]["uo_falha"]),
   "controles_independentes":"6 de 6 comparáveis coincidem com o quadro da PLOA em painel-es/fontes/ploa (reservas, saúde FES, Transcol, Fundap)"},
 "colunas":["uo","programa","acao","gnd","fonte","funcao","subfuncao","valor","pagina"],
 "linhas":linhas,
 "nomes":nomes,
}
json.dump(doc,open(f"{T}/ploa2027.json","w"),ensure_ascii=False,separators=(",",":"))
aud={
 "gerado_em":doc["extraido_em"],
 "resumo":doc["conferencia"],
 "correcoes_automaticas":{
   "acoes_com_troca_de_um_digito":rel["acao_ok_nivel1"],
   "valores_do_resumo_corrigidos_pela_soma":rel["atribuicao"]["resumo_corrigido"],
   "avisos":[list(a) for a in m["avisos"]],
   "linhas_gnd_ou_fonte_resolvidas_pelo_resumo":sorted({(l["pag"],l["y"],l["uo"],l["acao"],l["gnd"],l["fonte"],l["valor"]) for l in L if l.get("origem")!="lido"}),
 }}
json.dump(aud,open(f"{T}/ploa2027-auditoria.json","w"),ensure_ascii=False,indent=1)
import os
print("ploa2027.json", os.path.getsize(f"{T}/ploa2027.json")//1024,"KB", len(linhas),"linhas; nomes novos:",{k:len(v) for k,v in nomes.items()})
print("auditoria:", len(aud["correcoes_automaticas"]["avisos"]),"avisos;", len(aud["correcoes_automaticas"]["linhas_gnd_ou_fonte_resolvidas_pelo_resumo"]),"linhas com GND/fonte resolvidos pelo resumo")
