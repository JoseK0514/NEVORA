"""Build the portable workbook, executive brief, and ZIP from this document pack."""

from pathlib import Path
import argparse
import csv
import zipfile

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from openpyxl.formula.translate import Translator
from openpyxl.workbook.properties import CalcProperties
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
TEAL, SKY, INK, MUTED = "164B48", "E8F5FB", "161C1B", "5F625E"
INPUT, CALC, PENDING = "EAF4FF", "EEF0F1", "FFF2CC"
WORKBOOK = ROOT / "NEVORA-Launch-Workbook.xlsx"
BRIEF = ROOT / "NEVORA-Executive-Brief.pdf"
ARCHIVE = ROOT / "NEVORA-Launch-Operations.zip"


def read_csv(relative):
    with (ROOT / relative).open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.reader(handle))
    if not rows or any(len(row) != len(rows[0]) for row in rows):
        raise ValueError(f"Malformed CSV: {relative}")
    return rows


def setup_sheet(wb, name, title, note, columns):
    ws = wb.create_sheet(name)
    width = max(3, columns)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=width)
    ws.cell(1, 1, title).font = Font(name="Calibri", size=19, bold=True, color="FFFFFF")
    ws.cell(1, 1).fill = PatternFill("solid", fgColor=TEAL)
    ws.row_dimensions[1].height = 34
    ws.merge_cells(start_row=2, start_column=1, end_row=3, end_column=width)
    ws.cell(2, 1, note).font = Font(name="Calibri", size=11, color=MUTED)
    ws.cell(2, 1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[2].height = 28
    ws.row_dimensions[3].height = 22
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = "B6"
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = "1:5"
    ws.oddFooter.center.text = "NEVORA / VELANI LLC | Working draft | Page &P"
    return ws


def table_style(ws, headers, last_row):
    for column, label in enumerate(headers, 1):
        cell = ws.cell(5, column, label)
        cell.fill = PatternFill("solid", fgColor=TEAL)
        cell.font = Font(name="Calibri", bold=True, color="FFFFFF")
        cell.alignment = Alignment(wrap_text=True, vertical="center")
        ws.column_dimensions[get_column_letter(column)].width = min(35, max(18, len(label) + 3))
    ws.row_dimensions[5].height = 32
    for row in ws.iter_rows(min_row=6, max_row=last_row, max_col=len(headers)):
        for cell in row:
            cell.font = Font(name="Calibri", size=10, color=INK)
            cell.fill = PatternFill("solid", fgColor=CALC if cell.data_type == "f" else INPUT)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = Border(bottom=Side(style="hair", color="DDE4E2"))
    if last_row >= 6:
        ws.auto_filter.ref = f"A5:{get_column_letter(len(headers))}{last_row}"
    ws.print_options.horizontalCentered = True


def status_validation(ws, column, last_row, values):
    letter = get_column_letter(column)
    dv = DataValidation(type="list", formula1='"' + ",".join(values) + '"')
    dv.errorTitle = "Choose a listed status"
    dv.error = "Use the documented status list."
    dv.showErrorMessage = True
    dv.errorStyle = "stop"
    ws.add_data_validation(dv)
    dv.add(f"{letter}6:{letter}{max(last_row, 100)}")
    for value, fill in [("PASS", "DDF0E3"), ("VERIFIED", "DDF0E3"),
                        ("FAIL", "F9D8D8"), ("BLOCKED", "F9D8D8"),
                        ("NOT_RUN", PENDING), ("NOT_STARTED", PENDING)]:
        ws.conditional_formatting.add(
            f"{letter}6:{letter}{max(last_row, 100)}",
            CellIsRule(operator="equal", formula=[f'"{value}"'],
                       fill=PatternFill("solid", fgColor=fill)))


def import_sheet(wb, name, relative, note, blank_rows=0):
    rows = read_csv(relative)
    ws = setup_sheet(wb, name, name, note, len(rows[0]))
    for source_row, row in enumerate(rows[1:], 2):
        dest_row = source_row + 4
        for column, value in enumerate(row, 1):
            cell = ws.cell(dest_row, column)
            if value.startswith("="):
                cell.value = Translator(value, origin=f"{get_column_letter(column)}{source_row}").translate_formula(cell.coordinate)
            elif rows[0][column - 1] in {"quantity_assumption", "unit_price", "monthly_factor"} and value:
                cell.value = float(value)
            else:
                cell.value = value or None
    end = max(6, len(rows) + 4 + blank_rows)
    table_style(ws, rows[0], end)
    if "status" in rows[0]:
        values = (["NOT_RUN", "PASS", "FAIL", "BLOCKED", "NOT_APPLICABLE"] if name == "Acceptance"
                  else ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "READY_FOR_REVIEW", "VERIFIED", "NOT_APPLICABLE"])
        status_validation(ws, rows[0].index("status") + 1, end, values)
    if "verification_status" in rows[0]:
        status_validation(ws, rows[0].index("verification_status") + 1, end,
                          ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "READY_FOR_REVIEW", "VERIFIED", "NOT_APPLICABLE"])
    return ws, rows, end


