#!/usr/bin/env python3
"""
손익분기점(BEP) 계산기 — CVP(원가-조업도-이익) 분석

공식:
  단위공헌이익 = 단위판매가 - 단위변동비
  공헌이익률  = 단위공헌이익 / 단위판매가
  BEP 수량    = 고정비 / 단위공헌이익
  BEP 매출    = 고정비 / 공헌이익률
  목표이익 달성 수량 = (고정비 + 목표이익) / 단위공헌이익
  안전한계율  = (실제매출 - BEP매출) / 실제매출
  영업레버리지 = 공헌이익 / 영업이익

모드: calculate | margin-of-safety | operating-leverage

CLI:
  python3 calculator.py calculate --fixed-cost 100000000 --unit-price 10000 --unit-variable-cost 6000
  python3 calculator.py margin-of-safety --actual-revenue 300000000 --bep-revenue 250000000
  python3 calculator.py operating-leverage --contribution-margin 120000000 --operating-income 20000000

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 금액은 int (원 단위 절사), 비율은 float (소수점 4자리)
  - JSON 출력: ensure_ascii=False, indent=2
  - 단일제품·선형 비용구조 가정 (SKILL.md 한계 참고)
"""

import argparse
import json
import sys


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

DISCLAIMER = (
    "단일제품·선형 비용구조 가정. "
    "다품목은 가중평균 공헌이익률로 별도 계산."
)


def calculate_bep(
    fixed_cost: int,
    unit_price: int,
    unit_variable_cost: int,
    target_profit: int = 0,
) -> dict:
    """
    손익분기점(BEP) 및 목표이익 달성 수량 계산.

    Args:
        fixed_cost: 고정비 (원)
        unit_price: 단위판매가 (원)
        unit_variable_cost: 단위변동비 (원)
        target_profit: 목표이익 (원, 기본값 0)

    Returns:
        dict: BEP 수량·매출·목표 수량·매출·해석 포함
    """
    if unit_price <= 0:
        return {"error": "단위판매가는 양수여야 합니다"}
    if unit_variable_cost < 0:
        return {"error": "단위변동비는 0 이상이어야 합니다"}
    if unit_price <= unit_variable_cost:
        return {"error": "단위판매가는 단위변동비보다 커야 합니다 (공헌이익 > 0)"}
    if fixed_cost < 0:
        return {"error": "고정비는 0 이상이어야 합니다"}
    if target_profit < 0:
        return {"error": "목표이익은 0 이상이어야 합니다"}

    # 핵심 공식
    contribution_margin_per_unit = unit_price - unit_variable_cost
    contribution_margin_ratio = round(
        contribution_margin_per_unit / unit_price, 4
    )

    bep_units = int(fixed_cost / contribution_margin_per_unit)
    # BEP 수량이 정수가 아닐 경우 올림 (손익분기 달성 최소 수량)
    import math
    bep_units_exact = fixed_cost / contribution_margin_per_unit
    if bep_units_exact != bep_units:
        bep_units = math.ceil(bep_units_exact)

    bep_revenue = int(fixed_cost / contribution_margin_ratio)

    target_units_exact = (fixed_cost + target_profit) / contribution_margin_per_unit
    target_units = math.ceil(target_units_exact)
    target_revenue = int(target_units * unit_price)

    # 해석 문장 (단위: 만/억 자동 포맷)
    def _fmt(n: int) -> str:
        if n >= 1_0000_0000:
            return f"{n / 1_0000_0000:.1f}억원"
        if n >= 1_0000:
            return f"{n // 1_0000}만원"
        return f"{n:,}원"

    interpretation = (
        f"월간 {bep_units:,}개 판매(매출 {_fmt(bep_revenue)}) 시 손익분기."
    )
    if target_profit > 0:
        interpretation += (
            f" 목표이익 {_fmt(target_profit)} 달성에는 월 {target_units:,}개 필요."
        )

    return {
        "fixed_cost": fixed_cost,
        "unit_price": unit_price,
        "unit_variable_cost": unit_variable_cost,
        "contribution_margin_per_unit": contribution_margin_per_unit,
        "contribution_margin_ratio": contribution_margin_ratio,
        "bep_units": bep_units,
        "bep_revenue": bep_revenue,
        "target_profit": target_profit,
        "target_units": target_units,
        "target_revenue": target_revenue,
        "interpretation": interpretation,
        "disclaimer": DISCLAIMER,
    }


