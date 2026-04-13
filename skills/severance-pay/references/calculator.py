#!/usr/bin/env python3
"""
퇴직금 계산기 (근로자퇴직급여보장법 §8)

공식:
  1일 평균임금 = (3개월 임금총액 + 상여금/연차수당의 3개월분) / 3개월 일수
  퇴직금 = 1일 평균임금 × 30 × (총재직일수 / 365)

자격: 1년 이상 계속근로 + 4주간 1주 평균 15시간 이상.
모드: calculate (정확) | simple (월급 기반 추정)

CLI: python3 calculator.py calculate --help
"""

import argparse
import json
import sys


def calculate_severance(
    avg_3month_wage_total: int,
    days_in_3month: int,
    annual_bonus: int = 0,
    annual_leave_pay: int = 0,
    total_service_days: int = 0,
    prior_settlement: int = 0,
) -> dict:
    if total_service_days < 365:
        return {
            "eligible": False,
            "reason": "재직 1년 미만 — 퇴직금 청구권 없음 (근로자퇴직급여보장법 §4)",
            "final_severance": 0,
        }
    if days_in_3month <= 0:
        return {"error": "days_in_3month must be > 0"}

    bonus_portion = (annual_bonus + annual_leave_pay) * 3 / 12
    daily_avg = (avg_3month_wage_total + bonus_portion) / days_in_3month
    gross = round(daily_avg * 30 * (total_service_days / 365))
    final = max(0, gross - prior_settlement)

    return {
        "mode": "calculate",
        "eligible": True,
        "daily_avg_wage": round(daily_avg),
        "service_days": total_service_days,
        "service_years": round(total_service_days / 365, 2),
        "gross_severance": gross,
        "prior_settlement": prior_settlement,
        "final_severance": final,
        "calculation": (
            f"({avg_3month_wage_total:,} + 상여/연차분 {round(bonus_portion):,})"
            f" / {days_in_3month}일 = 일평균 {round(daily_avg):,}원 × 30 × {total_service_days}/365"
            f" = {gross:,}원"
        ),
        "disclaimer": (
            "DB형 기준 추정. DC형 가입자는 사업주 적립금+운용수익으로 별도 산정. "
            "단체협약·취업규칙에 따라 실제 금액 달라질 수 있음."
        ),
    }


def calculate_simple(
    avg_monthly_wage: int,
    years: int,
    months: int = 0,
    prior_settlement: int = 0,
) -> dict:
    total_months = years * 12 + months
    if total_months < 12:
        return {
            "eligible": False,
            "reason": "재직 1년 미만 — 퇴직금 청구권 없음",
            "final_severance": 0,
        }
    gross = round(avg_monthly_wage * (total_months / 12))
    final = max(0, gross - prior_settlement)
    return {
        "mode": "simple",
        "eligible": True,
        "service_months": total_months,
        "service_years": round(total_months / 12, 2),
        "avg_monthly_wage": avg_monthly_wage,
        "gross_severance": gross,
        "prior_settlement": prior_settlement,
        "final_severance": final,
        "calculation": f"{avg_monthly_wage:,} × {total_months/12:.2f}년 ≈ {gross:,}원",
        "note": "간이 추정 — 정확한 산정은 'calculate' 모드(직전 3개월 임금 기반) 사용 권장.",
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="calculator.py", description="퇴직금 계산기")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_calc = sub.add_parser("calculate", help="정확 모드: 평균임금 기반")
    p_calc.add_argument("--avg-3month-wage-total", type=int, required=True,
                        help="직전 3개월 임금 총액 (원)")
    p_calc.add_argument("--days-in-3month", type=int, required=True,
                        help="직전 3개월 일수 (89~92)")
    p_calc.add_argument("--annual-bonus", type=int, default=0, help="연간 상여금 (원)")
    p_calc.add_argument("--annual-leave-pay", type=int, default=0, help="연간 연차수당 (원)")
    p_calc.add_argument("--total-service-days", type=int, required=True, help="총 재직일수")
    p_calc.add_argument("--prior-settlement", type=int, default=0, help="중간정산액 차감 (원)")

    p_simple = sub.add_parser("simple", help="간이 모드: 월급 × 재직년수")
    p_simple.add_argument("--avg-monthly-wage", type=int, required=True, help="평균 월급 (원)")
    p_simple.add_argument("--years", type=int, required=True, help="재직 년수")
    p_simple.add_argument("--months", type=int, default=0, help="추가 재직 개월")
    p_simple.add_argument("--prior-settlement", type=int, default=0, help="중간정산액 차감 (원)")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)
    if args.cmd == "calculate":
        result = calculate_severance(
            args.avg_3month_wage_total, args.days_in_3month,
            args.annual_bonus, args.annual_leave_pay,
            args.total_service_days, args.prior_settlement,
        )
    elif args.cmd == "simple":
        result = calculate_simple(
            args.avg_monthly_wage, args.years, args.months, args.prior_settlement,
        )
    else:
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
