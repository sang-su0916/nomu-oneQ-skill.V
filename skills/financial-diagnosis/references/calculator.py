#!/usr/bin/env python3
"""
재무진단 종합 계산기 — financial-ratio + break-even 통합

목적:
  - 유동성·안정성·수익성·활동성 4개 카테고리 일괄 분석
  - 0-100 가중평균 스코어 + S/A/B/C/D 등급
  - 강점·약점·위험플래그·권장사항 자동 생성
  - 선택: BEP 통합 분석

모드: diagnose

CLI:
  python3 calculator.py diagnose \
    --current-assets 150000000 --current-liabilities 100000000 \
    --inventory 50000000 --accounts-receivable 80000000 \
    --total-debt 300000000 --total-equity 200000000 --total-assets 500000000 \
    --revenue 500000000 --net-income 15000000 --operating-income 25000000 --cogs 350000000 \
    --ebit 30000000 --interest-expense 10000000

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys, datetime)
  - 공식은 financial-ratio에서 직접 복사 (subprocess 회피)
  - 제조업 표준치 기준 스코어링
  - JSON 출력: ensure_ascii=False, indent=2
"""

import argparse
import json
import sys
from datetime import date

# ─── 표준치 상수 (financial-ratio와 동일) ─────────────────────────────────────
CURRENT_RATIO_GOOD = 200.0
CURRENT_RATIO_WARN = 150.0
QUICK_RATIO_GOOD = 100.0
DEBT_RATIO_GOOD = 100.0
DEBT_RATIO_DANGER = 200.0
EQUITY_RATIO_GOOD = 50.0
INTEREST_COVERAGE_GOOD = 3.0
INTEREST_COVERAGE_DANGER = 1.0
ROE_GOOD = 10.0
ROE_POOR = 5.0
ROA_GOOD = 5.0
ROA_POOR = 2.0

DAYS_PER_YEAR = 365

DISCLAIMER = (
    "업종·기업 특성에 따라 표준치 다름. 동종업계 평균 비교 권장. "
    "본 진단은 재무비율 단년 기준 참고치이며, 실제 투자·대출·M&A 판단은 "
    "회계사·재무전문가 검토가 필요합니다."
)


# ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _pct(num: float, den: float):
    if den == 0:
        return None
    return round((num / den) * 100, 2)


def _ratio(num: float, den: float):
    if den == 0:
        return None
    return round(num / den, 2)


# ─── 비율 계산 (financial-ratio 공식 직접 구현) ──────────────────────────────

def calc_liquidity(current_assets: int, current_liabilities: int,
                   inventory: int = 0, cash_and_equiv: int = 0) -> dict:
    if current_liabilities <= 0:
        return {"error": "current_liabilities must be > 0"}

    current_ratio = _pct(current_assets, current_liabilities)
    quick_ratio = _pct(current_assets - inventory, current_liabilities)
    cash_ratio = _pct(cash_and_equiv, current_liabilities) if cash_and_equiv > 0 else None

    notes = []
    if current_ratio is not None:
        if current_ratio >= CURRENT_RATIO_GOOD:
            notes.append(f"유동비율 {current_ratio}% — 양호 (200% 이상)")
        elif current_ratio >= CURRENT_RATIO_WARN:
            notes.append(f"유동비율 {current_ratio}% — 보통 (150~200%)")
        else:
            notes.append(f"유동비율 {current_ratio}% — 주의 (150% 미만)")
    if quick_ratio is not None:
        if quick_ratio >= QUICK_RATIO_GOOD:
            notes.append(f"당좌비율 {quick_ratio}% — 양호")
        else:
            notes.append(f"당좌비율 {quick_ratio}% — 주의 (100% 미만)")

    return {
        "category": "liquidity",
        "current_assets": current_assets,
        "current_liabilities": current_liabilities,
        "inventory": inventory,
        "cash_and_equiv": cash_and_equiv,
        "current_ratio": current_ratio,
        "quick_ratio": quick_ratio,
        "cash_ratio": cash_ratio,
        "interpretation": " / ".join(notes) if notes else "해석 불가",
    }


