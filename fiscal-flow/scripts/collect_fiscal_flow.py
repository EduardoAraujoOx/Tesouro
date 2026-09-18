#!/usr/bin/env python3
"""Coleta indicadores públicos de execução e fluxo de pagamentos do ES.

Sem dependências externas. Usa o Portal de Dados Abertos como fonte de verdade
e grava apenas agregados pequenos no repositório.
"""

from __future__ import annotations

import csv
import io
import json
import os
import statistics
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

EXECUTION_CSV_URL = (
    "https://dados.es.gov.br/dataset/99e16b13-0e6f-4504-8544-00de842ab1fd/"
    "resource/240f70ca-c810-442b-bade-bb0ea3280880/download/"
    "orcamentosexecucoes-2026.csv"
)
ORDER_RESOURCE_ID = "8bff110c-0f80-4eff-bc79-503a752bf923"
CKAN_DATASTORE_URL = "https://dados.es.gov.br/api/3/action/datastore_search"

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DATE = os.getenv("SNAPSHOT_DATE", date.today().isoformat())
OUT_DIR = ROOT / "fiscal-flow" / "data" / "snapshots" / SNAPSHOT_DATE


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SEFAZ-ES-fiscal-flow-monitor/1.0"},
    )
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read()


def fetch_json(url: str) -> dict[str, Any]:
    return json.loads(fetch_bytes(url).decode("utf-8"))


def br_number(value: str | None) -> float:
    if not value:
        return 0.0
    return float(value.replace(".", "").replace(",", "."))


def parse_portal_date(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%d/%m/%Y %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value[:19], fmt)
        except ValueError:
            pass
    return None


def percentile(values: list[int], p: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    idx = max(0, min(len(ordered) - 1, int((p * len(ordered) + 0.999999)) - 1))
    return ordered[idx]


def collect_execution() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    raw = fetch_bytes(EXECUTION_CSV_URL).decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(raw), delimiter=";"))

    parsed: list[dict[str, Any]] = []
    for row in rows:
        liquidado = br_number(row.get("ValorLiquidado"))
        pago = br_number(row.get("ValorPago"))
        gap = liquidado - pago
        ug = str(row.get("CodigoUnidadeGestora") or "").strip()
        parsed.append(
            {
                "ug": ug,
                "unidade_gestora": (row.get("UnidadeGestora") or "").strip(),
                "liquidado": liquidado,
                "pago": pago,
                "gap": gap,
                "gap_pct_liquidado": (gap / liquidado) if liquidado else None,
            }
        )

    def summarize(name: str, subset: list[dict[str, Any]], note: str) -> dict[str, Any]:
        liquidado = sum(r["liquidado"] for r in subset)
        pago = sum(r["pago"] for r in subset)
        gap = liquidado - pago
        return {
            "escopo": name,
            "n_ugs": len(subset),
            "liquidado": round(liquidado, 2),
            "pago": round(pago, 2),
            "gap_liquidado_pago": round(gap, 2),
            "gap_pct_liquidado": round(gap / liquidado, 8) if liquidado else None,
            "observacao": note,
        }

    all_rows = parsed
    # Heurística operacional para o radar. Os códigos abaixo de 100000 na base
    # correspondem aos Poderes/órgãos autônomos listados no arquivo corrente.
    executive_approx = [r for r in parsed if r["ug"].isdigit() and int(r["ug"]) >= 100000]

    summary = [
        summarize("todos_os_poderes", all_rows, "Soma de todas as UGs do recurso público."),
        summarize(
            "poder_executivo_aproximado",
            executive_approx,
            "Heurística: UGs com código >= 100000. Não substitui classificação oficial por Poder.",
        ),
    ]

    top = sorted(parsed, key=lambda r: r["gap"], reverse=True)
    return summary, top


def fetch_order_records() -> list[dict[str, Any]]:
    fields = ",".join(
        [
            "CodigoUg",
            "UnidadeGestora",
            "DataEmissaoNL",
            "DataEmissaoOB",
            "CodigoNL",
            "CodigoOB",
            "ValorOB",
        ]
    )
    limit = 10000
    offset = 0
    records: list[dict[str, Any]] = []
    total: int | None = None

    while total is None or offset < total:
        params = urllib.parse.urlencode(
            {
                "resource_id": ORDER_RESOURCE_ID,
                "limit": limit,
                "offset": offset,
                "fields": fields,
            }
        )
        payload = fetch_json(f"{CKAN_DATASTORE_URL}?{params}")
        if not payload.get("success"):
            raise RuntimeError(f"CKAN retornou success=false no offset {offset}")

        result = payload["result"]
        total = int(result["total"])
        chunk = result["records"]
        records.extend(chunk)

        if not chunk:
            break
        offset += len(chunk)

    return records


