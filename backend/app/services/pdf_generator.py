"""
PDF Generator for Renteberekening Specificaties

Generates professional legal documents matching the webapp design exactly.
Uses ReportLab for PDF generation (no system dependencies required).
"""
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether, Image
)
from reportlab.lib.utils import ImageReader
import os


RENTETYPE_LABELS = {
    1: "Wettelijke rente samengesteld",
    2: "Handelsrente samengesteld",
    3: "Wettelijke rente enkelvoudig",
    4: "Handelsrente enkelvoudig",
    5: "Contractuele rente vast",
    6: "Wettelijke rente + opslag",
    7: "Handelsrente + opslag",
}

RENTETYPE_SHORT = {
    1: "Wettelijk",
    2: "Handels",
    3: "Wett. enkel",
    4: "Hand. enkel",
    5: "Contract.",
    6: "Wett. +",
    7: "Hand. +",
}

STRATEGIE_LABELS = {
    "A": "A - Meest bezwarend (art. 6:43 BW)",
    "B": "B - Oudste eerst",
}

# Logo path
LOGO_PATH = os.path.join(os.path.dirname(__file__), "logo.png")

# Colors matching webapp exactly
PRIMARY_COLOR = colors.HexColor("#1e3a5f")  # Donkerblauw
SECONDARY_COLOR = colors.HexColor("#4a6fa5")
SUCCESS_COLOR = colors.HexColor("#16a34a")  # Green
SUCCESS_BG = colors.HexColor("#dcfce7")  # Light green bg
SUCCESS_LIGHT = colors.HexColor("#f0fdf4")
LIGHT_BG = colors.HexColor("#f8f9fa")
MUTED_BG = colors.HexColor("#f1f5f9")
BORDER_COLOR = colors.HexColor("#e2e8f0")
TEXT_COLOR = colors.HexColor("#1e293b")
MUTED_TEXT = colors.HexColor("#64748b")
PAYMENT_BG = colors.HexColor("#d1fae5")  # Mint green for payment rows


def format_bedrag(bedrag: Any, with_font: bool = False) -> str:
    """Format amount as Dutch currency."""
    if bedrag is None:
        result = "€ 0,00"
    else:
        try:
            if isinstance(bedrag, str):
                bedrag = Decimal(bedrag)
            formatted = f"{bedrag:,.2f}"
            formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
            result = f"€ {formatted}"
        except:
            result = "€ 0,00"

    if with_font:
        return f'<font face="Courier">{result}</font>'
    return result


def format_percentage(pct: Any, with_font: bool = False) -> str:
    """Format percentage in Dutch style."""
    if pct is None:
        result = "0,00%"
    else:
        try:
            if isinstance(pct, str):
                pct = Decimal(pct)
            result = f"{float(pct) * 100:.2f}%".replace(".", ",")
        except:
            result = "0,00%"

    if with_font:
        return f'<font face="Courier">{result}</font>'
    return result


def format_datum(datum: Any, with_font: bool = False) -> str:
    """Format date in Dutch style."""
    if datum is None:
        result = "-"
    elif isinstance(datum, str):
        if "T" in datum:
            datum = datum.split("T")[0]
        parts = datum.split("-")
        if len(parts) == 3:
            result = f"{parts[2]}-{parts[1]}-{parts[0]}"
        else:
            result = datum
    else:
        result = datum.strftime("%d-%m-%Y")

    if with_font:
        return f'<font face="Courier">{result}</font>'
    return result


def format_opslag(opslag: Any) -> str:
    """Format opslag percentage correctly (handle both decimal and percentage input)."""
    if not opslag:
        return ""
    try:
        opslag_val = float(opslag)
        # If value is <= 1, it's likely a decimal (0.01 = 1%), otherwise it's already a percentage
        if opslag_val <= 1:
            opslag_val = opslag_val * 100
        return f"+{opslag_val:.0f}%"
    except:
        return ""


