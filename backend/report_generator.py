"""
Alpha-Guard — PDF Report Generator
====================================
Generates professional branded PDF reports using ReportLab.
Compiles Z-Score, Forensic AI, and Monte Carlo results.
"""

import io
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models import ZScoreResult, MonteCarloResult
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

router = APIRouter(prefix="/api/reports", tags=["Reports"])

# ──────────────────────────────────────────────
#  Brand Colors
# ──────────────────────────────────────────────

BRAND_DARK = colors.HexColor("#06080f")
BRAND_GREEN = colors.HexColor("#00e67a")
BRAND_CYAN = colors.HexColor("#22d3ee")
BRAND_RED = colors.HexColor("#ef4444")
BRAND_AMBER = colors.HexColor("#f59e0b")
BRAND_GRAY = colors.HexColor("#94a3b8")
BRAND_LIGHT = colors.HexColor("#f1f5f9")


def _build_styles():
    """Build custom paragraph styles for the Alpha-Guard brand."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "AG_Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        textColor=BRAND_DARK,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        "AG_Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=BRAND_GRAY,
        spaceAfter=16,
    ))
    styles.add(ParagraphStyle(
        "AG_SectionHeader",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=BRAND_DARK,
        spaceBefore=16,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        "AG_Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#334155"),
        leading=14,
    ))
    styles.add(ParagraphStyle(
        "AG_Mono",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=9,
        textColor=BRAND_DARK,
    ))
    styles.add(ParagraphStyle(
        "AG_Footer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        textColor=BRAND_GRAY,
        alignment=1,  # Center
    ))

    return styles


def _zone_color(zone: str) -> colors.HexColor:
    """Return brand color for a risk zone."""
    if zone == "Safe":
        return BRAND_GREEN
    elif zone == "Distress":
        return BRAND_RED
    return BRAND_AMBER


def generate_pdf_report(
    ticker: str,
    company_name: str,
    z_score: ZScoreResult | None = None,
    forensic_data: dict | None = None,
    monte_carlo: MonteCarloResult | None = None,
) -> bytes:
    """Generate a PDF report and return it as bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    styles = _build_styles()
    story = []

    # ─── Header ───
    story.append(Paragraph("ALPHA-GUARD", styles["AG_Title"]))
    story.append(Paragraph(
        f"Executive Risk Report — {ticker} ({company_name})",
        styles["AG_Subtitle"],
    ))
    story.append(Paragraph(
        f"Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}",
        styles["AG_Subtitle"],
    ))
    story.append(HRFlowable(
        width="100%", thickness=1, color=BRAND_GREEN,
        spaceAfter=12, spaceBefore=4,
    ))

    # ─── Z-Score Section ───
    story.append(Paragraph("1. ALTMAN Z-SCORE ANALYSIS", styles["AG_SectionHeader"]))
    if z_score:
        zone_color = _zone_color(z_score.zone)

        # Score badge
        story.append(Paragraph(
            f'Z-Score: <font color="#{zone_color.hexval()[2:]}">'
            f"<b>{z_score.score:.2f}</b></font> — "
            f'<font color="#{zone_color.hexval()[2:]}">{z_score.zone.upper()} ZONE</font>',
            styles["AG_Body"],
        ))
        story.append(Spacer(1, 8))

        # Components table
        comp_data = [
            ["Component", "Ratio", "Weight", "Weighted"],
            ["X1 — Working Capital / Assets", f"{z_score.components.x1_working_capital_to_total_assets:.4f}", "×1.2", f"{z_score.components.x1_working_capital_to_total_assets * 1.2:.4f}"],
            ["X2 — Retained Earnings / Assets", f"{z_score.components.x2_retained_earnings_to_total_assets:.4f}", "×1.4", f"{z_score.components.x2_retained_earnings_to_total_assets * 1.4:.4f}"],
            ["X3 — EBIT / Assets", f"{z_score.components.x3_ebit_to_total_assets:.4f}", "×3.3", f"{z_score.components.x3_ebit_to_total_assets * 3.3:.4f}"],
            ["X4 — Market Cap / Liabilities", f"{z_score.components.x4_market_cap_to_total_liabilities:.4f}", "×0.6", f"{z_score.components.x4_market_cap_to_total_liabilities * 0.6:.4f}"],
            ["X5 — Revenue / Assets", f"{z_score.components.x5_revenue_to_total_assets:.4f}", "×1.0", f"{z_score.components.x5_revenue_to_total_assets * 1.0:.4f}"],
        ]

        comp_table = Table(comp_data, colWidths=[3 * inch, 1.1 * inch, 0.8 * inch, 1.1 * inch])
        comp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_DARK),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("FONTNAME", (0, 1), (-1, -1), "Courier"),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(comp_table)
        story.append(Spacer(1, 8))
        story.append(Paragraph(z_score.interpretation, styles["AG_Body"]))
    else:
        story.append(Paragraph("Z-Score data unavailable for this ticker.", styles["AG_Body"]))

    story.append(Spacer(1, 12))

    # ─── Forensic AI Section ───
    story.append(Paragraph("2. FORENSIC AI ANALYSIS", styles["AG_SectionHeader"]))
    if forensic_data:
        f = forensic_data
        truth_color = _zone_color("Safe" if f.get("truth_score", 0) >= 70 else "Distress" if f.get("truth_score", 0) < 40 else "Gray")
        story.append(Paragraph(
            f'Truth Score: <font color="#{truth_color.hexval()[2:]}"><b>{f.get("truth_score", "N/A")}</b></font> '
            f'— {f.get("truth_zone", "Unknown")}',
            styles["AG_Body"],
        ))

        la = f.get("linguistic_analysis", {})
        if la:
            metrics_data = [
                ["Metric", "Value"],
                ["Hedging Score", f"{la.get('hedging_score', 0):.1f}"],
                ["Evasion Score", f"{la.get('evasion_score', 0):.1f}"],
                ["Sentiment", la.get("sentiment", "N/A").upper()],
                ["Confidence", f"{la.get('sentiment_confidence', 0):.0%}"],
                ["Words Analyzed", f"{la.get('total_words_analyzed', 0):,}"],
            ]
            metrics_table = Table(metrics_data, colWidths=[2.5 * inch, 1.5 * inch])
            metrics_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("FONTNAME", (0, 1), (-1, -1), "Courier"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            story.append(Spacer(1, 6))
            story.append(metrics_table)

        # Deception alert
        if f.get("deception_alert"):
            story.append(Spacer(1, 8))
            story.append(Paragraph(
                f'⚠ DECEPTION ALERT: {f.get("deception_reason", "")}',
                ParagraphStyle(
                    "alert", parent=styles["AG_Body"],
                    textColor=BRAND_RED, fontName="Helvetica-Bold", fontSize=9,
                ),
            ))

        # Red flags
        red_flags = f.get("red_flags", [])
        if red_flags:
            story.append(Spacer(1, 8))
            story.append(Paragraph(f"Red Flags ({len(red_flags)})", styles["AG_Body"]))
            flag_data = [["#", "Severity", "Category", "Explanation"]]
            for i, flag in enumerate(red_flags[:10], 1):
                flag_data.append([
                    str(i),
                    str(flag.get("severity", "?")),
                    flag.get("category", ""),
                    flag.get("explanation", "")[:80],
                ])
            flag_table = Table(flag_data, colWidths=[0.3 * inch, 0.6 * inch, 1 * inch, 4 * inch])
            flag_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fef2f2")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            story.append(flag_table)
    else:
        story.append(Paragraph("Forensic analysis unavailable.", styles["AG_Body"]))

    story.append(Spacer(1, 12))

    # ─── Monte Carlo Section ───
    story.append(Paragraph("3. MONTE CARLO STRESS TEST", styles["AG_SectionHeader"]))
    if monte_carlo:
        def fmt_rev(v):
            if v and v >= 1e9: return f"${v / 1e9:.1f}B"
            if v and v >= 1e6: return f"${v / 1e6:.0f}M"
            return f"${v:,.0f}" if v else "N/A"

        mc_data = [
            ["Metric", "Value"],
            ["Simulations", f"{monte_carlo.num_simulations:,}"],
            ["Time Horizon", f"{monte_carlo.time_horizon_years} years"],
            ["Initial Revenue", fmt_rev(monte_carlo.initial_revenue)],
            ["Mean Final Revenue", fmt_rev(monte_carlo.mean_final_revenue)],
            ["Median Final Revenue", fmt_rev(monte_carlo.median_final_revenue)],
            ["5th Percentile (Worst)", fmt_rev(monte_carlo.percentile_5)],
            ["95th Percentile (Best)", fmt_rev(monte_carlo.percentile_95)],
            ["P(Decline >20%)", f"{(monte_carlo.probability_of_decline or 0) * 100:.1f}%"],
        ]
        mc_table = Table(mc_data, colWidths=[2.5 * inch, 2 * inch])
        mc_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0fdfa")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("FONTNAME", (0, 1), (-1, -1), "Courier"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(mc_table)
    else:
        story.append(Paragraph("Monte Carlo simulation not run for this report.", styles["AG_Body"]))

    # ─── Footer ───
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_GRAY, spaceAfter=6))
    story.append(Paragraph(
        "ALPHA-GUARD v0.2.0 · Confidential · Generated by Alpha-Guard Forensic Credit Risk Platform",
        styles["AG_Footer"],
    ))
    story.append(Paragraph(
        "Data sources: SEC EDGAR · Google Gemini AI · Monte Carlo GBM Simulation",
        styles["AG_Footer"],
    ))

    doc.build(story)
    return buffer.getvalue()