def calc_leverage(total_debt: int, total_equity: int, total_assets: int,
                  ebit: int, interest_expense: int) -> dict:
    if total_equity <= 0:
        return {"error": "total_equity must be > 0"}
    if total_assets <= 0:
        return {"error": "total_assets must be > 0"}

    debt_ratio = _pct(total_debt, total_assets)
    debt_to_equity = _pct(total_debt, total_equity)
    equity_ratio = _pct(total_equity, total_assets)
    interest_coverage = _ratio(ebit, interest_expense) if interest_expense > 0 else None

    notes = []
    if debt_to_equity is not None:
        if debt_to_equity <= DEBT_RATIO_GOOD:
            notes.append(f"부채비율 {debt_to_equity}% — 양호")
        elif debt_to_equity >= DEBT_RATIO_DANGER:
            notes.append(f"부채비율 {debt_to_equity}% — 위험 (200% 이상)")
        else:
            notes.append(f"부채비율 {debt_to_equity}% — 보통")
    if interest_coverage is not None:
        if interest_coverage >= INTEREST_COVERAGE_GOOD:
            notes.append(f"이자보상배율 {interest_coverage}배 — 양호")
        elif interest_coverage < INTEREST_COVERAGE_DANGER:
            notes.append(f"이자보상배율 {interest_coverage}배 — 위험 (1배 미만, 한계기업 가능성)")
        else:
            notes.append(f"이자보상배율 {interest_coverage}배 — 보통")

    return {
        "category": "leverage",
        "total_debt": total_debt,
        "total_equity": total_equity,
        "total_assets": total_assets,
        "ebit": ebit,
        "interest_expense": interest_expense,
        "debt_ratio": debt_ratio,
        "debt_to_equity": debt_to_equity,
        "equity_ratio": equity_ratio,
        "interest_coverage": interest_coverage,
        "interpretation": " / ".join(notes) if notes else "해석 불가",
    }


def calc_profitability(net_income: int, revenue: int, total_assets: int,
                       total_equity: int, operating_income: int = 0) -> dict:
    if revenue <= 0:
        return {"error": "revenue must be > 0"}
    if total_assets <= 0:
        return {"error": "total_assets must be > 0"}
    if total_equity <= 0:
        return {"error": "total_equity must be > 0"}

    net_profit_margin = _pct(net_income, revenue)
    operating_margin = _pct(operating_income, revenue) if operating_income else None
    roa = _pct(net_income, total_assets)
    roe = _pct(net_income, total_equity)

    notes = []
    if net_profit_margin is not None:
        notes.append(f"매출순이익률 {net_profit_margin}%")
    if operating_margin is not None:
        notes.append(f"영업이익률 {operating_margin}%")
    if roe is not None:
        if roe >= ROE_GOOD:
            notes.append(f"ROE {roe}% — 우수 (10% 이상)")
        elif roe < ROE_POOR:
            notes.append(f"ROE {roe}% — 저조 (5% 미만)")
        else:
            notes.append(f"ROE {roe}% — 보통")
    if roa is not None:
        if roa >= ROA_GOOD:
            notes.append(f"ROA {roa}% — 양호")
        elif roa < ROA_POOR:
            notes.append(f"ROA {roa}% — 저조")
        else:
            notes.append(f"ROA {roa}% — 보통")

    return {
        "category": "profitability",
        "net_income": net_income,
        "revenue": revenue,
        "total_assets": total_assets,
        "total_equity": total_equity,
        "operating_income": operating_income,
        "net_profit_margin": net_profit_margin,
        "operating_margin": operating_margin,
        "roa": roa,
        "roe": roe,
        "interpretation": " / ".join(notes) if notes else "해석 불가",
    }


def calc_activity(revenue: int, total_assets: int, inventory: int,
                  accounts_receivable: int, cogs: int) -> dict:
    if total_assets <= 0:
        return {"error": "total_assets must be > 0"}

    asset_turnover = _ratio(revenue, total_assets)
    inventory_turnover = _ratio(cogs, inventory) if inventory > 0 else None
    ar_turnover = _ratio(revenue, accounts_receivable) if accounts_receivable > 0 else None
    dso = round(DAYS_PER_YEAR / ar_turnover, 2) if ar_turnover and ar_turnover > 0 else None
    days_inventory = (
        round(DAYS_PER_YEAR / inventory_turnover, 2)
        if inventory_turnover and inventory_turnover > 0 else None
    )

    notes = []
    if asset_turnover is not None:
        notes.append(f"총자산회전율 {asset_turnover}회")
    if inventory_turnover is not None:
        notes.append(f"재고자산회전율 {inventory_turnover}회 (재고일수 {days_inventory}일)")
    if ar_turnover is not None:
        notes.append(f"매출채권회전율 {ar_turnover}회 (회수일 {dso}일)")

    return {
        "category": "activity",
        "revenue": revenue,
        "total_assets": total_assets,
        "inventory": inventory,
        "accounts_receivable": accounts_receivable,
        "cogs": cogs,
        "asset_turnover": asset_turnover,
        "inventory_turnover": inventory_turnover,
        "ar_turnover": ar_turnover,
        "days_sales_outstanding": dso,
        "days_inventory": days_inventory,
        "interpretation": " / ".join(notes) if notes else "해석 불가",
    }