def margin_of_safety(actual_revenue: int, bep_revenue: int) -> dict:
    """
    안전한계(Margin of Safety) 계산.

    안전한계액 = 실제매출 - BEP매출
    안전한계율 = (실제매출 - BEP매출) / 실제매출

    Args:
        actual_revenue: 실제(예상) 매출 (원)
        bep_revenue: 손익분기매출 (원)

    Returns:
        dict: 안전한계액·안전한계율·해석
    """
    if actual_revenue <= 0:
        return {"error": "실제매출은 양수여야 합니다"}
    if bep_revenue < 0:
        return {"error": "BEP매출은 0 이상이어야 합니다"}

    amount = actual_revenue - bep_revenue
    ratio = round(amount / actual_revenue, 4)

    if ratio >= 0.3:
        safety_level = "양호 (30% 이상 — 안전한계 충분)"
    elif ratio >= 0.1:
        safety_level = "주의 (10~30% — 매출 변동 리스크 관리 필요)"
    else:
        safety_level = "위험 (10% 미만 — 손실 전환 가능성 높음)"

    interpretation = (
        f"실제매출이 BEP 대비 {ratio*100:.2f}% ({amount:,}원) 여유. "
        f"안전한계 수준: {safety_level}."
    )

    return {
        "actual_revenue": actual_revenue,
        "bep_revenue": bep_revenue,
        "margin_of_safety_amount": amount,
        "margin_of_safety_ratio": ratio,
        "interpretation": interpretation,
        "disclaimer": DISCLAIMER,
    }


def operating_leverage(contribution_margin: int, operating_income: int) -> dict:
    """
    영업레버리지도(DOL, Degree of Operating Leverage) 계산.

    DOL = 공헌이익 / 영업이익
    해석: 매출 1% 변동 시 영업이익 DOL% 변동

    Args:
        contribution_margin: 공헌이익 합계 (원)
        operating_income: 영업이익 (원, 0 이상)

    Returns:
        dict: DOL·해석
    """
    if contribution_margin <= 0:
        return {"error": "공헌이익은 양수여야 합니다"}
    if operating_income <= 0:
        return {"error": "영업이익은 양수여야 합니다 (BEP 이하에서는 DOL 산출 불가)"}

    dol = round(contribution_margin / operating_income, 4)

    interpretation = (
        f"영업레버리지도(DOL) = {dol:.2f}. "
        f"매출 1% 변동 시 영업이익 약 {dol:.2f}% 변동. "
    )
    if dol >= 5:
        interpretation += "고정비 비중이 매우 높아 매출 변화에 이익이 민감하게 반응."
    elif dol >= 2:
        interpretation += "고정비 비중이 높은 편. 매출 증가 시 이익 레버리지 효과 큼."
    else:
        interpretation += "변동비 비중이 높아 매출 변화에 따른 이익 변동이 상대적으로 작음."

    return {
        "contribution_margin": contribution_margin,
        "operating_income": operating_income,
        "dol": dol,
        "interpretation": interpretation,
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="손익분기점(BEP) 계산기 — CVP 분석",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # calculate
    p_calc = sub.add_parser(
        "calculate",
        help="BEP 수량·매출 + 목표이익 달성 수량 계산",
    )
    p_calc.add_argument("--fixed-cost", type=int, required=True, help="고정비 (원)")
    p_calc.add_argument("--unit-price", type=int, required=True, help="단위판매가 (원)")
    p_calc.add_argument("--unit-variable-cost", type=int, required=True, help="단위변동비 (원)")
    p_calc.add_argument(
        "--target-profit", type=int, default=0,
        help="목표이익 (원, 기본값 0)",
    )

    # margin-of-safety
    p_mos = sub.add_parser(
        "margin-of-safety",
        help="안전한계액·안전한계율 계산",
    )
    p_mos.add_argument("--actual-revenue", type=int, required=True, help="실제(예상) 매출 (원)")
    p_mos.add_argument("--bep-revenue", type=int, required=True, help="BEP 매출 (원)")

    # operating-leverage
    p_ol = sub.add_parser(
        "operating-leverage",
        help="영업레버리지도(DOL) 계산",
    )
    p_ol.add_argument("--contribution-margin", type=int, required=True, help="공헌이익 합계 (원)")
    p_ol.add_argument("--operating-income", type=int, required=True, help="영업이익 (원)")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "calculate":
        result = calculate_bep(
            fixed_cost=args.fixed_cost,
            unit_price=args.unit_price,
            unit_variable_cost=args.unit_variable_cost,
            target_profit=args.target_profit,
        )
    elif args.cmd == "margin-of-safety":
        result = margin_of_safety(
            actual_revenue=args.actual_revenue,
            bep_revenue=args.bep_revenue,
        )
    elif args.cmd == "operating-leverage":
        result = operating_leverage(
            contribution_margin=args.contribution_margin,
            operating_income=args.operating_income,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