# ──────────────────────────────────────────────
#  API Endpoint
# ──────────────────────────────────────────────

from pydantic import BaseModel, Field
from typing import Optional


class PDFReportRequest(BaseModel):
    """Request to generate a downloadable PDF report."""
    ticker: str = Field(..., description="Stock ticker symbol")
    include_monte_carlo: bool = Field(default=True, description="Include MC stress test in report")
    mc_simulations: int = Field(default=1000, ge=100, le=10000)
    mc_horizon_years: int = Field(default=5, ge=1, le=10)


@router.post(
    "/generate-pdf",
    summary="Generate PDF Executive Report",
    description=(
        "Generates a branded PDF report compiling Z-Score analysis, "
        "Forensic AI findings, and Monte Carlo stress test results. "
        "Returns the PDF as a downloadable file."
    ),
)
async def api_generate_pdf(request: PDFReportRequest):
    """Generate and return a PDF report."""
    from scraper import resolve_ticker_to_cik, fetch_financial_data_from_edgar
    from risk_engine import calculate_altman_z_score, run_monte_carlo_simulation
    from forensic_analyzer import analyze_filing_text
    from scraper import fetch_10k_text_sections
    from models import MonteCarloInput

    ticker = request.ticker.upper()

    # 1. Resolve company name
    company_name = ticker
    try:
        _, company_name = await resolve_ticker_to_cik(ticker)
    except Exception:
        pass

    # 2. Z-Score
    z_score = None
    revenue = None
    try:
        financials = await fetch_financial_data_from_edgar(ticker)
        z_score = calculate_altman_z_score(financials)
        revenue = financials.revenue
    except Exception:
        pass

    # 3. Forensic analysis
    forensic_data = None
    try:
        sections = await fetch_10k_text_sections(ticker)
        mda = sections.get("mda", "")
        risk_factors = sections.get("risk_factors", "")
        if mda or risk_factors:
            result = await analyze_filing_text(mda, risk_factors, z_score)
            forensic_data = result.model_dump()
    except Exception:
        pass

    # 4. Monte Carlo
    mc_result = None
    if request.include_monte_carlo:
        try:
            mc_input = MonteCarloInput(
                ticker=ticker,
                num_simulations=request.mc_simulations,
                time_horizon_years=request.mc_horizon_years,
                initial_revenue=revenue,
            )
            mc_result = run_monte_carlo_simulation(mc_input)
        except Exception:
            pass

    # 5. Generate PDF
    pdf_bytes = generate_pdf_report(
        ticker=ticker,
        company_name=company_name,
        z_score=z_score,
        forensic_data=forensic_data,
        monte_carlo=mc_result,
    )

    filename = f"AlphaGuard_{ticker}_Report_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