def calc_break_even(fixed_cost: int, unit_price: int, unit_variable_cost: int) -> dict:
    """선택 BEP 계산 (옵션). 입력 미비 시 None 반환."""
    if unit_price <= 0 or unit_variable_cost < 0 or unit_price <= unit_variable_cost:
        return {"error": "BEP 입력 유효성 오류 (단가 > 변동비 필요)"}
    if fixed_cost < 0:
        return {"error": "고정비는 0 이상"}

    cm_per_unit = unit_price - unit_variable_cost
    cm_ratio = round(cm_per_unit / unit_price, 4)
    bep_units_exact = fixed_cost / cm_per_unit
    bep_units = int(bep_units_exact)
    if bep_units_exact != bep_units:
        bep_units += 1
    bep_revenue = bep_units * unit_price

    return {
        "category": "break_even",
        "fixed_cost": fixed_cost,
        "unit_price": unit_price,
        "unit_variable_cost": unit_variable_cost,
        "contribution_margin_per_unit": cm_per_unit,
        "contribution_margin_ratio": cm_ratio,
        "bep_units": bep_units,
        "bep_revenue": bep_revenue,
        "interpretation": f"BEP {bep_units:,}개 · 매출 {bep_revenue:,}원 (공헌이익률 {cm_ratio*100:.2f}%)",
    }


# ─── 스코어링 로직 (가중평균) ─────────────────────────────────────────────────

def _score_liquidity(current_ratio) -> int:
    if current_ratio is None:
        return 50
    if current_ratio >= 200:
        return 100
    if current_ratio >= 150:
        return 75
    if current_ratio >= 100:
        return 50
    return 25


def _score_leverage(debt_to_equity) -> int:
    if debt_to_equity is None:
        return 50
    if debt_to_equity <= 100:
        return 100
    if debt_to_equity <= 200:
        return 70
    if debt_to_equity <= 300:
        return 40
    return 20


def _score_profitability(roe) -> int:
    if roe is None:
        return 50
    if roe >= 10:
        return 100
    if roe >= 5:
        return 70
    if roe >= 0:
        return 40
    return 20  # 적자


def _score_interest_coverage(ic) -> int:
    if ic is None:
        return 50
    if ic >= 3:
        return 100
    if ic >= 1:
        return 60
    return 20


def _grade(score: int) -> str:
    if score >= 90:
        return "S (탁월)"
    if score >= 75:
        return "A (우수)"
    if score >= 60:
        return "B (양호)"
    if score >= 45:
        return "C (주의)"
    return "D (위험)"


# ─── 강점·약점·플래그·권장사항 자동 생성 ──────────────────────────────────────

def _strengths(liq, lev, prof, act) -> list:
    s = []
    cr = liq.get("current_ratio")
    if cr is not None and cr >= CURRENT_RATIO_GOOD:
        s.append(f"유동비율 {cr}% 초과 우수 (단기 지급능력 양호)")
    qr = liq.get("quick_ratio")
    if qr is not None and qr >= QUICK_RATIO_GOOD:
        s.append(f"당좌비율 {qr}% 우수 (재고 의존 없는 유동성 확보)")
    de = lev.get("debt_to_equity")
    if de is not None and de <= DEBT_RATIO_GOOD:
        s.append(f"부채비율 {de}% 건전 (100% 이하)")
    er = lev.get("equity_ratio")
    if er is not None and er >= EQUITY_RATIO_GOOD:
        s.append(f"자기자본비율 {er}% 양호")
    ic = lev.get("interest_coverage")
    if ic is not None and ic >= INTEREST_COVERAGE_GOOD:
        s.append(f"이자보상배율 {ic}배 우수 (3배 이상)")
    roe = prof.get("roe")
    if roe is not None and roe >= ROE_GOOD:
        s.append(f"ROE {roe}% 우수 (10% 이상)")
    roa = prof.get("roa")
    if roa is not None and roa >= ROA_GOOD:
        s.append(f"ROA {roa}% 양호 (5% 이상)")
    return s


