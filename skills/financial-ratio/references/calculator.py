#!/usr/bin/env python3
"""
재무비율 분석기 — 일반 재무회계 원리 + 금융감독원 재무비율 가이드

카테고리:
  liquidity     : 유동성 (유동비율·당좌비율·현금비율)
  leverage      : 안정성 (부채비율·자기자본비율·이자보상배율)
  profitability : 수익성 (매출순이익률·영업이익률·ROA·ROE)
  activity      : 활동성 (회전율·회수일·재고일수)
  overall       : 위 4개 종합 + 경보 플래그

CLI:
  python3 calculator.py liquidity --current-assets 150000000 --current-liabilities 100000000
  python3 calculator.py overall --current-assets ... --total-debt ... (모든 플래그 허용)

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 비율은 percent(%) 소수점 2자리, 회전율은 배수 소수점 2자리
  - JSON 출력: ensure_ascii=False, indent=2
  - 제조업 표준치 기준. 업종별 차이 극심 — SKILL.md 한계 참고
"""

import argparse
import json
import sys

# ─── 표준치 상수 (제조업 기준, 금융감독원 가이드 + 일반 회계원리) ────────────────
# 2026-04-14 팩트체크 기준
CURRENT_RATIO_GOOD = 200.0       # % 이상 양호
CURRENT_RATIO_WARN = 150.0       # % 미만 주의
QUICK_RATIO_GOOD = 100.0         # % 이상 양호
DEBT_RATIO_GOOD = 100.0          # % 이하 양호
DEBT_RATIO_DANGER = 200.0        # % 이상 위험
EQUITY_RATIO_GOOD = 50.0         # % 이상 양호
INTEREST_COVERAGE_GOOD = 3.0     # 배 이상 양호
INTEREST_COVERAGE_DANGER = 1.0   # 배 미만 한계기업
ROE_GOOD = 10.0                  # % 이상 우수
ROE_POOR = 5.0                   # % 미만 저조
ROA_GOOD = 5.0                   # % 이상 양호
ROA_POOR = 2.0                   # % 미만 저조

DISCLAIMER = (
    "업종·기업 특성에 따라 표준치 다름. 동종업계 평균 비교 권장."
)

DAYS_PER_YEAR = 365


# ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _pct(num: float, den: float) -> float | None:
    """비율(%)을 소수점 2자리로 반환. 분모 0이면 None."""
    if den == 0:
        return None
    return round((num / den) * 100, 2)


def _ratio(num: float, den: float) -> float | None:
    """배수(회전율 등)를 소수점 2자리로 반환. 분모 0이면 None."""
    if den == 0:
        return None
    return round(num / den, 2)


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

def calc_liquidity(
    current_assets: int,
    current_liabilities: int,
    inventory: int = 0,
    cash_and_equiv: int = 0,
) -> dict:
    """유동성 비율 — 유동·당좌·현금."""
    if current_liabilities <= 0:
        return {"error": "current_liabilities must be > 0"}

    current_ratio = _pct(current_assets, current_liabilities)
    quick_ratio = _pct(current_assets - inventory, current_liabilities)
    cash_ratio = (
        _pct(cash_and_equiv, current_liabilities) if cash_and_equiv > 0 else None
    )

    notes = []
    if current_ratio is not None:
        if current_ratio >= CURRENT_RATIO_GOOD:
            notes.append(f"유동비율 {current_ratio}% — 양호 (200% 이상)")
        elif current_ratio >= CURRENT_RATIO_WARN:
            notes.append(f"유동비율 {current_ratio}% — 보통 (150~200%)")
        else:
            notes.append(f"유동비율 {current_ratio}% — 주의 (150% 미만, 단기 유동성 부족)")
    if quick_ratio is not None:
        if quick_ratio >= QUICK_RATIO_GOOD:
            notes.append(f"당좌비율 {quick_ratio}% — 양호 (100% 이상)")
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
        "disclaimer": DISCLAIMER,
    }


