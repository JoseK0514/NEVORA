"""Check document integrity without running or modifying the application."""

import argparse
import csv
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
from pathlib import Path
import re
import subprocess

from openpyxl import load_workbook
from openpyxl.formula.tokenizer import Tokenizer
from openpyxl.formula.translate import Translator

ROOT = Path(__file__).resolve().parents[1]


def csv_rows(path):
    with path.open(newline="", encoding="utf-8-sig") as stream:
        rows = list(csv.reader(stream))
    assert rows and all(len(row) == len(rows[0]) for row in rows), f"CSV width: {path}"
    assert len(rows[0]) == len(set(rows[0])), f"Duplicate headers: {path}"
    return rows


def validate(source):
    report = {"checked_at_utc": datetime.now(timezone.utc).isoformat(), "scope": "Document/artifact integrity only; no application tests or live operations."}
    links = 0
    for path in ROOT.rglob("*.md"):
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", path.read_text()):
            if target.startswith(("http:", "https:", "mailto:", "#")):
                continue
            target_path = target.split("#")[0]
            resolved = (path.parent / target_path).resolve()
            assert resolved.is_relative_to(ROOT), f"Nonportable link: {path} -> {target}"
            assert resolved.exists(), f"Broken link: {path} -> {target}"
            links += 1
    report["portable_local_links_checked"] = links
    csv_checks = {}
    for path in ROOT.rglob("*.csv"):
        rows = csv_rows(path)
        csv_checks[str(path.relative_to(ROOT))] = {"columns": len(rows[0]), "records": len(rows) - 1}
    report["csv_structure"] = csv_checks
    for name in ["onboarding/EMPLOYEE-ROSTER.csv", "commercial/INVOICE-TEMPLATE.csv"]:
        assert len(csv_rows(ROOT / name)) == 1, f"Shared template contains records: {name}"
    cases = csv_rows(ROOT / "acceptance/ACCEPTANCE-CASES.csv")
    ci = {name: n for n, name in enumerate(cases[0])}
    assert len(cases) == 29 and len({row[ci["case_id"]] for row in cases[1:]}) == 28
    assert all(row[ci["status"]] == "NOT_RUN" and not row[ci["observed_result"]] and not row[ci["evidence_ref"]] for row in cases[1:])
    report["acceptance_cases"] = {"count": 28, "status": "NOT_RUN", "observed_results_and_evidence": "blank"}
    matrix = csv_rows(ROOT / "RESPONSIBILITY-MATRIX.csv")
    assert all(sum("A" in value for value in row[1:]) == 1 for row in matrix[1:])
    authorization = next(row for row in matrix if row[0] == "Production authorization")
    assert authorization[1] == "A/R" and authorization[2] == "C"
    report["responsibility_matrix"] = "One accountable role per activity; Jose alone executes production authorization."

    workbook = load_workbook(ROOT / "NEVORA-Launch-Workbook.xlsx", data_only=False)
    assert len(workbook.sheetnames) == 10
    assert workbook.calculation.fullCalcOnLoad and workbook.calculation.forceFullCalc
    formulas = 0
    for worksheet in workbook:
        for row in worksheet:
            for cell in row:
                if cell.data_type == "f":
                    Tokenizer(cell.value)
                    assert not re.search(r"#REF!|WEBSERVICE\(|HYPERLINK\(|https?://|file:", cell.value, re.I)
                    formulas += 1
    costs = csv_rows(ROOT / "infrastructure/COST-WORKSHEET.csv")
    for source_row, row in enumerate(costs[1:], 2):
        for col, value in enumerate(row, 1):
            if value.startswith("="):
                from openpyxl.utils import get_column_letter
                origin = f"{get_column_letter(col)}{source_row}"
                target = f"{get_column_letter(col)}{source_row+4}"
                assert workbook["Costs"][target].value == Translator(value, origin=origin).translate_formula(target)
    assert all(not row[7] for row in costs[1:-1]), "Provider unit prices must remain blank."
    assert all(not row[8] for row in costs[1:-1]), "Currency inputs must remain unresolved."
    assert all(workbook["Acceptance"].cell(row, 10).value == "NOT_RUN" for row in range(6, 34))
    assert workbook["Pricing Inputs"]["B6"].value is None and workbook["Pricing Inputs"]["B7"].value is None
    assert not any(workbook["Employee Roster"].cell(row, col).value for row in range(6, 31) for col in range(1, 10))
    assert workbook["Invoice Lines"]["U6"].data_type == "f" and "O6*Q6-R6" in workbook["Invoice Lines"]["U6"].value
    assert workbook["Invoice Lines"]["V6"].data_type == "f" and "U6*T6" in workbook["Invoice Lines"]["V6"].value
    assert workbook["Invoice Lines"]["W6"].data_type == "f" and "SUM(U6:V6)" in workbook["Invoice Lines"]["W6"].value
    wb_auth = [row for row in workbook["Responsibilities"].iter_rows(min_row=6, values_only=True) if row[0] == "Production authorization"][0]
    assert wb_auth[1] == "A/R" and wb_auth[2] == "C"
    report["workbook"] = {"sheets": 10, "formula_cells_tokenized": formulas, "cost_formulas_match_translated_csv": True,
                          "customer_records": 0, "prices_and_currency_inputs": "blank",
                          "calculation_limit": "Structural checks only; full recalculation requested on open. No spreadsheet calculation engine was run."}
    # Independent, explicitly illustrative arithmetic examples; not a substitute for a spreadsheet engine.
    net = (Decimal("2") * Decimal("100") - Decimal("10")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    tax = (net * Decimal("0.07")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    assert (net, tax, net + tax) == (Decimal("190.00"), Decimal("13.30"), Decimal("203.30"))
    monthly = Decimal("2") * Decimal("120") / Decimal("12")
    assert monthly == Decimal("20")
    report["illustrative_arithmetic"] = {"net_tax_total": "190.00 + 13.30 = 203.30", "annual_normalization": "2 x 120 / 12 = 20",
                                        "real_quote_or_invoice": False}
    pdf = ROOT / "NEVORA-Executive-Brief.pdf"
    info = subprocess.check_output(["pdfinfo", str(pdf)], text=True)
    pages = int(re.search(r"Pages:\s*(\d+)", info).group(1))
    assert pages == 3
    text = subprocess.check_output(["pdftotext", str(pdf), "-"], text=True)
    assert all(term in text for term in ["First-customer", "customer journey", "Decisions and evidence", "FR-AUTH-001", "28 unexecuted"])
    fonts = subprocess.check_output(["pdffonts", str(pdf)], text=True)
    assert "Inter" in fonts
    report["executive_brief"] = {"pages": pages, "text_extraction": "PASS", "Inter_fonts_present": True,
                                 "visual_review": "Pages 1 and 3 reviewed after embedding portable Inter instances."}
    suspicious = []
    for path in list(ROOT.rglob("*.md")) + list(ROOT.rglob("*.csv")):
        text = path.read_text()
        if re.search(r"(?:postgres(?:ql)?://[^\s]+:[^\s]+@|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|\b(?:ghp_|sk_live_)[A-Za-z0-9]{15,})", text):
            suspicious.append(str(path.relative_to(ROOT)))
    assert not suspicious, f"Secret-like values: {suspicious}"
    report["limited_secret_pattern_check"] = "No connection-string credentials, private-key blocks or selected token patterns found; not a security audit."

    baseline = json.loads((ROOT / "evidence/source-baseline.json").read_text())
    if source and source.is_dir():
        sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=source, text=True).strip()
        status = subprocess.check_output(["git", "status", "--porcelain=v1", "--untracked-files=all"], cwd=source, text=True)
        changed = []
        for name, expected in baseline["tracked_file_sha256"].items():
            path = source / name
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                changed.append(name)
        report["application_integrity"] = {"source_sha": sha, "baseline_sha": baseline["source_sha"],
                                           "tracked_files_compared": len(baseline["tracked_file_sha256"]),
                                           "changed_or_missing_files": changed, "git_status": status}
        assert sha == baseline["source_sha"] and status == baseline["initial_git_status"] and not changed, "Application changed since baseline; reconcile, never reset another workstream."
        source_policy = (source / "src/lib/legal/policies.ts").read_text()
        support_aim = re.search(r'SUPPORT_RESPONSE_TIME:\s*"([^"]+)"', source_policy).group(1)
        for name in ["support-training/SUPPORT-PROCEDURES.md", "commercial/SERVICE-RESPONSIBILITIES-DRAFT.md"]:
            assert " ".join(support_aim.split()) in " ".join((ROOT / name).read_text().split()), f"Canonical support qualification changed: {name}"
        report["canonical_support_aim"] = "Exact qualified wording preserved."
    else:
        report["application_integrity"] = {"status": "NOT_RUN", "reason": "Reference checkout not available; provide --source to verify."}
    report["result"] = "PASS"
    (ROOT / "evidence/validation-report.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("/workspace/NEVORA"))
    args = parser.parse_args()
    output = validate(args.source)
    print(json.dumps(output, indent=2))