def _weaknesses(liq, lev, prof, act) -> list:
    w = []
    cr = liq.get("current_ratio")
    if cr is not None and cr < CURRENT_RATIO_WARN:
        w.append(f"유동비율 {cr}% 미흡 (150% 미만)")
    qr = liq.get("quick_ratio")
    if qr is not None and qr < QUICK_RATIO_GOOD:
        w.append(f"당좌비율 {qr}% 부족 (재고 제외 유동성 취약)")
    de = lev.get("debt_to_equity")
    if de is not None and de >= DEBT_RATIO_DANGER:
        w.append(f"부채비율 {de}% 과다 (200% 이상)")
    ic = lev.get("interest_coverage")
    if ic is not None and ic < INTEREST_COVERAGE_GOOD:
        w.append(f"이자보상배율 {ic}배 주의 (3배 미만)")
    er = lev.get("equity_ratio")
    if er is not None and er < EQUITY_RATIO_GOOD:
        w.append(f"자기자본비율 {er}% 취약")
    roe = prof.get("roe")
    if roe is not None and roe < ROE_POOR:
        w.append(f"ROE {roe}% 저조 (5% 미만)")
    roa = prof.get("roa")
    if roa is not None and roa < ROA_POOR:
        w.append(f"ROA {roa}% 저조 (2% 미만)")
    dso = act.get("days_sales_outstanding")
    if dso is not None and dso > 60:
        w.append(f"매출채권회수일 {dso}일 과다 (60일 초과)")
    return w


def _risk_flags(liq, lev, prof) -> list:
    flags = []
    ic = lev.get("interest_coverage")
    if ic is not None and ic < INTEREST_COVERAGE_DANGER:
        flags.append("한계기업 근접 (이자보상배율 1배 미만)")
    de = lev.get("debt_to_equity")
    if de is not None and de >= 300:
        flags.append("부채비율 300% 초과 — 재무구조 심각")
    cr = liq.get("current_ratio")
    if cr is not None and cr < 100:
        flags.append("유동비율 100% 미만 — 단기 지급불능 위험")
    roe = prof.get("roe")
    if roe is not None and roe < 0:
        flags.append("적자기업 (ROE 음수)")
    return flags


def _recommendations(liq, lev, prof, act) -> list:
    recs = []
    de = lev.get("debt_to_equity")
    if de is not None and de > DEBT_RATIO_DANGER:
        recs.append("자본확충 또는 부채 감축 필요 (부채비율 200% 초과)")
    cr = liq.get("current_ratio")
    if cr is not None and cr < 100:
        recs.append("단기 유동성 확보 시급 (유동비율 100% 미만)")
    ic = lev.get("interest_coverage")
    if ic is not None and ic < INTEREST_COVERAGE_DANGER:
        recs.append("영업활동에 의한 이자상환 불가 — 한계기업 위험, 영업이익 개선·차입 축소 동시 필요")
    roe = prof.get("roe")
    if roe is not None and roe < ROE_POOR:
        recs.append("수익성 개선 필요 (원가절감·마진 확대·비핵심자산 정리)")
    dso = act.get("days_sales_outstanding")
    if dso is not None and dso > 60:
        recs.append("매출채권 회수기일 단축 필요 (60일 초과)")
    inv_to = act.get("inventory_turnover")
    if inv_to is not None and inv_to < 4:
        recs.append("재고 과다 점검 필요 (재고자산회전율 4회 미만)")
    return recs


# ─── 메인 진단 함수 ────────────────────────────────────────────────────────────