def calc_leverage(
    total_debt: int,
    total_equity: int,
    total_assets: int,
    ebit: int,
    interest_expense: int,
) -> dict:
    """안정성 비율 — 부채·자본·이자보상."""
    if total_equity <= 0:
        return {"error": "total_equity must be > 0"}
    if total_assets <= 0:
        return {"error": "total_assets must be > 0"}

    debt_ratio = _pct(total_debt, total_assets)             # 부채/자산
    debt_to_equity = _pct(total_debt, total_equity)          # 부채/자본
    equity_ratio = _pct(total_equity, total_assets)          # 자기자본/자산
    interest_coverage = (
        _ratio(ebit, interest_expense) if interest_expense > 0 else None
    )

    notes = []
    if debt_to_equity is not None:
        if debt_to_equity <= DEBT_RATIO_GOOD:
            notes.append(f"부채비율 {debt_to_equity}% — 양호 (100% 이하)")
        elif debt_to_equity >= DEBT_RATIO_DANGER:
            notes.append(f"부채비율 {debt_to_equity}% — 위험 (200% 이상, 재무구조 개선 필요)")
        else:
            notes.append(f"부채비율 {debt_to_equity}% — 보통 (100~200%)")
    if equity_ratio is not None:
        if equity_ratio >= EQUITY_RATIO_GOOD:
            notes.append(f"자기자본비율 {equity_ratio}% — 양호 (50% 이상)")
        else:
            notes.append(f"자기자본비율 {equity_ratio}% — 주의 (50% 미만)")
    if interest_coverage is not None:
        if interest_coverage >= INTEREST_COVERAGE_GOOD:
            notes.append(f"이자보상배율 {interest_coverage}배 — 양호 (3배 이상)")
        elif interest_coverage < INTEREST_COVERAGE_DANGER:
            notes.append(f"이자보상배율 {interest_coverage}배 — 위험 (1배 미만, 한계기업 가능성)")
        else:
            notes.append(f"이자보상배율 {interest_coverage}배 — 보통 (1~3배)")

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
        "disclaimer": DISCLAIMER,
    }


def calc_profitability(
    net_income: int,
    revenue: int,
    total_assets: int,
    total_equity: int,
    operating_income: int = 0,
) -> dict:
    """수익성 비율 — 순이익률·영업이익률·ROA·ROE."""
    if revenue <= 0:
        return {"error": "revenue must be > 0"}
    if total_assets <= 0:
        return {"error": "total_assets must be > 0"}
    if total_equity <= 0:
        return {"error": "total_equity must be > 0"}

    net_profit_margin = _pct(net_income, revenue)
    operating_margin = (
        _pct(operating_income, revenue) if operating_income else None
    )
    roa = _pct(net_income, total_assets)
    roe = _pct(net_income, total_equity)

    notes = []
    if net_profit_margin is not None:
        notes.append(f"매출순이익률 {net_profit_margin}%")
    if operating_margin is not None:
        notes.append(f"영업이익률 {operating_margin}%")
    if roa is not None:
        if roa >= ROA_GOOD:
            notes.append(f"ROA {roa}% — 양호 (5% 이상)")
        elif roa < ROA_POOR:
            notes.append(f"ROA {roa}% — 저조 (2% 미만)")
        else:
            notes.append(f"ROA {roa}% — 보통")
    if roe is not None:
        if roe >= ROE_GOOD:
            notes.append(f"ROE {roe}% — 우수 (10% 이상)")
        elif roe < ROE_POOR:
            notes.append(f"ROE {roe}% — 저조 (5% 미만)")
        else:
            notes.append(f"ROE {roe}% — 보통 (5~10%)")

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
        "disclaimer": DISCLAIMER,
    }


def calc_activity(
    revenue: int,
    total_assets: int,
    inventory: int,
    accounts_receivable: int,
    cogs: int,
) -> dict:
    """활동성 비율 — 자산·재고·매출채권 회전율."""
    if total_assets <= 0:
        return {"error": "total_assets must be > 0"}

    asset_turnover = _ratio(revenue, total_assets)
    inventory_turnover = _ratio(cogs, inventory) if inventory > 0 else None
    ar_turnover = (
        _ratio(revenue, accounts_receivable) if accounts_receivable > 0 else None
    )
    dso = (
        round(DAYS_PER_YEAR / ar_turnover, 2)
        if ar_turnover and ar_turnover > 0 else None
    )
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
        "disclaimer": DISCLAIMER,
    }