def _add_page_header_and_watermark(canvas, doc):
    """Add logo and Rentetool text to top left of every page, plus subtle watermark."""
    canvas.saveState()
    page_width, page_height = A4

    # ===== WATERMARK (centered, subtle) =====
    if os.path.exists(LOGO_PATH):
        try:
            # Draw large subtle watermark in center
            watermark_size = 8*cm
            x = (page_width - watermark_size) / 2
            y = (page_height - watermark_size) / 2

            # Very low opacity for watermark effect
            canvas.saveState()
            canvas.setFillAlpha(0.04)  # Very subtle
            canvas.drawImage(LOGO_PATH, x, y, width=watermark_size, height=watermark_size,
                           preserveAspectRatio=True, mask='auto')
            canvas.restoreState()
        except:
            pass

    # ===== PAGE HEADER =====
    # Logo in top left
    if os.path.exists(LOGO_PATH):
        try:
            logo_size = 0.9*cm
            x = 1.5*cm
            y = page_height - 1.3*cm
            canvas.drawImage(LOGO_PATH, x, y, width=logo_size, height=logo_size,
                           preserveAspectRatio=True, mask='auto')
        except:
            pass

    # "Rentetool" text next to logo
    canvas.setFont("Times-Bold", 12)
    canvas.setFillColor(PRIMARY_COLOR)
    canvas.drawString(2.6*cm, page_height - 1.1*cm, "Rentetool")

    # Subtle line under header
    canvas.setStrokeColor(BORDER_COLOR)
    canvas.setLineWidth(0.5)
    canvas.line(1.5*cm, page_height - 1.5*cm, page_width - 1.5*cm, page_height - 1.5*cm)

    canvas.restoreState()


def generate_pdf(invoer: Dict[str, Any], resultaat: Dict[str, Any], snapshot_created: datetime) -> bytes:
    """Generate PDF report matching webapp design exactly."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=2.2*cm,  # Extra space for page header
        bottomMargin=1.5*cm
    )

    styles = _get_styles()
    story = []

    case_info = invoer.get("case", {})
    totalen = resultaat.get("totalen", {})
    vorderingen_result = resultaat.get("vorderingen", [])
    deelbetalingen_result = resultaat.get("deelbetalingen", [])
    vorderingen_input = invoer.get("vorderingen", [])
    deelbetalingen_input = invoer.get("deelbetalingen", [])

    # ===== HEADER =====
    story.append(_build_header(case_info, snapshot_created, styles))
    story.append(Spacer(1, 0.6*cm))

    # ===== SECTIE 1: INVOER (zoals op webpagina) =====
    # Vorderingen
    story.append(Paragraph("VORDERINGEN", styles['SectionTitle']))
    story.append(Spacer(1, 0.2*cm))
    story.append(_build_vorderingen_invoer_table(vorderingen_input, styles))
    story.append(Spacer(1, 0.5*cm))

    # Deelbetalingen
    story.append(Paragraph("DEELBETALINGEN", styles['SectionTitle']))
    story.append(Spacer(1, 0.2*cm))
    if deelbetalingen_input:
        story.append(_build_deelbetalingen_invoer_table(deelbetalingen_input, styles))
    else:
        story.append(Paragraph("Geen deelbetalingen.", styles['Muted']))
    story.append(Spacer(1, 0.6*cm))

    # ===== SECTIE 2: BEREKENING RESULTAAT =====
    # Header met controle badge
    controle_ok = resultaat.get("controle_ok", True)
    einddatum = format_datum(case_info.get("einddatum", ""))

    result_header = f'<b>Berekening Resultaat</b>  '
    if controle_ok:
        result_header += f'<font color="#16a34a" size="8">[Controle OK]</font>'
    else:
        result_header += '<font color="red" size="8">[Controle FOUT]</font>'
    result_header += f'  <font color="#64748b" size="9">Per {einddatum}</font>'

    story.append(Paragraph(result_header, styles['ResultHeader']))
    story.append(Spacer(1, 0.3*cm))

    # 4 Summary blokken
    story.append(_build_summary_blocks(totalen, styles))
    story.append(Spacer(1, 0.3*cm))

    # Afgelost blok (groen)
    story.append(_build_afgelost_block(totalen, styles))
    story.append(Spacer(1, 0.4*cm))

    # Overzicht per vordering tabel
    story.append(Paragraph("OVERZICHT PER VORDERING", styles['SectionTitle']))
    story.append(Spacer(1, 0.2*cm))
    story.append(_build_vordering_summary_table(vorderingen_result, totalen, styles))
    story.append(Spacer(1, 0.5*cm))

    # ===== SECTIE 3: SPECIFICATIE PER VORDERING =====
    story.append(Paragraph("SPECIFICATIE PER VORDERING", styles['SectionTitle']))
    story.append(Spacer(1, 0.3*cm))

    # Create lookup dict for vordering input data (for rentetype)
    vord_input_lookup = {v.get("kenmerk"): v for v in vorderingen_input}

    for v in vorderingen_result:
        vord_input = vord_input_lookup.get(v.get("kenmerk"), {})
        story.extend(_build_vordering_specification(v, vord_input, deelbetalingen_result, styles))

    # ===== DISCLAIMER =====
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
    story.append(Spacer(1, 0.3*cm))

    disclaimer_text = """<b>TEST-VERSIE - DISCLAIMER</b><br/><br/>