def diagnose(
    current_assets: int,
    current_liabilities: int,
    inventory: int,
    accounts_receivable: int,
    total_debt: int,
    total_equity: int,
    total_assets: int,
    revenue: int,
    net_income: int,
    operating_income: int,
    cogs: int,
    ebit: int,
    interest_expense: int,
    fixed_cost: int = 0,
    unit_price: int = 0,
    unit_variable_cost: int = 0,
    cash_and_equiv: int = 0,
) -> dict:
    """종합 재무진단. 4개 카테고리 + 선택적 BEP + 스코어링."""

    liq = calc_liquidity(current_assets, current_liabilities, inventory, cash_and_equiv)
    lev = calc_leverage(total_debt, total_equity, total_assets, ebit, interest_expense)
    prof = calc_profitability(net_income, revenue, total_assets, total_equity, operating_income)
    act = calc_activity(revenue, total_assets, inventory, accounts_receivable, cogs)

    # 에러 조기 반환
    for r in (liq, lev, prof, act):
        if "error" in r:
            return {"error": r["error"]}

    bep = None
    if unit_price > 0 and unit_variable_cost > 0:
        bep = calc_break_even(fixed_cost, unit_price, unit_variable_cost)

    # 스코어링 (가중평균)
    s_liq = _score_liquidity(liq.get("current_ratio"))
    s_lev = _score_leverage(lev.get("debt_to_equity"))
    s_prof = _score_profitability(prof.get("roe"))
    s_ic = _score_interest_coverage(lev.get("interest_coverage"))

    overall_score = round(
        s_liq * 0.25 + s_lev * 0.30 + s_prof * 0.25 + s_ic * 0.20
    )
    grade = _grade(overall_score)

    strengths = _strengths(liq, lev, prof, act)
    weaknesses = _weaknesses(liq, lev, prof, act)
    risk_flags = _risk_flags(liq, lev, prof)
    recommendations = _recommendations(liq, lev, prof, act)

    # 요약 문장
    summary_bits = []
    cr = liq.get("current_ratio")
    de = lev.get("debt_to_equity")
    roe = prof.get("roe")
    ic = lev.get("interest_coverage")
    if cr is not None:
        summary_bits.append(f"유동비율 {cr}%")
    if de is not None:
        summary_bits.append(f"부채비율 {de}%")
    if roe is not None:
        summary_bits.append(f"ROE {roe}%")
    if ic is not None:
        summary_bits.append(f"이자보상 {ic}배")
    summary = (
        f"종합점수 {overall_score}점 · 등급 {grade} — "
        + " · ".join(summary_bits)
        + (f" (경보 {len(risk_flags)}건)" if risk_flags else " (경보 없음)")
    )

    result = {
        "diagnosis_date": date.today().isoformat(),
        "liquidity": liq,
        "leverage": lev,
        "profitability": prof,
        "activity": act,
        "overall_score": overall_score,
        "grade": grade,
        "score_breakdown": {
            "liquidity_25pct": s_liq,
            "leverage_30pct": s_lev,
            "profitability_25pct": s_prof,
            "interest_coverage_20pct": s_ic,
        },
        "strengths": strengths,
        "weaknesses": weaknesses,
        "risk_flags": risk_flags,
        "recommendations": recommendations,
        "summary": summary,
        "disclaimer": DISCLAIMER,
    }
    if bep is not None:
        result["break_even"] = bep
    return result


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="재무진단 종합 (유동성·안정성·수익성·활동성 + 스코어·등급·권고)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("diagnose", help="종합 재무진단 (0-100 점수 + S/A/B/C/D 등급)")
    # 재무상태표
    p.add_argument("--current-assets", type=int, required=True, help="유동자산 (원)")
    p.add_argument("--current-liabilities", type=int, required=True, help="유동부채 (원)")
    p.add_argument("--inventory", type=int, required=True, help="재고자산 (원)")
    p.add_argument("--accounts-receivable", type=int, required=True, help="매출채권 (원)")
    p.add_argument("--total-debt", type=int, required=True, help="총부채 (원)")
    p.add_argument("--total-equity", type=int, required=True, help="자기자본 (원)")
    p.add_argument("--total-assets", type=int, required=True, help="총자산 (원)")
    # 손익계산서
    p.add_argument("--revenue", type=int, required=True, help="매출액 (원)")
    p.add_argument("--net-income", type=int, required=True, help="당기순이익 (원)")
    p.add_argument("--operating-income", type=int, required=True, help="영업이익 (원)")
    p.add_argument("--cogs", type=int, required=True, help="매출원가 (원)")
    p.add_argument("--ebit", type=int, required=True, help="EBIT (원)")
    p.add_argument("--interest-expense", type=int, required=True, help="이자비용 (원)")
    # 선택 (BEP)
    p.add_argument("--fixed-cost", type=int, default=0, help="고정비 (원, BEP용)")
    p.add_argument("--unit-price", type=int, default=0, help="단위판매가 (원, BEP용)")
    p.add_argument("--unit-variable-cost", type=int, default=0, help="단위변동비 (원, BEP용)")
    p.add_argument("--cash-and-equiv", type=int, default=0, help="현금및현금성자산 (원, 현금비율용)")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "diagnose":
        result = diagnose(
            current_assets=args.current_assets,
            current_liabilities=args.current_liabilities,
            inventory=args.inventory,
            accounts_receivable=args.accounts_receivable,
            total_debt=args.total_debt,
            total_equity=args.total_equity,
            total_assets=args.total_assets,
            revenue=args.revenue,
            net_income=args.net_income,
            operating_income=args.operating_income,
            cogs=args.cogs,
            ebit=args.ebit,
            interest_expense=args.interest_expense,
            fixed_cost=args.fixed_cost,
            unit_price=args.unit_price,
            unit_variable_cost=args.unit_variable_cost,
            cash_and_equiv=args.cash_and_equiv,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