def collect_payment_lag() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    raw_records = fetch_order_records()

    # A base traz o mesmo pagamento em mais de uma linha de detalhamento.
    unique: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for row in raw_records:
        key = (
            str(row.get("CodigoUg") or ""),
            str(row.get("CodigoNL") or ""),
            str(row.get("CodigoOB") or ""),
            str(row.get("ValorOB") or ""),
        )
        unique.setdefault(key, row)

    monthly: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"lags": [], "valor_ob": 0.0, "gt15": 0, "gt30": 0}
    )
    missing_ob = 0

    for row in unique.values():
        nl = parse_portal_date(row.get("DataEmissaoNL"))
        ob = parse_portal_date(row.get("DataEmissaoOB"))
        if ob is None:
            missing_ob += 1
            continue
        if nl is None:
            continue

        lag = (ob.date() - nl.date()).days
        if lag < 0:
            continue

        month = ob.strftime("%Y-%m")
        bucket = monthly[month]
        bucket["lags"].append(lag)
        bucket["valor_ob"] += br_number(row.get("ValorOB"))
        bucket["gt15"] += int(lag > 15)
        bucket["gt30"] += int(lag > 30)

    output: list[dict[str, Any]] = []
    for month in sorted(monthly):
        bucket = monthly[month]
        lags = bucket["lags"]
        n = len(lags)
        output.append(
            {
                "mes_pagamento": month,
                "n_pagamentos_deduplicados": n,
                "valor_ob": round(bucket["valor_ob"], 2),
                "prazo_mediano_dias": percentile(lags, 0.50),
                "prazo_p75_dias": percentile(lags, 0.75),
                "prazo_p90_dias": percentile(lags, 0.90),
                "prazo_p95_dias": percentile(lags, 0.95),
                "prazo_medio_dias": round(statistics.fmean(lags), 4) if lags else None,
                "pct_acima_15_dias": round(bucket["gt15"] / n, 8) if n else None,
                "pct_acima_30_dias": round(bucket["gt30"] / n, 8) if n else None,
            }
        )

    metadata = {
        "raw_order_rows": len(raw_records),
        "deduplicated_order_rows": len(unique),
        "duplicate_rate": round(1 - len(unique) / len(raw_records), 8)
        if raw_records
        else None,
        "missing_data_emissao_ob_after_dedup": missing_ob,
        "dedupe_key": ["CodigoUg", "CodigoNL", "CodigoOB", "ValorOB"],
    }
    return output, metadata


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    execution_summary, execution_rows = collect_execution()
    payment_lag, payment_meta = collect_payment_lag()

    top_rows = [
        {
            "ug": r["ug"],
            "unidade_gestora": r["unidade_gestora"],
            "liquidado": round(r["liquidado"], 2),
            "pago": round(r["pago"], 2),
            "gap_liquidado_pago": round(r["gap"], 2),
            "gap_pct_liquidado": round(r["gap_pct_liquidado"], 8)
            if r["gap_pct_liquidado"] is not None
            else None,
        }
        for r in execution_rows[:20]
    ]

    write_csv(OUT_DIR / "execution_summary.csv", execution_summary)
    write_csv(OUT_DIR / "execution_top_gaps.csv", top_rows)
    write_csv(OUT_DIR / "payment_lag_monthly.csv", payment_lag)

    metadata = {
        "snapshot_date": SNAPSHOT_DATE,
        "generated_at": datetime.now().astimezone().isoformat(),
        "sources": {
            "execution_csv": EXECUTION_CSV_URL,
            "order_resource_id": ORDER_RESOURCE_ID,
            "ckan_datastore": CKAN_DATASTORE_URL,
        },
        "payment_lag_quality": payment_meta,
        "notes": [
            "As bases brutas permanecem no Portal de Dados Abertos e não são versionadas.",
            "O escopo poder_executivo_aproximado é heurístico e deve ser validado antes de uso oficial.",
            "A base de ordem cronológica descreve pagamentos com OB; não mede diretamente a idade das liquidações ainda não pagas.",
        ],
    }
    (OUT_DIR / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Snapshot gravado em {OUT_DIR}")


if __name__ == "__main__":
    main()