Dit document is gegenereerd met de Rentetool test-versie en is alleen voor test doeleinden.
De gebruiker is zelf verantwoordelijk voor het verifiëren van de uitkomsten."""

    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        fontName='Helvetica',
        fontSize=8,
        textColor=MUTED_TEXT,
        alignment=TA_LEFT,
        leading=11,
    )

    disclaimer_data = [[Paragraph(disclaimer_text, disclaimer_style)]]
    disclaimer_table = Table(disclaimer_data, colWidths=[17*cm])
    disclaimer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fef3c7")),  # Amber light
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#f59e0b")),  # Amber border
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(disclaimer_table)
    story.append(Spacer(1, 0.3*cm))

    # ===== FOOTER =====
    footer_text = (
        f"Wettelijke rente conform art. 6:119/6:119a BW | "
        f"Toerekening conform art. 6:43/6:44 BW | "
        f"Gegenereerd: {snapshot_created.strftime('%d-%m-%Y %H:%M')}"
    )
    story.append(Paragraph(footer_text, styles['Footer']))

    # Build PDF with header and watermark on each page
    doc.build(story, onFirstPage=_add_page_header_and_watermark, onLaterPages=_add_page_header_and_watermark)
    return buffer.getvalue()


def _get_styles():
    """Get paragraph styles matching webapp design with serif headers."""
    styles = getSampleStyleSheet()

    # Use Times (serif) for headings like Merriweather on webapp
    styles['Title'].fontName = 'Times-Bold'
    styles['Title'].fontSize = 18
    styles['Title'].textColor = PRIMARY_COLOR
    styles['Title'].alignment = TA_LEFT
    styles['Title'].spaceAfter = 0

    styles.add(ParagraphStyle(
        'SectionTitle',
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=MUTED_TEXT,
        spaceBefore=0,
        spaceAfter=0,
    ))

    styles.add(ParagraphStyle(
        'ResultHeader',
        fontName='Times-Bold',  # Serif for main result header
        fontSize=13,
        textColor=TEXT_COLOR,
        spaceBefore=0,
        spaceAfter=0,
    ))

    styles.add(ParagraphStyle(
        'Muted',
        parent=styles['Normal'],
        fontSize=9,
        textColor=MUTED_TEXT,
        fontName='Helvetica-Oblique'
    ))

    styles.add(ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=7,
        textColor=MUTED_TEXT,
        alignment=TA_CENTER
    ))

    styles.add(ParagraphStyle(
        'VorderingHeader',
        fontName='Times-Bold',  # Serif for vordering headers
        fontSize=11,
        textColor=PRIMARY_COLOR,
        spaceBefore=8,
        spaceAfter=4,
    ))

    return styles


def _build_header(case_info: Dict, snapshot_created: datetime, styles) -> Table:
    """Build compact header with case info (logo is in page header)."""
    case_name = case_info.get("naam", "Onbekend")
    strategie = case_info.get("strategie", "A")

    # Left: subtitle (logo + Rentetool text is already in page header)
    left_content = f"""<font size="9" color="#64748b">Specificatie Renteberekening</font>"""

    # Right: case info
    right_content = f"""<font face="Times-Bold" size="13" color="#1e3a5f">{case_name}</font>