def calc_overall(
    current_assets: int,
    current_liabilities: int,
    total_debt: int,
    total_equity: int,
    total_assets: int,
    ebit: int,
    interest_expense: int,
    net_income: int,
    revenue: int,
    operating_income: int,
    inventory: int,
    accounts_receivable: int,
    cogs: int,
    cash_and_equiv: int = 0,
) -> dict:
    """4개 카테고리 종합 + 경보 플래그."""
    liquidity = calc_liquidity(
        current_assets, current_liabilities, inventory, cash_and_equiv,
    )
    leverage = calc_leverage(
        total_debt, total_equity, total_assets, ebit, interest_expense,
    )
    profitability = calc_profitability(
        net_income, revenue, total_assets, total_equity, operating_income,
    )
    activity = calc_activity(
        revenue, total_assets, inventory, accounts_receivable, cogs,
    )

    flags: list[str] = []

    cr = liquidity.get("current_ratio")
    if cr is not None and cr < CURRENT_RATIO_WARN:
        flags.append(f"유동비율 {cr}% — 단기 지급능력 주의 (150% 미만)")

    qr = liquidity.get("quick_ratio")
    if qr is not None and qr < QUICK_RATIO_GOOD:
        flags.append(f"당좌비율 {qr}% — 재고 제외 시 유동성 부족 (100% 미만)")

    de = leverage.get("debt_to_equity")
    if de is not None and de >= DEBT_RATIO_DANGER:
        flags.append(f"부채비율 과다({de}%) — 재무구조 개선 필요")

    ic = leverage.get("interest_coverage")
    if ic is not None and ic < INTEREST_COVERAGE_DANGER:
        flags.append(f"이자보상배율 {ic}배 — 한계기업 가능성 (1배 미만)")

    er = leverage.get("equity_ratio")
    if er is not None and er < EQUITY_RATIO_GOOD:
        flags.append(f"자기자본비율 {er}% — 자본 취약 (50% 미만)")

    roe = profitability.get("roe")
    if roe is not None and roe < ROE_POOR:
        flags.append(f"ROE {roe}% — 자기자본 수익성 저조 (5% 미만)")

    roa = profitability.get("roa")
    if roa is not None and roa < ROA_POOR:
        flags.append(f"ROA {roa}% — 총자산 수익성 저조 (2% 미만)")

    # 종합 요약
    summary_parts = []
    if cr is not None:
        summary_parts.append(f"유동비율 {cr}%")
    if de is not None:
        summary_parts.append(f"부채비율 {de}%")
    if roe is not None:
        summary_parts.append(f"ROE {roe}%")
    if ic is not None:
        summary_parts.append(f"이자보상 {ic}배")
    summary = (
        " · ".join(summary_parts)
        + (f" — 경보 {len(flags)}건" if flags else " — 특이 경보 없음")
    )

    return {
        "category": "overall",
        "liquidity": liquidity,
        "leverage": leverage,
        "profitability": profitability,
        "activity": activity,
        "summary": summary,
        "flags": flags,
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="재무비율 분석기 (유동성·안정성·수익성·활동성)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # liquidity
    p_liq = sub.add_parser("liquidity", help="유동성 비율 (유동·당좌·현금)")
    p_liq.add_argument("--current-assets", type=int, required=True, help="유동자산 (원)")
    p_liq.add_argument("--current-liabilities", type=int, required=True, help="유동부채 (원)")
    p_liq.add_argument("--inventory", type=int, default=0, help="재고자산 (원, 당좌비율 계산용)")
    p_liq.add_argument("--cash-and-equiv", type=int, default=0, help="현금및현금성자산 (원)")

    # leverage
    p_lev = sub.add_parser("leverage", help="안정성 비율 (부채·자본·이자보상)")
    p_lev.add_argument("--total-debt", type=int, required=True, help="총부채 (원)")
    p_lev.add_argument("--total-equity", type=int, required=True, help="자기자본 (원)")
    p_lev.add_argument("--total-assets", type=int, required=True, help="총자산 (원)")
    p_lev.add_argument("--ebit", type=int, required=True, help="영업이익(EBIT) (원)")
    p_lev.add_argument("--interest-expense", type=int, required=True, help="이자비용 (원)")

    # profitability
    p_prof = sub.add_parser("profitability", help="수익성 비율 (마진·ROA·ROE)")
    p_prof.add_argument("--net-income", type=int, required=True, help="당기순이익 (원)")
    p_prof.add_argument("--revenue", type=int, required=True, help="매출액 (원)")
    p_prof.add_argument("--total-assets", type=int, required=True, help="총자산 (원)")
    p_prof.add_argument("--total-equity", type=int, required=True, help="자기자본 (원)")
    p_prof.add_argument("--operating-income", type=int, default=0, help="영업이익 (원, 영업이익률 계산용)")

    # activity
    p_act = sub.add_parser("activity", help="활동성 비율 (회전율·회수일)")
    p_act.add_argument("--revenue", type=int, required=True, help="매출액 (원)")
    p_act.add_argument("--total-assets", type=int, required=True, help="총자산 (원)")
    p_act.add_argument("--inventory", type=int, required=True, help="재고자산 (원)")
    p_act.add_argument("--accounts-receivable", type=int, required=True, help="매출채권 (원)")
    p_act.add_argument("--cogs", type=int, required=True, help="매출원가 (원)")

    # overall
    p_all = sub.add_parser("overall", help="4개 카테고리 종합 + 경보 플래그")
    p_all.add_argument("--current-assets", type=int, required=True)
    p_all.add_argument("--current-liabilities", type=int, required=True)
    p_all.add_argument("--total-debt", type=int, required=True)
    p_all.add_argument("--total-equity", type=int, required=True)
    p_all.add_argument("--total-assets", type=int, required=True)
    p_all.add_argument("--ebit", type=int, required=True)
    p_all.add_argument("--interest-expense", type=int, required=True)
    p_all.add_argument("--net-income", type=int, required=True)
    p_all.add_argument("--revenue", type=int, required=True)
    p_all.add_argument("--operating-income", type=int, required=True)
    p_all.add_argument("--inventory", type=int, required=True)
    p_all.add_argument("--accounts-receivable", type=int, required=True)
    p_all.add_argument("--cogs", type=int, required=True)
    p_all.add_argument("--cash-and-equiv", type=int, default=0)

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "liquidity":
        result = calc_liquidity(
            current_assets=args.current_assets,
            current_liabilities=args.current_liabilities,
            inventory=args.inventory,
            cash_and_equiv=args.cash_and_equiv,
        )
    elif args.cmd == "leverage":
        result = calc_leverage(
            total_debt=args.total_debt,
            total_equity=args.total_equity,
            total_assets=args.total_assets,
            ebit=args.ebit,
            interest_expense=args.interest_expense,
        )
    elif args.cmd == "profitability":
        result = calc_profitability(
            net_income=args.net_income,
            revenue=args.revenue,
            total_assets=args.total_assets,
            total_equity=args.total_equity,
            operating_income=args.operating_income,
        )
    elif args.cmd == "activity":
        result = calc_activity(
            revenue=args.revenue,
            total_assets=args.total_assets,
            inventory=args.inventory,
            accounts_receivable=args.accounts_receivable,
            cogs=args.cogs,
        )
    elif args.cmd == "overall":
        result = calc_overall(
            current_assets=args.current_assets,
            current_liabilities=args.current_liabilities,
            total_debt=args.total_debt,
            total_equity=args.total_equity,
            total_assets=args.total_assets,
            ebit=args.ebit,
            interest_expense=args.interest_expense,
            net_income=args.net_income,
            revenue=args.revenue,
            operating_income=args.operating_income,
            inventory=args.inventory,
            accounts_receivable=args.accounts_receivable,
            cogs=args.cogs,
            cash_and_equiv=args.cash_and_equiv,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