def build_workbook():
    wb = Workbook()
    wb.remove(wb.active)
    wb.calculation = CalcProperties(calcId=191029, fullCalcOnLoad=True, forceFullCalc=True, calcMode="auto")
    intro = setup_sheet(wb, "Start Here", "NEVORA | Customer launch workbook",
                        "INTERNAL WORKING MASTER. Save a controlled private customer copy before entering personal data. This workbook tracks work; it does not execute provisioning, import staff, issue invoices or approve launch.", 4)
    intro.column_dimensions["A"].width = 24
    intro.column_dimensions["B"].width = 43
    intro.column_dimensions["C"].width = 30
    intro.column_dimensions["D"].width = 38
    rows = [
        ["Workspace", "Purpose", "Starting status", "Use"],
        ["Company Intake", "Customer structure, contacts and scope", "NOT_STARTED", "Confirm employees versus separate client businesses."],
        ["Decisions", "Twelve decisions and their owners", "Draft register", "Record evidence and named people; do not infer approval."],
        ["Responsibilities", "Who is responsible and accountable", "Proposed roles", "R=Responsible; A=Accountable; C=Consulted; I=Informed."],
        ["Employee Roster", "Blank staff collection worksheet", "No records", "Email optional to save; required for invitation activation."],
        ["Service Inventory", "Accounts, services and evidence references", "NOT_STARTED", "Use credential record references, never actual credentials."],
        ["Costs", "Provider cost assumptions and quotation evidence", "Unpriced", "Prices and currency stay blank until confirmed. No mixed-currency total."],
        ["Pricing Inputs", "Draft commercial arithmetic", "No approved offer", "Fill currency, rounding and explicit zero inputs where appropriate."],
        ["Invoice Lines", "Blank line-item template and calculation", "DRAFT only", "Review tax treatment and terms before any invoice is issued."],
        ["Acceptance", "28 unexecuted acceptance scenarios", "NOT_RUN", "Record observed result and evidence only after an authorized run."],
    ]
    for r, row in enumerate(rows, 5):
        for c, value in enumerate(row, 1):
            intro.cell(r, c, value)
        intro.row_dimensions[r].height = 48
    table_style(intro, rows[0], 14)
    for r in range(6, 15):
        intro.cell(r, 1).hyperlink = f"#'{intro.cell(r, 1).value}'!A1"
        intro.cell(r, 1).font = Font(color=TEAL, underline="single", bold=True)
    intro.cell(17, 1, "Blue cells: inputs / grey cells: formulas / yellow: pending.")
    intro.merge_cells("A17:D17")
    intro.cell(19, 1, "SOURCE: 8e9073974b52053e557382ec5199dbce9d5aa32c. Reconcile Claude's final candidate before customer use.")
    intro.merge_cells("A19:D20")
    intro.cell(19, 1).alignment = Alignment(wrap_text=True)
    intro.cell(22, 1, "Read README.md, WORKBOOK-GUIDE.md and SOURCE-REGISTER.md in the accompanying pack.")
    intro.merge_cells("A22:D23")
    intro.cell(22, 1).alignment = Alignment(wrap_text=True)

    intake = setup_sheet(wb, "Company Intake", "Company intake / private customer copy",
                         "The full questionnaire is onboarding/COMPANY-INTAKE.md. No customer identity or count is assumed. No passwords, invitation links, PINs, bank/tax identifiers or connection strings.", 4)
    fields = [
        ("Customer business name", "Customer Owner", "Required"),
        ("Customer legal entity / authority reference", "Customer Owner", "Required"),
        ("One company or separate client businesses?", "Customer Owner + Jose", "Required"),
        ("Employee count / first-login cohort count", "Customer Owner", "Required"),
        ("Separate business client count", "Customer Owner", "Required"),
        ("Customer Owner business contact", "Customer Owner", "Required"),
        ("Day-to-day Customer Manager", "Customer Owner", "Required"),
        ("NEVORA Onboarding Lead", "Jose", "Required"),
        ("NEVORA Operations Lead", "Jose", "Required"),
        ("Engineering handoff owner", "Jose", "Required"),
        ("Locations and agreed matching keys", "Customer Owner", "Required"),
        ("IANA timezone", "Customer Owner", "Required"),
        ("Staffing / coverage / positions decision reference", "Customer Owner", "Required"),
        ("Manager management-scope approval reference", "Customer Owner", "Required if Managers"),
        ("Enabled modules and exclusions", "Customer Owner + Engineering", "Required"),
        ("Success criteria / acceptance reference", "Customer Owner", "Required"),
        ("Supported devices / accessibility needs", "Customer Owner", "Required"),
        ("Registered-email gaps and resolution owner", "Customer Owner", "Required for activation"),
        ("Verified sender / approved delivery evidence", "Operations Lead", "Required for activation"),
        ("Authorized environment / domain reference", "Operations Lead", "Required"),
        ("Private target database identity reference", "Operations Lead", "Required; no connection string"),
        ("Data authority and transfer approval reference", "Customer Owner", "Required"),
        ("Quote / agreement reference", "Commercial Reviewer", "Required before commercial commitment"),
        ("Pilot participants and consent reference", "Customer Owner", "Required before pilot"),
        ("Proposed launch window / dependencies", "Onboarding Lead", "Uncommitted until gates pass"),
        ("Customer acceptance and handoff record", "Customer Owner", "Required before completion"),
    ]
    for r, (field, owner, requirement) in enumerate(fields, 6):
        for c, value in enumerate([field, None, owner, requirement], 1):
            intake.cell(r, c, value)
        intake.row_dimensions[r].height = 36
    table_style(intake, ["Field", "Customer response / private evidence ref", "Owner", "Applicability"], len(fields) + 5)
    intake.column_dimensions["A"].width = 48
    intake.column_dimensions["B"].width = 55

    import_sheet(wb, "Decisions", "DECISIONS.csv", "Proposed paths are not approvals. Decision references remain blank until actually decided.")
    import_sheet(wb, "Responsibilities", "RESPONSIBILITY-MATRIX.csv", "Proposed operating roles, not application access roles. Assign names during intake; preserve existing independent release ownership.")
    roster, roster_rows, end = import_sheet(wb, "Employee Roster", "onboarding/EMPLOYEE-ROSTER.csv",
        "COLLECTION ONLY, not an application importer. Use a private customer copy. Registered email is needed for invitations; do not issue or resend invites from this workbook.", blank_rows=25)
    for row in roster.iter_rows(min_row=6, max_row=end):
        for cell in row:
            cell.number_format = "@"
    role = DataValidation(type="list", formula1='"OWNER,MANAGER,LEAD,EMPLOYEE"')
    role.errorStyle, role.showErrorMessage = "stop", True
    roster.add_data_validation(role)
    role.add(f"F6:F{end}")
    import_sheet(wb, "Service Inventory", "infrastructure/SERVICE-INVENTORY.csv",
                 "Service rows are planned inventory. Historical providers or saved access requirements do not establish live readiness. Never enter credential values.")
    costs, cost_rows, cost_end = import_sheet(wb, "Costs", "infrastructure/COST-WORKSHEET.csv",
        "All quotes/prices and currency are unresolved. Quantity=1 is a planning assumption, not a customer count. Positive monthly factor and matching currencies are required for the total.")
    for r in range(6, cost_end + 1):
        for c in [7, 8, 10, 11]:
            costs.cell(r, c).number_format = "0.0000"
    costs.column_dimensions["O"].width = 58

    pricing = setup_sheet(wb, "Pricing Inputs", "Draft pricing inputs / not an approved offer",
                          "Manual invoicing is PROPOSED. No prices, currency, tax, cadence or agreement terms are approved. Arithmetic assumes the reviewed single-rate net basis only.", 4)
    pricing_items = [
        (6, "Currency", None, "Use one agreed ISO currency; no exchange-rate assumption."),
        (7, "Rounding decimal places", None, "Commercial/tax reviewer selects the precision; no default."),
        (8, "Pricing model / billable unit", None, "Company / active person / location / hybrid; define the unit."),
        (9, "Charge cadence", None, "Monthly / Quarterly / Annual / One-time."),
        (10, "Unit description", None, "Use the agreed commercial meaning, not an application entitlement."),
        (11, "Quantity", None, "No count is presumed."),
        (12, "Unit price", None, "Quoted input; no current provider price is implied."),
        (13, "Discount amount", None, "Explicit 0 only if no discount is agreed."),
        (14, "Tax rate (decimal)", None, "Explicit 0 only for reviewed no-tax treatment."),
        (15, "Tax treatment reference", None, "Required before single-rate tax calculation."),
        (16, "Quote / review reference", None, "Record status/version and approvals when obtained."),
        (18, "Draft net charge", '=IF(AND(COUNT(B11:B13)=3,B6<>"",ISNUMBER(B7),B11>=0,B12>=0,B13>=0,B11*B12>=B13),ROUND(B11*B12-B13,B7),"")', "Before collected tax."),
        (19, "Draft tax", '=IF(AND(ISNUMBER(B18),ISNUMBER(B14),B14>=0,B15<>""),ROUND(B18*B14,B7),"")', "Only the reviewed single-rate net basis."),
        (20, "Draft total", '=IF(COUNT(B18:B19)=2,SUM(B18:B19),"")', "Not an issued invoice."),
        (21, "Monthly equivalent net revenue", '=IF(ISNUMBER(B18),IF(B9="Monthly",B18,IF(B9="Quarterly",B18/3,IF(B9="Annual",B18/12,""))),"")', "One-time charges have no recurring comparison."),
        (22, "Complete monthly cost scenario", f'=IF(AND(ISNUMBER(Costs!K{cost_end}),Costs!I6=B6),Costs!K{cost_end},"")', "Only when included cost rows are complete and currency matches."),
        (23, "Scenario contribution", '=IF(COUNT(B21:B22)=2,B21-B22,"")', "Review allocations, staff effort, tax and overages; not accounting profit."),
        (24, "Scenario contribution ratio", '=IF(AND(COUNT(B21:B22)=2,B21>0),(B21-B22)/B21,"")', "No target margin is assumed."),
    ]
    for r, label, value, note in pricing_items:
        pricing.cell(r, 1, label)
        pricing.cell(r, 2, value)
        pricing.cell(r, 3, "INPUT" if not isinstance(value, str) or not value.startswith("=") else "CALCULATED")
        pricing.cell(r, 4, note)
        pricing.row_dimensions[r].height = 40
    table_style(pricing, ["Field", "Value / calculation", "Type", "Instruction"], 24)
    for column in ["A", "D"]:
        pricing.column_dimensions[column].width = 53
    precision = DataValidation(type="whole", operator="between", formula1="0", formula2="4")
    precision.showErrorMessage = True
    pricing.add_data_validation(precision)
    precision.add("B7")
    cadence = DataValidation(type="list", formula1='"Monthly,Quarterly,Annual,One-time"')
    pricing.add_data_validation(cadence)
    cadence.add("B9")
    for r in [11, 12, 13, 18, 19, 20, 21, 22, 23]:
        pricing.cell(r, 2).number_format = "0.0000"
    pricing.cell(24, 2).number_format = "0.0%"

    invoice, invoice_rows, invoice_end = import_sheet(wb, "Invoice Lines", "commercial/INVOICE-TEMPLATE.csv",
        "DRAFT calculation template. Enter reviewed metadata, currency and explicit discount/tax inputs. Use Pricing Inputs currency/precision. Do not store bank details. See commercial/PRICING-PROPOSAL.md.", blank_rows=20)
    for r in range(6, invoice_end + 1):
        invoice.cell(r, 21, f'=IF(AND(N{r}<>"",P{r}<>"",K{r}=\'Pricing Inputs\'!$B$6,K{r}<>"",ISNUMBER(\'Pricing Inputs\'!$B$7),COUNT(O{r},Q{r},R{r})=3,O{r}>=0,Q{r}>=0,R{r}>=0,O{r}*Q{r}>=R{r}),ROUND(O{r}*Q{r}-R{r},\'Pricing Inputs\'!$B$7),"")')
        invoice.cell(r, 22, f'=IF(AND(ISNUMBER(U{r}),ISNUMBER(T{r}),T{r}>=0,S{r}<>""),ROUND(U{r}*T{r},\'Pricing Inputs\'!$B$7),"")')
        invoice.cell(r, 23, f'=IF(COUNT(U{r}:V{r})=2,SUM(U{r}:V{r}),"")')
        for c in [15, 17, 18, 20, 21, 22, 23]:
            invoice.cell(r, c).number_format = "0.0000"
        for c in [21, 22, 23]:
            invoice.cell(r, c).fill = PatternFill("solid", fgColor=CALC)
        invoice.cell(r, 24, "DRAFT")
    total_row = invoice_end + 3
    invoice.cell(total_row, 14, "Draft invoice totals")
    for col in ["U", "V", "W"]:
        invoice[f"{col}{total_row}"] = f'=IF(COUNTA(N6:N{invoice_end})=0,"",IF(COUNT({col}6:{col}{invoice_end})=COUNTA(N6:N{invoice_end}),SUM({col}6:{col}{invoice_end}),"INCOMPLETE"))'
        invoice[f"{col}{total_row}"].fill = PatternFill("solid", fgColor=CALC)
    invoice.cell(total_row + 2, 14, "Totals are calculations only. Issue only after commercial review; never mix invoices or currencies on one calculation.")
    status_validation(invoice, 24, invoice_end, ["DRAFT", "READY_FOR_REVIEW", "ISSUED", "PAID", "DISPUTED", "VOID"])
    cases, _, case_end = import_sheet(wb, "Acceptance", "acceptance/ACCEPTANCE-CASES.csv",
        "All cases begin NOT_RUN. Required activation cannot become N/A merely by disabling delivery. Conditional cases require documented customer scope and approval.")
    for col in ["C", "E", "F", "G", "H", "K", "L"]:
        cases.column_dimensions[col].width = 48
    for r in range(6, case_end + 1):
        cases.row_dimensions[r].height = 85
    wb.save(WORKBOOK)
    check = load_workbook(WORKBOOK, data_only=False)
    assert len(check.sheetnames) == 10
    assert check["Acceptance"].max_row >= 33
    assert all(check["Acceptance"].cell(r, 10).value == "NOT_RUN" for r in range(6, 34))
    assert check["Pricing Inputs"]["B6"].value is None
    assert check["Pricing Inputs"]["B7"].value is None
    assert not any(check["Employee Roster"].cell(r, 1).value for r in range(6, check["Employee Roster"].max_row + 1))
    print(f"Workbook created: {len(check.sheetnames)} sheets; blank inputs; acceptance NOT_RUN.")