<font size="8" color="#64748b">Strategie {strategie}</font>"""

    data = [[
        Paragraph(left_content, styles['Normal']),
        Paragraph(right_content, ParagraphStyle('Right', alignment=TA_RIGHT))
    ]]

    table = Table(data, colWidths=[9*cm, 8*cm])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -1), 2, PRIMARY_COLOR),
    ]))
    return table


def _build_vorderingen_invoer_table(vorderingen: List[Dict], styles) -> Table:
    """Build vorderingen input table matching webapp."""
    if not vorderingen:
        return Paragraph("Geen vorderingen.", styles['Muted'])

    header = ["Kenmerk", "Bedrag", "Datum", "Type", "Kosten"]
    data = [header]

    for v in vorderingen:
        rentetype = RENTETYPE_SHORT.get(v.get("rentetype", 1), "?")
        opslag = v.get("opslag")
        if opslag:
            rentetype += f" +{format_percentage(opslag)}"

        data.append([
            v.get("kenmerk", ""),
            format_bedrag(v.get("bedrag", 0)),
            format_datum(v.get("datum", "")),
            rentetype,
            format_bedrag(v.get("kosten", 0))
        ])

    col_widths = [3.5*cm, 2.5*cm, 2.5*cm, 4.5*cm, 2.5*cm]
    table = Table(data, colWidths=col_widths)
    table.setStyle(_get_input_table_style(len(data)))
    return table


def _build_deelbetalingen_invoer_table(deelbetalingen: List[Dict], styles) -> Table:
    """Build deelbetalingen input table matching webapp."""
    header = ["Kenmerk", "Bedrag", "Datum", "Aangewezen aan"]
    data = [header]

    for d in deelbetalingen:
        aangewezen = d.get("aangewezen", [])
        aangewezen_str = ", ".join(aangewezen) if aangewezen else "via strategie"

        data.append([
            d.get("kenmerk", "-") or "-",
            format_bedrag(d.get("bedrag", 0)),
            format_datum(d.get("datum", "")),
            aangewezen_str
        ])

    col_widths = [3*cm, 2.5*cm, 2.5*cm, 7.5*cm]
    table = Table(data, colWidths=col_widths)
    table.setStyle(_get_input_table_style(len(data)))
    return table


def _build_summary_blocks(totalen: Dict, styles) -> Table:
    """Build the 4 summary blocks exactly like webapp."""

    def make_cell(label: str, value: str, is_primary: bool = False):
        if is_primary:
            label_color = "#ffffffcc"  # White with opacity
            value_color = "#ffffff"
            value_size = 14
        else:
            label_color = "#64748b"
            value_color = "#1e293b"
            value_size = 12

        content = f"""<font size="7" color="{label_color}">{label}</font><br/>
<font size="{value_size}" color="{value_color}"><b>{value}</b></font>"""
        return Paragraph(content, ParagraphStyle('Cell', leading=14))

    data = [[
        make_cell("HOOFDSOM", format_bedrag(totalen.get("oorspronkelijk", 0))),
        make_cell("KOSTEN", format_bedrag(totalen.get("kosten", 0))),
        make_cell("BEREKENDE RENTE", format_bedrag(totalen.get("rente", 0))),
        make_cell("TOTAAL OPENSTAAND", format_bedrag(totalen.get("openstaand", 0)), is_primary=True),
    ]]

    col_width = 4.25*cm
    table = Table(data, colWidths=[col_width, col_width, col_width, col_width])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (2, 0), MUTED_BG),
        ('BACKGROUND', (3, 0), (3, 0), PRIMARY_COLOR),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (2, 0), 0.5, BORDER_COLOR),
        ('BOX', (3, 0), (3, 0), 0.5, PRIMARY_COLOR),
    ]))
    return table


def _build_afgelost_block(totalen: Dict, styles) -> Table:
    """Build the green afgelost block exactly like webapp."""
    hs = format_bedrag(totalen.get("afgelost_hoofdsom", 0))
    kst = format_bedrag(totalen.get("afgelost_kosten", 0))
    rnt = format_bedrag(totalen.get("afgelost_rente", 0))

    content = f"""<font size="8" color="#16a34a"><b>TOTAAL AFGELOST</b></font><br/>
