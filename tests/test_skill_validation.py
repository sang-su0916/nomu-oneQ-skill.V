#!/usr/bin/env python3
"""lbiz-ai-kit — Skill Validation Test

검증 항목:
  1. SKILL.md frontmatter (name/description/when_to_use)
  2. calculator.py CLI 실행 가능
  3. 시나리오별 계산 정확도

Usage:
  python3 tests/test_skill_validation.py
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"


def check_frontmatter(skill_dir: Path) -> tuple[bool, str]:
    md = skill_dir / "SKILL.md"
    if not md.exists():
        return False, f"SKILL.md missing in {skill_dir.name}"
    text = md.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return False, f"{skill_dir.name}: no frontmatter"
    fm = m.group(1)
    for key in ("name:", "description:", "when_to_use:"):
        if key not in fm:
            return False, f"{skill_dir.name}: missing {key}"
    return True, ""


def run_calculator(skill: str, args: list[str], cli_path: str = "references/calculator.py") -> dict:
    cli = SKILLS_DIR / skill / cli_path
    proc = subprocess.run(
        ["python3", str(cli)] + args,
        capture_output=True, text=True, timeout=10,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"{skill} CLI failed: {proc.stderr}")
    return json.loads(proc.stdout)


SCENARIOS = [
    {
        "id": "S-01",
        "skill": "severance-pay",
        "args": ["simple", "--avg-monthly-wage", "3500000", "--years", "5"],
        "assert": lambda r: r["eligible"] and r["final_severance"] == 17500000,
        "desc": "간이: 월350만 × 5년 = 1750만",
    },
    {
        "id": "S-02",
        "skill": "severance-pay",
        "args": ["simple", "--avg-monthly-wage", "3000000", "--years", "0", "--months", "11"],
        "assert": lambda r: not r["eligible"],
        "desc": "1년 미만 → 청구권 없음",
    },
    {
        "id": "S-03",
        "skill": "severance-pay",
        "args": [
            "calculate",
            "--avg-3month-wage-total", "10500000",
            "--days-in-3month", "92",
            "--total-service-days", "1825",
        ],
        "assert": lambda r: r["eligible"] and 16500000 < r["final_severance"] < 17500000,
        "desc": "정확: 3개월 1050만/92일 × 5년 ≈ 17백만",
    },
    {
        "id": "S-04",
        "skill": "severance-pay",
        "args": [
            "calculate",
            "--avg-3month-wage-total", "12000000",
            "--days-in-3month", "90",
            "--annual-bonus", "8000000",
            "--total-service-days", "3650",
            "--prior-settlement", "20000000",
        ],
        "assert": lambda r: r["eligible"] and r["prior_settlement"] == 20000000,
        "desc": "중간정산 공제 적용",
    },
    # annual-leave
    {
        "id": "AL-01",
        "skill": "annual-leave",
        "args": ["entitlement", "--hire-date", "2020-04-13", "--base-date", "2026-04-13", "--base-type", "hire"],
        "assert": lambda r: r.get("entitlement_days") == 17,
        "desc": "5년 근속 → 17일 (15 + 가산 2)",
    },
    {
        "id": "AL-02",
        "skill": "annual-leave",
        "args": ["entitlement", "--hire-date", "2001-04-13", "--base-date", "2026-04-13", "--base-type", "hire"],
        "assert": lambda r: r.get("entitlement_days") == 25,
        "desc": "25년 근속 → 25일 (한도)",
    },
    {
        "id": "AL-03",
        "skill": "annual-leave",
        "args": ["unused-pay", "--daily-ordinary-wage", "100000", "--unused-days", "5"],
        "assert": lambda r: r.get("unused_pay") == 500000,
        "desc": "미사용수당: 일급 10만 × 5일 = 50만",
    },
    # four-insurances
    {
        "id": "FI-01",
        "skill": "four-insurances",
        "args": ["calculate", "--monthly-wage", "3000000", "--company-size", "under_150", "--industry-rate", "0.0143"],
        "assert": lambda r: r["items"]["national_pension"]["employee"] == 135000,
        "desc": "국민연금 근로자 분담 (300만 × 4.5% = 135,000)",
    },
    {
        "id": "FI-02",
        "skill": "four-insurances",
        "args": ["calculate", "--monthly-wage", "7000000", "--company-size", "under_150", "--industry-rate", "0.0143"],
        "assert": lambda r: r["items"]["national_pension"]["employee"] == 277650,
        "desc": "상한 적용 (700만 → 6,170,000 × 4.5% = 277,650)",
    },
    # unemployment-benefit
    {
        "id": "UB-01",
        "skill": "unemployment-benefit",
        "args": [
            "calculate", "--avg-daily-wage", "200000", "--insured-days", "1825",
            "--insured-years", "5", "--age", "45", "--voluntary", "no", "--has-disability", "no",
        ],
        "assert": lambda r: r.get("eligible") and r.get("daily_benefit") == 66000,
        "desc": "5년 가입, 평균임금 일20만 → 일액 66,000 (상한)",
    },
    {
        "id": "UB-02",
        "skill": "unemployment-benefit",
        "args": [
            "calculate", "--avg-daily-wage", "100000", "--insured-days", "100",
            "--insured-years", "0", "--age", "30", "--voluntary", "no", "--has-disability", "no",
        ],
        "assert": lambda r: not r.get("eligible"),
        "desc": "피보험단위기간 100일 → 자격 없음",
    },
    # wage-base
    {
        "id": "WB-01",
        "skill": "wage-base",
        "args": ["ordinary", "--base-wage", "3000000", "--base-type", "monthly"],
        "assert": lambda r: r.get("hourly") in (14354, 14353) or 14350 <= r.get("hourly", 0) <= 14360,
        "desc": "월 300만 통상임금 → 시급 약 14,354",
    },
    # minimum-wage
    {
        "id": "MW-01",
        "skill": "minimum-wage",
        "args": ["check", "--monthly-wage", "2000000", "--weekly-hours", "40"],
        "assert": lambda r: r.get("violation") is True and r.get("hourly_rate_actual") == 9569,
        "desc": "월 200만/40H → 시급 9,569 위반",
    },
    {
        "id": "MW-02",
        "skill": "minimum-wage",
        "args": ["check", "--monthly-wage", "2156880", "--weekly-hours", "40"],
        "assert": lambda r: r.get("violation") is False,
        "desc": "월 2,156,880 = 시급 10,320 정확히 최저임금",
    },
    # weekly-holiday-pay
    {
        "id": "WH-01",
        "skill": "weekly-holiday-pay",
        "args": ["calculate", "--weekly-hours", "40", "--hourly-wage", "10320", "--worked-all-days"],
        "assert": lambda r: r.get("amount") == 82560,
        "desc": "주 40H/시급 10,320/개근 → 주휴수당 82,560",
    },
    {
        "id": "WH-02",
        "skill": "weekly-holiday-pay",
        "args": ["calculate", "--weekly-hours", "14", "--hourly-wage", "10320", "--worked-all-days"],
        "assert": lambda r: not r.get("eligible"),
        "desc": "주 14H → 15H 미만 미발생",
    },
    # overtime-pay
    {
        "id": "OT-01",
        "skill": "overtime-pay",
        "args": ["calculate", "--hourly-wage", "10320", "--overtime-hours", "2", "--company-size-ge-5"],
        "assert": lambda r: r.get("grand_total") == 30960,
        "desc": "시급 10,320 연장 2H → 기본 20,640 + 가산 10,320 = 30,960",
    },
    {
        "id": "OT-02",
        "skill": "overtime-pay",
        "args": ["calculate", "--hourly-wage", "10320", "--overtime-hours", "2", "--no-company-size-ge-5"],
        "assert": lambda r: r.get("grand_total") == 20640,
        "desc": "5인 미만 사업장 연장 2H → 가산 없음 원금만",
    },
    # omsc (meta)
    {
        "id": "OMSC-01",
        "skill": "omsc",
        "args": ["--json", "list-templates"],
        "_cli_path": "references/scaffold.py",
        "assert": lambda r: "templates" in r and len(r.get("templates", [])) >= 2,
        "desc": "omsc scaffold.py list-templates (json) — 최소 2개 템플릿 존재",
    },
    {
        "id": "OMSC-02",
        "skill": "omsc",
        "args": ["--json", "new", "--name", "tmp-test-scaffold", "--domain", "테스트", "--law", "없음", "--dry-run"],
        "_cli_path": "references/scaffold.py",
        "assert": lambda r: r.get("dry_run") is True and r.get("name") == "tmp-test-scaffold",
        "desc": "omsc scaffold.py new dry-run (json) — 실제 생성 없이 미리보기",
    },
    # income-tax (세무)
    {
        "id": "IT-01",
        "skill": "income-tax",
        "args": ["calculate", "--taxable-income", "10000000"],
        "assert": lambda r: r["national_income_tax"] == 600000,
        "desc": "과표 1천만 (구간1 6%) → 60만",
    },
    {
        "id": "IT-02",
        "skill": "income-tax",
        "args": ["calculate", "--taxable-income", "30000000"],
        "assert": lambda r: r["national_income_tax"] == 3240000,
        "desc": "과표 3천만 → 3천만×15% - 126만 = 324만",
    },
    {
        "id": "IT-03",
        "skill": "income-tax",
        "args": ["calculate", "--taxable-income", "50000000"],
        "assert": lambda r: r["national_income_tax"] == 6240000,
        "desc": "과표 5천만 (구간2 끝) → 5천만×15% - 126만 = 624만",
    },
    {
        "id": "IT-04",
        "skill": "income-tax",
        "args": ["calculate", "--taxable-income", "100000000"],
        "assert": lambda r: r["national_income_tax"] == 19560000,
        "desc": "과표 1억 (구간4 35%) → 1억×35% - 1544만 = 1,956만",
    },
    {
        "id": "IT-05",
        "skill": "income-tax",
        "args": ["calculate", "--taxable-income", "1500000000"],
        "assert": lambda r: r["national_income_tax"] == 609060000,
        "desc": "과표 15억 (최고구간 45%) → 15억×45% - 6594만 = 6억 906만",
    },
    {
        "id": "IT-06",
        "skill": "income-tax",
        "args": ["effective-rate", "--taxable-income", "50000000"],
        "assert": lambda r: r["marginal_rate_pct"] == 15 and 12 < r["national_effective_rate_pct"] < 13,
        "desc": "과표 5천만 실효세율 약 12.48%",
    },
    # break-even (경영)
    {
        "id": "BE-01",
        "skill": "break-even",
        "args": [
            "calculate",
            "--fixed-cost", "100000000",
            "--unit-price", "10000",
            "--unit-variable-cost", "6000",
        ],
        "assert": lambda r: r["bep_units"] == 25000 and r["bep_revenue"] == 250000000,
        "desc": "고정비 1억·단가 1만·변동비 6천 → BEP 25,000개·2.5억",
    },
    {
        "id": "BE-02",
        "skill": "break-even",
        "args": [
            "calculate",
            "--fixed-cost", "100000000",
            "--unit-price", "10000",
            "--unit-variable-cost", "6000",
            "--target-profit", "20000000",
        ],
        "assert": lambda r: r["target_units"] == 30000,
        "desc": "위 + 목표이익 2천만 → 목표수량 30,000개",
    },
    {
        "id": "BE-03",
        "skill": "break-even",
        "args": [
            "margin-of-safety",
            "--actual-revenue", "300000000",
            "--bep-revenue", "250000000",
        ],
        "assert": lambda r: 0.166 < r["margin_of_safety_ratio"] < 0.168,
        "desc": "실제매출 3억·BEP 2.5억 → 안전한계율 ≈ 0.1667",
    },
    # depreciation (경영·세무)
    {
        "id": "DEP-01",
        "skill": "depreciation",
        "args": ["straight-line", "--acquisition-cost", "10000000", "--useful-life", "5"],
        "assert": lambda r: r["annual_depreciation"] == 2000000,
        "desc": "정액법 취득 1천만·잔존 0·5년 → 연 200만",
    },
    {
        "id": "DEP-02",
        "skill": "depreciation",
        "args": ["straight-line", "--acquisition-cost", "100000000",
                 "--salvage-value", "10000000", "--useful-life", "10"],
        "assert": lambda r: r["annual_depreciation"] == 9000000,
        "desc": "정액법 취득 1억·잔존 1천만·10년 → 연 900만",
    },
    {
        "id": "DEP-03",
        "skill": "depreciation",
        "args": ["estimate-useful-life", "--asset-category", "computer"],
        "assert": lambda r: r["useful_life_years"] == 4,
        "desc": "기준내용연수: 컴퓨터 → 4년",
    },
    {
        "id": "DEP-04",
        "skill": "depreciation",
        "args": ["production", "--acquisition-cost", "10000000", "--salvage-value", "0",
                 "--total-production", "100000", "--actual-production", "20000"],
        "assert": lambda r: r["current_depreciation"] == 2000000,
        "desc": "생산량비례법 1천만/10만×2만 → 200만",
    },
    # financial-ratio (경영)
    {
        "id": "FR-01",
        "skill": "financial-ratio",
        "args": ["liquidity", "--current-assets", "15000000", "--current-liabilities", "10000000"],
        "assert": lambda r: r["current_ratio"] == 150.0,
        "desc": "유동자산 1500만/유동부채 1000만 → 유동비율 150.0%",
    },
    {
        "id": "FR-02",
        "skill": "financial-ratio",
        "args": [
            "leverage", "--total-debt", "300000000", "--total-equity", "200000000",
            "--total-assets", "500000000", "--ebit", "30000000", "--interest-expense", "10000000",
        ],
        "assert": lambda r: r["debt_to_equity"] == 150.0,
        "desc": "부채 3억/자본 2억 → 부채비율 150.0%",
    },
    {
        "id": "FR-03",
        "skill": "financial-ratio",
        "args": [
            "profitability", "--net-income", "10000000", "--revenue", "100000000",
            "--total-assets", "500000000", "--total-equity", "500000000",
        ],
        "assert": lambda r: r["net_profit_margin"] == 10.0,
        "desc": "당기순이익 1천만/매출 1억 → 매출순이익률 10.0%",
    },
    {
        "id": "FR-04",
        "skill": "financial-ratio",
        "args": [
            "profitability", "--net-income", "50000000", "--revenue", "500000000",
            "--total-assets", "1000000000", "--total-equity", "500000000",
        ],
        "assert": lambda r: r["roe"] == 10.0,
        "desc": "당기순이익 5천만/자본 5억 → ROE 10.0%",
    },
    # financial-diagnosis (경영 — 메타 종합진단)
    {
        "id": "FD-01",
        "skill": "financial-diagnosis",
        "args": [
            "diagnose",
            "--current-assets", "200000000", "--current-liabilities", "100000000",
            "--inventory", "40000000", "--accounts-receivable", "50000000",
            "--total-debt", "160000000", "--total-equity", "200000000", "--total-assets", "360000000",
            "--revenue", "500000000", "--net-income", "24000000",
            "--operating-income", "50000000", "--cogs", "300000000",
            "--ebit", "50000000", "--interest-expense", "10000000",
        ],
        "assert": lambda r: r["grade"][0] in ("A", "S") and r["overall_score"] >= 75,
        "desc": "건전 기업 (유동 200/부채 80/ROE 12/이자보상 5) → A 또는 S",
    },
    {
        "id": "FD-02",
        "skill": "financial-diagnosis",
        "args": [
            "diagnose",
            "--current-assets", "80000000", "--current-liabilities", "100000000",
            "--inventory", "30000000", "--accounts-receivable", "50000000",
            "--total-debt", "450000000", "--total-equity", "150000000", "--total-assets", "600000000",
            "--revenue", "500000000", "--net-income", "-7500000",
            "--operating-income", "5000000", "--cogs", "400000000",
            "--ebit", "5000000", "--interest-expense", "10000000",
        ],
        "assert": lambda r: r["grade"][0] == "D" and r["overall_score"] < 45,
        "desc": "위험 기업 (유동 80/부채 300/ROE -5/이자보상 0.5) → D",
    },
    {
        "id": "FD-03",
        "skill": "financial-diagnosis",
        "args": [
            "diagnose",
            "--current-assets", "80000000", "--current-liabilities", "100000000",
            "--inventory", "30000000", "--accounts-receivable", "50000000",
            "--total-debt", "450000000", "--total-equity", "150000000", "--total-assets", "600000000",
            "--revenue", "500000000", "--net-income", "-7500000",
            "--operating-income", "5000000", "--cogs", "400000000",
            "--ebit", "5000000", "--interest-expense", "10000000",
        ],
        "assert": lambda r: any("한계기업" in f for f in r.get("risk_flags", [])),
        "desc": "이자보상배율 1배 미만 → risk_flags에 '한계기업' 포함",
    },
    # cash-flow-analysis (경영 — 현금흐름표)
    {
        "id": "CFA-01",
        "skill": "cash-flow-analysis",
        "args": [
            "analyze",
            "--operating-cf", "80000000",
            "--investing-cf", "-50000000",
            "--financing-cf", "-20000000",
        ],
        "assert": lambda r: r["cf_pattern"].startswith("안정"),
        "desc": "OCF +8천만/IFCF -5천만/FCF -2천만 → 안정형",
    },
    {
        "id": "CFA-02",
        "skill": "cash-flow-analysis",
        "args": [
            "analyze",
            "--operating-cf", "-30000000",
            "--investing-cf", "20000000",
            "--financing-cf", "10000000",
        ],
        "assert": lambda r: r["cf_pattern"].startswith("심각"),
        "desc": "OCF -3천만/IFCF +2천만/FCF +1천만 → 심각형",
    },
    {
        "id": "CFA-03",
        "skill": "cash-flow-analysis",
        "args": [
            "analyze",
            "--operating-cf", "100000000",
            "--investing-cf", "-10000000",
            "--financing-cf", "-10000000",
            "--net-income", "80000000",
        ],
        "assert": lambda r: r["quality_indicators"]["ocf_to_net_income_ratio"] == 1.25,
        "desc": "OCF 1억/순이익 8천만 → ocf_to_net_income_ratio = 1.25",
    },
    {
        "id": "CFA-04",
        "skill": "cash-flow-analysis",
        "args": [
            "analyze",
            "--operating-cf", "50000000",
            "--investing-cf", "-20000000",
            "--financing-cf", "0",
            "--capex", "20000000",
        ],
        "assert": lambda r: r["free_cash_flow"] == 30000000,
        "desc": "OCF 5천만 - CapEx 2천만 → FCF 3천만",
    },
    # financial-statement-trend (경영 — 수평·수직·추세)
    {
        "id": "FST-01",
        "skill": "financial-statement-trend",
        "args": [
            "horizontal",
            "--revenue-current", "500000000", "--revenue-prior", "450000000",
        ],
        "assert": lambda r: r["items"]["revenue"]["change_rate"] == 11.11,
        "desc": "수평: 매출 5억/4.5억 → change_rate 11.11%",
    },
    {
        "id": "FST-02",
        "skill": "financial-statement-trend",
        "args": [
            "vertical", "--statement", "is",
            "--revenue", "500000000", "--cogs", "325000000",
        ],
        "assert": lambda r: r["ratios"]["cogs_ratio"] == 65.00,
        "desc": "수직: 매출 5억·원가 3.25억 → cogs_ratio 65.00%",
    },
    {
        "id": "FST-03",
        "skill": "financial-statement-trend",
        "args": [
            "trend",
            "--years", "2025,2026",
            "--values", "100000000,121000000",
            "--label", "매출",
        ],
        "assert": lambda r: r["cagr"] == 21.00,
        "desc": "추세: 1억→1.21억 2년 → CAGR 21.00%",
    },
    # preliminary-closing (경영 — 월별·분기별 가결산)
    {
        "id": "PC-01",
        "skill": "preliminary-closing",
        "args": [
            "monthly",
            "--revenue", "100000000", "--cogs", "60000000", "--sga", "25000000",
        ],
        "assert": lambda r: r["operating_income"] == 15000000 and r["margins"]["gross_margin_pct"] == 40.00,
        "desc": "monthly 매출 1억·원가 6천만·판관비 2.5천만 → 영업이익 1500만, 매출총이익률 40%",
    },
    {
        "id": "PC-02",
        "skill": "preliminary-closing",
        "args": [
            "monthly",
            "--revenue", "100000000", "--cogs", "60000000", "--sga", "25000000",
            "--interest-expense", "2000000",
            "--estimated-tax-rate", "0.2",
        ],
        "assert": lambda r: r["estimated_tax"] == 2600000 and r["net_income"] == 10400000,
        "desc": "monthly 세율 0.2·세전 1300만 → 법인세 260만·당기순이익 1040만",
    },
    {
        "id": "PC-03",
        "skill": "preliminary-closing",
        "args": [
            "ytd",
            "--ytd-revenue", "100000000", "--ytd-cogs", "60000000", "--ytd-sga", "25000000",
            "--months-elapsed", "6",
        ],
        "assert": lambda r: r["annualized"]["revenue"] == 200000000,
        "desc": "ytd 6개월 매출 1억 → 연환산 매출 2억",
    },
    {
        "id": "PC-04",
        "skill": "preliminary-closing",
        "args": [
            "target-vs-actual",
            "--target-revenue", "1200000000", "--actual-revenue", "500000000",
            "--target-operating-income", "120000000", "--actual-operating-income", "60000000",
            "--target-net-income", "90000000", "--actual-net-income", "45000000",
            "--months-elapsed", "6",
        ],
        "assert": lambda r: (
            r["items"]["revenue"]["achievement_pct"] == 41.67
            and "저조" in r["items"]["revenue"]["flag"]
        ),
        "desc": "target-vs-actual 목표 1.2억·실적 5천만·6개월 → 달성률 41.67%·flag 저조",
    },
    {
        "id": "FST-04",
        "skill": "financial-statement-trend",
        "args": [
            "trend",
            "--years", "2022,2023,2024,2025,2026",
            "--values", "400000000,420000000,450000000,480000000,500000000",
            "--label", "매출",
        ],
        "assert": lambda r: (
            r["index"][0] == 100.00
            and r["index"][-1] == 125.00
            and r["cagr"] == 5.74
        ),
        "desc": "추세 5개년: 기준 100, 종료 125, CAGR 5.74%",
    },
    # corporate-tax-interim-payment (세무)
    {
        "id": "CIP-01",
        "skill": "corporate-tax-interim-payment",
        "args": ["standard", "--prior-tax", "50000000", "--prior-months", "12", "--current-period-months", "6"],
        "assert": lambda r: r["interim_payment"] == 25000000,
        "desc": "standard 직전세액 5천만·12/6월 → 25,000,000",
    },
    {
        "id": "CIP-02",
        "skill": "corporate-tax-interim-payment",
        "args": ["standard", "--prior-tax", "100000000", "--prior-credits", "20000000",
                 "--prior-months", "12", "--current-period-months", "6"],
        "assert": lambda r: r["interim_payment"] == 40000000,
        "desc": "standard 직전세액 1억·공제 2천만·12/6월 → (100M-20M)×0.5 = 40,000,000",
    },
    {
        "id": "CIP-03",
        "skill": "corporate-tax-interim-payment",
        "args": ["estimation", "--interim-taxable-income", "150000000", "--current-period-months", "6"],
        "assert": lambda r: (
            r["annualized_taxable"] == 300000000
            and r["annualized_tax"] == 40000000
            and r["interim_payment"] == 20000000
        ),
        "desc": "estimation 중간과세표준 1.5억·6월 → 연환산 3억, 산출세액 4000만 (2026 개정 10%/20%), 납부 2000만",
    },
    {
        "id": "CIP-04",
        "skill": "corporate-tax-interim-payment",
        "args": ["exemption-check", "--prior-tax", "0"],
        "assert": lambda r: r["exempt"] is True,
        "desc": "exemption-check prior_tax=0 → exempt true",
    },
    # value-added-tax (세무)
    {
        "id": "VAT-01",
        "skill": "value-added-tax",
        "args": ["general", "--sales-supply", "100000000", "--purchase-supply", "60000000"],
        "assert": lambda r: r["payable_vat"] == 4000000,
        "desc": "general 매출 1억·매입 6천만 → 납부세액 4,000,000 (1000만-600만)",
    },
    {
        "id": "VAT-02",
        "skill": "value-added-tax",
        "args": ["simplified", "--supply-price", "80000000", "--industry", "retail"],
        "assert": lambda r: r["payable_vat"] == 1200000 and r["exempt_from_payment"] is False,
        "desc": "simplified 소매업·공급대가 8천만 → 8천만×15%×10% = 1,200,000",
    },
    {
        "id": "VAT-03",
        "skill": "value-added-tax",
        "args": ["simplified", "--supply-price", "45000000", "--industry", "service"],
        "assert": lambda r: r["exempt_from_payment"] is True and r["payable_vat"] == 0,
        "desc": "simplified 공급대가 4,500만 (<4,800만) → §69 납부의무 면제",
    },
    {
        "id": "VAT-04",
        "skill": "value-added-tax",
        "args": ["eligibility", "--prior-year-supply-price", "150000000"],
        "assert": lambda r: r["eligible"] is False and any("1억 400만원" in x for x in r["reasons"]),
        "desc": "eligibility 직전연도 1.5억·개인 → 부적격 (1억 400만원 초과)",
    },
    # withholding-tax (세무·노무 교차)
    {
        "id": "WHT-01",
        "skill": "withholding-tax",
        "args": ["business", "--payment", "1000000"],
        "assert": lambda r: r["total_withholding"] == 33000 and r["income_tax"] == 30000 and r["local_tax"] == 3000,
        "desc": "사업소득 100만 지급 → 3.3% = 33,000 (소득세 30,000 + 지방세 3,000)",
    },
    {
        "id": "WHT-02",
        "skill": "withholding-tax",
        "args": ["other", "--payment", "1000000", "--type", "lecture"],
        "assert": lambda r: (
            r["taxable_income"] == 400000
            and r["total_withholding"] == 88000
            and r["income_tax"] == 80000
            and r["local_tax"] == 8000
        ),
        "desc": "기타소득 강연료 100만 (60% 의제) → 과세표준 40만, 원천 88,000 (실효 8.8%)",
    },
    {
        "id": "WHT-03",
        "skill": "withholding-tax",
        "args": ["interest-dividend", "--amount", "10000000"],
        "assert": lambda r: r["total_withholding"] == 1540000 and r["income_tax"] == 1400000 and r["local_tax"] == 140000,
        "desc": "이자·배당 1천만 → 15.4% = 1,540,000",
    },
    {
        "id": "WHT-04",
        "skill": "withholding-tax",
        "args": ["daily-worker", "--daily-wage", "200000"],
        "assert": lambda r: (
            r["income_tax_per_day"] == 1350
            and r["local_tax_per_day"] == 135
            and r["total_per_day"] == 1485
            and r["exempt_from_withholding"] is False
        ),
        "desc": "일용 일급 20만 → 과세 5만 × 2.7% = 1,350 (소득세) + 135 (지방) = 1,485",
    },
    {
        "id": "WHT-05",
        "skill": "withholding-tax",
        "args": ["daily-worker", "--daily-wage", "150000"],
        "assert": lambda r: (
            r["total_per_day"] == 0
            and r["exempt_from_withholding"] is True
        ),
        "desc": "일용 일급 15만 이하 → 비과세 (total_per_day = 0)",
    },
    # capital-gains-tax (세무 — 부동산 양도세)
    {
        "id": "CGT-01",
        "skill": "capital-gains-tax",
        "args": [
            "calculate-gain",
            "--sale-price", "1500000000",
            "--acquisition-price", "800000000",
            "--necessary-expense", "50000000",
        ],
        "assert": lambda r: r["capital_gain"] == 650000000,
        "desc": "양도차익: 15억 - 8억 - 5천만 = 6.5억",
    },
    {
        "id": "CGT-02",
        "skill": "capital-gains-tax",
        "args": [
            "long-term-deduction",
            "--capital-gain", "650000000",
            "--holding-years", "10",
            "--is-one-house",
            "--residence-years", "10",
        ],
        "assert": lambda r: r["deduction_rate"] == 0.80 and r["deduction_amount"] == 520000000,
        "desc": "1세대1주택 특례 보유10·거주10 → 80% (표2 40+표3 40), 6.5억×0.8=5.2억",
    },
    {
        "id": "CGT-03",
        "skill": "capital-gains-tax",
        "args": [
            "one-house-exemption",
            "--sale-price", "1100000000",
            "--holding-years", "5",
            "--residence-years", "2",
        ],
        "assert": lambda r: r["exempt_fully"] is True and r["taxable_gain"] == 0,
        "desc": "1세대1주택 11억·5년 보유 → 전액 비과세",
    },
    {
        "id": "CGT-04",
        "skill": "capital-gains-tax",
        "args": [
            "one-house-exemption",
            "--sale-price", "1500000000",
            "--holding-years", "10",
            "--capital-gain", "300000000",
        ],
        "assert": lambda r: r["exempt_fully"] is False and r["taxable_gain"] == 60000000,
        "desc": "1세대1주택 15억 고가주택 부분과세 3억×(15-12)/15 = 6천만",
    },
    {
        "id": "CGT-05",
        "skill": "capital-gains-tax",
        "args": [
            "long-term-deduction",
            "--capital-gain", "100000000",
            "--holding-years", "10",
        ],
        "assert": lambda r: r["deduction_rate"] == 0.16,
        "desc": "일반 표1 보유 10년 → (10-2)×2%p = 16%",
    },
    # acquisition-tax (세무 — 지방세법 §11, §13의2)
    {
        "id": "ACQ-01",
        "skill": "acquisition-tax",
        "args": ["general", "--acquisition-price", "500000000", "--area-sqm", "84"],
        "assert": lambda r: r["applied_rate"] == 0.01 and r["acquisition_tax"] == 5000000,
        "desc": "유상 주택 5억 → 1% → 취득세 500만원 (§11①8)",
    },
    {
        "id": "ACQ-02",
        "skill": "acquisition-tax",
        "args": ["general", "--acquisition-price", "1200000000", "--area-sqm", "110"],
        "assert": lambda r: r["applied_rate"] == 0.03 and r["acquisition_tax"] == 36000000,
        "desc": "유상 주택 12억 → 3% → 취득세 3,600만원 (§11①8)",
    },
    {
        "id": "ACQ-03",
        "skill": "acquisition-tax",
        "args": ["corporate", "--acquisition-price", "1000000000", "--area-sqm", "84"],
        "assert": lambda r: r["applied_rate"] == 0.12 and r["acquisition_tax"] == 120000000,
        "desc": "법인 주택 10억 → 12% → 취득세 1.2억 (§13의2)",
    },
    {
        "id": "ACQ-04",
        "skill": "acquisition-tax",
        "args": [
            "multi-home",
            "--acquisition-price", "1000000000",
            "--home-count", "3",
            "--in-adjusted-area",
            "--area-sqm", "84",
        ],
        "assert": lambda r: r["applied_rate"] == 0.12 and r["heavy_tax_applied"] is True,
        "desc": "조정지역 1세대3주택 10억 → 12% 중과 (§13의2)",
    },
    {
        "id": "ACQ-05",
        "skill": "acquisition-tax",
        "args": ["general", "--acquisition-price", "750000000", "--area-sqm", "84"],
        "assert": lambda r: r["applied_rate"] == 0.02 and r["acquisition_tax"] == 15000000,
        "desc": "6~9억 구간 7.5억 → 공식세율 2% → 취득세 1,500만원 (§11①8)",
    },
    # year-end-settlement (세무 — 2026 귀속)
    {
        "id": "YES-01",
        "skill": "year-end-settlement",
        "args": ["calculate", "--total-salary", "50000000", "--withheld-tax", "1000000"],
        "assert": lambda r: r["final_tax"] > 0 and r["total_salary"] == 50000000,
        "desc": "연말정산 기본 로직: 총급여 5천만·자녀 0명 → 결정세액 양수",
    },
    {
        "id": "YES-02",
        "skill": "year-end-settlement",
        "args": [
            "calculate",
            "--total-salary", "60000000",
            "--dependents", "1",
            "--children-age-8-20", "1",
            "--pension-savings", "6000000",
            "--withheld-tax", "4000000",
        ],
        "assert": lambda r: r["refund_or_additional"] > 0,
        "desc": "연말정산 환급: 총급여 6천만·부양 1·자녀 1·연금 600만·기납부 400만 → 환급",
    },
    {
        "id": "YES-03",
        "skill": "year-end-settlement",
        "args": [
            "calculate",
            "--total-salary", "50000000",
            "--children-age-8-20", "3",
            "--withheld-tax", "1000000",
        ],
        "assert": lambda r: r["tax_credits"]["child_tax_credit"] == 950000,
        "desc": "자녀세액공제 3명 = 25만+30만+40만 = 95만 (2026 인상)",
    },
    {
        "id": "YES-04",
        "skill": "year-end-settlement",
        "args": ["deduction-table"],
        "assert": lambda r: len(r.get("items", [])) >= 10,
        "desc": "deduction-table 최소 10개 공제 항목 포함",
    },
    # inheritance-gift-tax (세무 — 상속·증여)
    {
        "id": "IGT-01",
        "skill": "inheritance-gift-tax",
        "args": [
            "inheritance",
            "--estate", "2000000000",
            "--spouse-deduction", "500000000",
            "--lump-sum-deduction", "500000000",
        ],
        "assert": lambda r: r["taxable_base"] == 1000000000 and r["calculated_tax"] == 240000000,
        "desc": "상속 20억·배우자 5억·일괄 5억 → 과세 10억 → 산출 2.4억 (10억×30%-6천만)",
    },
    {
        "id": "IGT-02",
        "skill": "inheritance-gift-tax",
        "args": [
            "gift",
            "--gift-amount", "100000000",
            "--relation", "lineal-descendant",
        ],
        "assert": lambda r: (
            r["applied_deduction"] == 50000000
            and r["taxable_base"] == 50000000
            and r["calculated_tax"] == 5000000
        ),
        "desc": "직계비속 증여 1억 → §53 공제 5천만 → 과세 5천만 → 산출 500만",
    },
    {
        "id": "IGT-03",
        "skill": "inheritance-gift-tax",
        "args": [
            "marriage-birth",
            "--gift-amount", "150000000",
            "--marriage-deduction", "100000000",
        ],
        "assert": lambda r: (
            r["relation_deduction"]["applied"] == 50000000
            and r["marriage_birth_deduction"]["total_applied"] == 100000000
            and r["taxable_base"] == 0
            and r["calculated_tax"] == 0
        ),
        "desc": "혼인 전 직계존속 증여 1.5억 → §53 5천만 + §53의2 1억 = 1.5억 공제 → 과세 0",
    },
    {
        "id": "IGT-04",
        "skill": "inheritance-gift-tax",
        "args": [
            "marriage-birth",
            "--gift-amount", "250000000",
            "--marriage-deduction", "100000000",
            "--birth-deduction", "100000000",
        ],
        "assert": lambda r: (
            r["marriage_birth_deduction"]["sum_requested"] == 200000000
            and r["marriage_birth_deduction"]["total_applied"] == 100000000
            and len(r.get("warnings", [])) >= 1
        ),
        "desc": "혼인 1억 + 출산 1억 합산 2억 요청 → §53의2③ 1억 한도 적용, warnings 출력",
    },
    # comprehensive-real-estate-tax (세무 — 종합부동산세)
    {
        "id": "CRE-01",
        "skill": "comprehensive-real-estate-tax",
        "args": ["single-home-senior", "--published-price", "2000000000"],
        "assert": lambda r: r["tax_base"] == 480000000 and r["base_tax"] == 2760000 and r["tax"] == 2760000,
        "desc": "1세대1주택 공시 20억·공제없음 → 과표 4.8억·기본세액 276만 (150만+1.8억×0.7%)",
    },
    {
        "id": "CRE-02",
        "skill": "comprehensive-real-estate-tax",
        "args": ["household", "--published-price", "3000000000"],
        "assert": lambda r: r["tax_base"] == 1260000000 and r["tax"] == 10380000,
        "desc": "2주택 공시 합 30억 일반 → 과표 12.6억·세액 1,038만 (960만+0.6억×1.3%)",
    },
    {
        "id": "CRE-03",
        "skill": "comprehensive-real-estate-tax",
        "args": ["multi-home", "--published-price", "3000000000"],
        "assert": lambda r: r["tax_base"] == 1260000000 and r["tax"] == 10800000 and r["marginal_rate"] == 0.020,
        "desc": "3주택 공시 합 30억 → 과표 12.6억·12억 초과 2.0% 중과 → 세액 1,080만 (960만+0.6억×2.0%)",
    },
    {
        "id": "CRE-04",
        "skill": "comprehensive-real-estate-tax",
        "args": ["corporate", "--published-price", "2000000000"],
        "assert": lambda r: r["tax_base"] == 1200000000 and r["tax"] == 32400000 and r["applied_rate"] == 0.027,
        "desc": "법인 2주택 공시 20억·공제 0 → 과표 12억 × 2.7% = 3,240만",
    },
    {
        "id": "CRE-05",
        "skill": "comprehensive-real-estate-tax",
        "args": [
            "single-home-senior",
            "--published-price", "2000000000",
            "--age", "70",
            "--holding-years", "10",
        ],
        "assert": lambda r: (
            r["base_tax"] == 2760000
            and r["combined_credit_rate"] == 0.80
            and r["tax"] == 552000
        ),
        "desc": "1세대1주택 70세·10년 보유 공시 20억 → 기본 276만 × 20%(한도 80%) = 55.2만",
    },
    # shareholder-meeting-minutes (법무 — 주주총회 의사록)
    {
        "id": "SMM-01",
        "skill": "shareholder-meeting-minutes",
        "args": [
            "quorum", "--type", "ordinary",
            "--total-shares", "1000", "--present-shares", "600",
            "--affirmative-shares", "400",
        ],
        "assert": lambda r: (
            r["passed"] is True
            and r["present_requirement"]["met"] is True
            and r["total_requirement"]["met"] is True
            and r["resolution_type"] == "ordinary"
        ),
        "desc": "보통결의 가결: 발행 1000·출석 600·찬성 400 (출석 과반 300초과 ✓, 총수 1/4=250 ✓)",
    },
    {
        "id": "SMM-02",
        "skill": "shareholder-meeting-minutes",
        "args": [
            "quorum", "--type", "special",
            "--total-shares", "1000", "--present-shares", "500",
            "--affirmative-shares", "335",
        ],
        "assert": lambda r: (
            r["passed"] is True
            and r["present_requirement"]["met"] is True
            and r["total_requirement"]["met"] is True
        ),
        "desc": "특별결의 가결(경계값): 발행 1000·출석 500·찬성 335 (출석 2/3=333.3 ✓, 총수 1/3=333.3 ✓)",
    },
    {
        "id": "SMM-03",
        "skill": "shareholder-meeting-minutes",
        "args": [
            "quorum", "--type", "special",
            "--total-shares", "1000", "--present-shares", "500",
            "--affirmative-shares", "330",
        ],
        "assert": lambda r: (
            r["passed"] is False
            and r["present_requirement"]["met"] is False
            and r["total_requirement"]["met"] is False
        ),
        "desc": "특별결의 부결: 발행 1000·출석 500·찬성 330 (출석 2/3=333.3 미달, 총수 1/3 미달)",
    },
    {
        "id": "SMM-04",
        "skill": "shareholder-meeting-minutes",
        "args": ["notice-deadline", "--meeting-date", "2026-05-15"],
        "assert": lambda r: (
            r["notice_days"] == 14
            and r["deadline_date"] == "2026-05-01"
        ),
        "desc": "소집통지 마감(일반): 주총 2026-05-15, 자본금 10억+ → 2026-05-01 (14일 전)",
    },
    {
        "id": "SMM-05",
        "skill": "shareholder-meeting-minutes",
        "args": [
            "notice-deadline", "--meeting-date", "2026-05-15",
            "--capital-under-1bn",
        ],
        "assert": lambda r: (
            r["notice_days"] == 10
            and r["deadline_date"] == "2026-05-05"
        ),
        "desc": "소집통지 마감(소규모): 주총 2026-05-15, 자본금 10억↓ → 2026-05-05 (10일 전, §363⑤)",
    },
]


def main():
    print(f"\n{'='*60}\nlbiz-ai-kit — Skill Validation\n{'='*60}\n")
    pass_count = fail_count = 0

    print("[1] Frontmatter checks:")
    for skill_dir in sorted(SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        ok, msg = check_frontmatter(skill_dir)
        if ok:
            print(f"  ✅ {skill_dir.name}")
            pass_count += 1
        else:
            print(f"  ❌ {msg}")
            fail_count += 1

    print(f"\n[2] Scenario tests ({len(SCENARIOS)}):")
    for sc in SCENARIOS:
        try:
            result = run_calculator(sc["skill"], sc["args"], sc.get("_cli_path", "references/calculator.py"))
            ok = sc["assert"](result)
        except Exception as e:
            ok = False
            result = {"error": str(e)}
        if ok:
            print(f"  ✅ {sc['id']} {sc['desc']}")
            pass_count += 1
        else:
            print(f"  ❌ {sc['id']} {sc['desc']}\n     → {result}")
            fail_count += 1

    total = pass_count + fail_count
    print(f"\n{'='*60}\nResult: {pass_count}/{total} PASS ({fail_count} FAIL)\n{'='*60}\n")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