def build_brief():
    fonts = ROOT / "_tools/fonts"
    pdfmetrics.registerFont(TTFont("Inter", str(fonts / "Inter-Regular.ttf")))
    pdfmetrics.registerFont(TTFont("Inter-Bold", str(fonts / "Inter-Bold.ttf")))
    pdfmetrics.registerFontFamily("Inter", normal="Inter", bold="Inter-Bold", italic="Inter", boldItalic="Inter-Bold")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="BrandTitle", fontName="Inter-Bold", fontSize=25, leading=29, textColor=colors.HexColor("#164B48"), spaceAfter=16))
    styles.add(ParagraphStyle(name="Deck", fontName="Inter", fontSize=12, leading=17, textColor=colors.HexColor("#5F625E"), spaceAfter=13))
    styles.add(ParagraphStyle(name="Body", fontName="Inter", fontSize=10, leading=15, textColor=colors.HexColor("#161C1B"), spaceAfter=10))
    styles.add(ParagraphStyle(name="Section", fontName="Inter-Bold", fontSize=14, leading=19, textColor=colors.HexColor("#164B48"), spaceBefore=10, spaceAfter=9))
    p = lambda text: Paragraph(text, styles["Body"])
    title = lambda text: Paragraph(text, styles["BrandTitle"])
    section = lambda text: Paragraph(text, styles["Section"])
    story = [
        Paragraph("NEVORA / VELANI LLC", styles["Deck"]),
        title("First-customer<br/>onboarding &amp; launch operations"),
        Paragraph("WORKING DRAFT v0.1 · Internal operations pack", styles["Deck"]),
        p("A complete preparation pack for customer intake, service ownership, acceptance, training, support and commercial review. Customer launch readiness has not been assessed."),
        section("What we can own now"),
    ]
    data = [[p("<b>Workstream</b>"), p("<b>Practical deliverable</b>")]]
    for a, b in [
        ("Onboarding", "Company intake, staff collection worksheet, guided activation and pilot playbook."),
        ("Infrastructure", "Account/service inventory, quoted-cost inputs, access and recovery responsibilities."),
        ("Acceptance", "28 unexecuted scenarios, candidate handoff and coordinated launch checklist."),
        ("Support & training", "Manager agenda, employee quick start and draft customer communications."),
        ("Commercial", "Pricing options, invoice worksheet and service/data responsibility drafts."),
    ]:
        data.append([p(a), p(b)])
    table = Table(data, colWidths=[116, 360], hAlign="LEFT")
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F5FB")),
                               ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 10),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                               ("TOPPADDING", (0, 0), (-1, -1), 6),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                               ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#DDE4E2"))]))
    story += [table, Spacer(1, 12), p("<b>Working boundary:</b> Claude owns application UI/backend. This pack lives outside the checkout and makes no application, shared-setting, database, deployment or customer-data changes."),
              p("<b>Use:</b> open README.md, then the editable NEVORA-Launch-Workbook.xlsx. Keep the shared master free of real employee data and credentials. Make controlled private copies for each customer."),
              PageBreak(), title("The customer journey"), Paragraph("Evidence-based stages, not promised dates.", styles["Deck"])]
    for n, head, body in [
        (1, "Confirm the customer", "Clarify one employer with staff versus separate client businesses. Record contacts, authority, locations, scope and success criteria."),
        (2, "Prepare the service", "Assign business and operating owners. Record current provider quotations, secure access references, environment identities and proposed commercial terms."),
        (3, "Receive Claude's handoff", "Freeze the exact UI/backend candidate, reconcile schema compatibility, feature flags and known issues, and obtain the required release evidence."),
        (4, "Rehearse and pilot", "Use an authorized isolated rehearsal, then a separately consented customer pilot. Prove actual login, role/location boundaries and selected workflows."),
        (5, "Decide and launch", "Satisfy existing release/security gates and record Jose's selected-target authorization, deployment owner and recovery/rollback decision."),
        (6, "Complete the first cycle", "Train managers and employees, verify the agreed customer outcomes, assign open issues and transfer support ownership."),
    ]:
        story += [section(f"{n}. {head}"), p(body)]
    story += [PageBreak(), title("Decisions and evidence"), Paragraph("Twelve decisions are tracked in DECISIONS.csv and the workbook.", styles["Deck"]),
              section("The first five decisions"),
              p("1. Customer structure and counts.<br/>2. Enabled modules and success criteria.<br/>3. Named customer and NEVORA owners.<br/>4. Authorized hosting/database target and secure access.<br/>5. Pricing, currency, tax treatment and proposed service terms."),
              section("Important findings already carried into the pack"),
              p("<b>Activation:</b> email is optional to save a staff record, but invitation activation requires a registered email. Delivery is disabled by default; provider acceptance is not employee receipt or activation."),
              p("<b>Source handoff:</b> the canonical migration order includes 0036/0037 while older deployment prose stops at 0035. Claude must reconcile the exact candidate; this pack executes no migrations."),
              p("<b>Release:</b> FR-AUTH-001 is OPEN in the reference source. This document review does not close independent requirements or authorize production."),
              p("<b>Commercial:</b> prices, currency, cadence and tax are unresolved. Manual invoicing is a proposal. Cost cells remain unpriced; no current provider prices are invented."),
              section("What is verified here"),
              p("Document/template consistency and source-grounding are checked separately from live service readiness. No provider activation, customer acceptance run, invitation delivery, restore exercise or production deployment is claimed."),
              p("The final document validation and source-integrity observations are retained in the evidence folder. Refer to SOURCE-REGISTER.md for source paths and limits. No customer identifiers or credential values are included."),
              Spacer(1, 10), p("<b>Reference source:</b> JoseK0514/NEVORA<br/>8e9073974b52053e557382ec5199dbce9d5aa32c<br/>Reconcile Claude's final candidate before customer use.")]
    def footer(canvas, doc):
        canvas.setFont("Inter", 8)
        canvas.setFillColor(colors.HexColor("#5F625E"))
        canvas.drawString(54, 30, "NEVORA | Internal working draft | Not a customer contract or release approval")
        canvas.drawRightString(A4[0] - 54, 30, str(doc.page))
    doc = SimpleDocTemplate(str(BRIEF), pagesize=A4, leftMargin=54, rightMargin=54, topMargin=47, bottomMargin=48,
                            title="NEVORA First-Customer Launch Operations", author="NEVORA / VELANI LLC")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print("Executive brief PDF created.")


def build_archive():
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for path in sorted(ROOT.rglob("*")):
            if not path.is_file() or path == ARCHIVE or "__pycache__" in path.parts or path.suffix == ".png":
                continue
            output.write(path, "nevora-launch-operations/" + path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(ARCHIVE) as check:
        assert check.testzip() is None
    print(f"Archive created: {ARCHIVE.stat().st_size:,} bytes.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive-only", action="store_true")
    args = parser.parse_args()
    if not args.archive_only:
        build_workbook()
        build_brief()
    build_archive()