<font size="9" color="#16a34a">Hoofdsom:</font> <b>{hs}</b>
<font size="9" color="#16a34a">Kosten:</font> <b>{kst}</b>
<font size="9" color="#16a34a">Rente:</font> <b>{rnt}</b>"""

    data = [[Paragraph(content, ParagraphStyle('Afgelost', leading=14))]]
    table = Table(data, colWidths=[17*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SUCCESS_BG),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, SUCCESS_COLOR),
    ]))
    return table


def _build_vordering_summary_table(vorderingen: List[Dict], totalen: Dict, styles) -> Table:
    """Build vordering summary table exactly like webapp with monospace numbers."""
    mono_style = ParagraphStyle('Mono', fontName='Courier', fontSize=8, alignment=TA_RIGHT)
    mono_green = ParagraphStyle('MonoGreen', fontName='Courier', fontSize=8, alignment=TA_RIGHT, textColor=SUCCESS_COLOR)
    mono_bold = ParagraphStyle('MonoBold', fontName='Courier-Bold', fontSize=8, alignment=TA_RIGHT)
    mono_primary = ParagraphStyle('MonoPrimary', fontName='Courier-Bold', fontSize=8, alignment=TA_RIGHT, textColor=PRIMARY_COLOR)

    header = ["Vordering", "Hoofdsom", "Kosten", "Rente", "Afg. HS", "Afg. Kst", "Afg. Rnt", "Openstaand"]
    data = [header]

    for v in vorderingen:
        status = v.get("status", "OPEN")
        kenmerk = v.get("kenmerk", "")
        openstaand = format_bedrag(v.get("openstaand", 0)) if status != "VOLDAAN" else "€ 0,00"

        data.append([
            kenmerk,
            Paragraph(format_bedrag(v.get("oorspronkelijk_bedrag", 0)), mono_style),
            Paragraph(format_bedrag(v.get("kosten", 0)), mono_style),
            Paragraph(format_bedrag(v.get("totale_rente", 0)), mono_style),
            Paragraph(format_bedrag(v.get("afgelost_hoofdsom", 0)), mono_green),
            Paragraph(format_bedrag(v.get("afgelost_kosten", 0)), mono_green),
            Paragraph(format_bedrag(v.get("afgelost_rente", 0)), mono_green),
            Paragraph(openstaand, mono_bold),
        ])

    # Totaal row
    data.append([
        "Totaal",
        Paragraph(format_bedrag(totalen.get("oorspronkelijk", 0)), mono_bold),
        Paragraph(format_bedrag(totalen.get("kosten", 0)), mono_bold),
        Paragraph(format_bedrag(totalen.get("rente", 0)), mono_bold),
        Paragraph(format_bedrag(totalen.get("afgelost_hoofdsom", 0)), mono_green),
        Paragraph(format_bedrag(totalen.get("afgelost_kosten", 0)), mono_green),
        Paragraph(format_bedrag(totalen.get("afgelost_rente", 0)), mono_green),
        Paragraph(format_bedrag(totalen.get("openstaand", 0)), mono_primary),
    ])

    col_widths = [3*cm, 2*cm, 1.7*cm, 2.2*cm, 1.7*cm, 1.7*cm, 1.7*cm, 2.2*cm]
    table = Table(data, colWidths=col_widths)

    style = TableStyle([
        # Header
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 0), (-1, 0), MUTED_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), MUTED_TEXT),

        # Body - let Paragraph handle fonts for number columns
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

        # Totaal row
        ('FONTNAME', (0, -1), (0, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), MUTED_BG),
        ('LINEABOVE', (0, -1), (-1, -1), 1, PRIMARY_COLOR),

        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ])

    # Green background for VOLDAAN rows
    for i, v in enumerate(vorderingen, 1):
        if v.get("status") == "VOLDAAN":
            style.add('BACKGROUND', (0, i), (-1, i), SUCCESS_LIGHT)

    table.setStyle(style)
    return table


def _build_vordering_specification(v: Dict, vord_input: Dict, deelbetalingen: List[Dict], styles) -> List:
    """Build compact specification for one vordering with payment rows."""
    elements = []

    kenmerk = v.get("kenmerk", "")
    status = v.get("status", "OPEN")
    openstaand = format_bedrag(v.get("openstaand", 0))
    voldaan_datum = v.get("voldaan_datum")

    # Rentetype badge
    rentetype = vord_input.get("rentetype", 1)
    rentetype_label = RENTETYPE_SHORT.get(rentetype, f"Type {rentetype}")
    opslag = vord_input.get("opslag")
    opslag_str = format_opslag(opslag) if opslag else ""
    rentetype_badge = f'<font size="8" color="#64748b">[{rentetype_label}{" " + opslag_str if opslag_str else ""}]</font>'

    # Status badge
    if status == "VOLDAAN":
        status_badge = f'<font color="#16a34a">[VOLDAAN]</font>'
        if voldaan_datum:
            status_badge += f' <font size="8" color="#64748b">(op {format_datum(voldaan_datum)})</font>'
    else:
        status_badge = f'<font color="#1e3a5f">[OPEN]</font>'

    # Header line with rentetype
    header_text = f'<b>{kenmerk}</b> {rentetype_badge} {status_badge}  <font size="9">Openstaand: <font face="Courier"><b>{openstaand}</b></font></font>'
    elements.append(Paragraph(header_text, styles['VorderingHeader']))

    # Build periods table with payment rows - using Paragraphs for monospace font
    periodes = v.get("periodes", [])
    if periodes:
        mono_style = ParagraphStyle('Mono', fontName='Courier', fontSize=8, alignment=TA_RIGHT)
        mono_left = ParagraphStyle('MonoLeft', fontName='Courier', fontSize=8, alignment=TA_LEFT)

        header = ["Periode", "Dagen", "Hoofdsom", "Rente %", "Rente"]
        data = [header]
        row_colors = []  # Track which rows are payment rows

        for p in periodes:
            periode_str = f"{format_datum(p.get('start', ''))} - {format_datum(p.get('eind', ''))}"
            if p.get("is_kapitalisatie"):
                periode_str += " ↻"

            data.append([
                Paragraph(periode_str, mono_left),
                Paragraph(str(p.get("dagen", 0)), mono_style),
                Paragraph(format_bedrag(p.get("hoofdsom", 0)), mono_style),
                Paragraph(format_percentage(p.get("rente_pct", 0)), mono_style),
                Paragraph(format_bedrag(p.get("rente", 0)), mono_style)
            ])
            row_colors.append('normal' if not p.get("is_kapitalisatie") else 'kapitalisatie')

            # Check for payment on this period's end date
            period_end = p.get("eind", "")
            for db in deelbetalingen:
                if db.get("datum") == period_end:
                    toerekeningen = [t for t in db.get("toerekeningen", []) if t.get("vordering") == kenmerk]
                    if toerekeningen:
                        # Build payment description with monospace for amounts
                        parts = []
                        for t in toerekeningen:
                            type_label = {"kosten": "Kosten", "rente": "Rente", "hoofdsom": "Hoofdsom"}.get(t.get("type", ""), "")
                            parts.append(f'{type_label}: <font face="Courier"><b>{format_bedrag(t.get("bedrag", 0))}</b></font>')

                        db_kenmerk = db.get('kenmerk', '') or ''
                        payment_text = f'💰 Betaling {db_kenmerk} op <font face="Courier">{format_datum(period_end)}</font>: {" | ".join(parts)}'

                        data.append([
                            Paragraph(f'<font color="#16a34a">{payment_text}</font>',
                                      ParagraphStyle('Payment', fontSize=8)),
                            "", "", "", ""
                        ])
                        row_colors.append('payment')

        col_widths = [4.5*cm, 1.3*cm, 2.8*cm, 1.8*cm, 2.8*cm]
        table = Table(data, colWidths=col_widths)

        table_style = TableStyle([
            # Header
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 7),
            ('BACKGROUND', (0, 0), (-1, 0), MUTED_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), MUTED_TEXT),

            # Body - let Paragraph handle fonts
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),

            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ])

        # Apply row colors
        for i, row_type in enumerate(row_colors, 1):
            if row_type == 'payment':
                table_style.add('BACKGROUND', (0, i), (-1, i), PAYMENT_BG)
                table_style.add('SPAN', (0, i), (-1, i))
            elif row_type == 'kapitalisatie':
                table_style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor("#eff6ff"))

        table.setStyle(table_style)
        elements.append(table)

        # Legend
        elements.append(Paragraph(
            f'<font size="7" color="#64748b">* = kapitalisatie (rente bij hoofdsom)</font>',
            styles['Normal']
        ))

    elements.append(Spacer(1, 0.4*cm))
    return elements


def _get_input_table_style(num_rows: int) -> TableStyle:
    """Get clean table style for input tables."""
    return TableStyle([
        # Header
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 0), (-1, 0), MUTED_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), MUTED_TEXT),

        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (3, 0), (3, -1), 'LEFT'),  # Type/Aangewezen left aligned

        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),

        # Alternating rows
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
    ])
