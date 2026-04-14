#!/usr/bin/env python3
"""
원천징수 계산기 — 소득세법 §129·§21·§47·§134, 시행령 §87

서브커맨드:
  business           — 사업소득 원천징수 (3.3% = 3% + 지방세 0.3%)
  other              — 기타소득 원천징수 (지급액 - 필요경비 × 20% + 지방세 10% of 소득세)
  interest-dividend  — 이자·배당 원천징수 (15.4%)
  daily-worker       — 일용근로자 원천징수 (일급 15만 공제 후 6% × (1-0.55))
  employment         — 상용 근로소득 안내 (간이세액표 URL)

CLI 예시:
  python3 calculator.py business --payment 1000000
  python3 calculator.py other --payment 1000000 --type lecture
  python3 calculator.py interest-dividend --amount 10000000
  python3 calculator.py daily-worker --daily-wage 200000
  python3 calculator.py employment --monthly-wage 3000000 --dependents 1

주의:
  - 표준 라이브러리만 사용
  - 모든 금액은 int (원 단위 절사)
  - JSON 출력 (ensure_ascii=False, indent=2)
"""

import argparse
import json
import sys

# ─── 상수 ──────────────────────────────────────────────────────────────────────

# 사업소득 (소득세법 §129①3호)
BUSINESS_INCOME_TAX_RATE = 0.03
BUSINESS_LOCAL_TAX_RATE = 0.003  # 소득세 3%의 10% = 0.3%

# 이자·배당소득 (소득세법 §129①1호·2호)
INTEREST_DIVIDEND_INCOME_TAX_RATE = 0.14
INTEREST_DIVIDEND_LOCAL_TAX_RATE = 0.014  # 소득세 14%의 10% = 1.4%

# 기타소득 (소득세법 §21·§129①6호)
OTHER_INCOME_TAX_RATE = 0.20
OTHER_LOCAL_TAX_RATIO_OF_INCOME_TAX = 0.10  # 지방세 = 소득세 × 10%

# 기타소득 필요경비 의제율 (시행령 §87)
OTHER_INCOME_RATES = {
    "lecture":  {"rate": 0.60, "label": "강연료·원고료·인세·번역료·방송출연료"},
    "prize":    {"rate": 0.80, "label": "공익법인 시상금 등"},
    "general":  {"rate": 0.00, "label": "위자료·사례금·복권·기타"},
}

# 일용근로자 (소득세법 §47·§134)
DAILY_WORKER_EXEMPT_PER_DAY = 150_000
DAILY_WORKER_BASE_RATE = 0.06
DAILY_WORKER_TAX_CREDIT_RATE = 0.55
DAILY_WORKER_LOCAL_RATIO_OF_INCOME_TAX = 0.10

# 공통 면책
DISCLAIMER = (
    "2026년 기준 원천징수 안내. 기타소득 필요경비 의제율은 시행령 §87 지정 유형에 한함. "
    "상용 근로소득은 간이세액표(홈택스) 사용 필수. "
    "일용근로자 실효율은 일급에 따라 달라지는 계산 결과이지 고정 세율 아님. "
    "실무 원천징수 이행은 세무 전문가 확인 권장."
)

HOMETAX_WITHHOLDING_TABLE_URL = (
    "https://www.hometax.go.kr/websquare/websquare.html?"
    "w2xPath=/ui/sf/a/a/UTESIAA003.xml"
)


# ─── 계산 함수 ─────────────────────────────────────────────────────────────────

def business_withholding(payment: int) -> dict:
    """사업소득 원천징수 (소득세법 §129①3호)."""
    if payment < 0:
        return {"error": "지급금액은 0 이상이어야 합니다"}

    income_tax = int(payment * BUSINESS_INCOME_TAX_RATE)
    local_tax = int(payment * BUSINESS_LOCAL_TAX_RATE)
    total = income_tax + local_tax

    return {
        "mode": "business",
        "payment": payment,
        "income_tax_rate": BUSINESS_INCOME_TAX_RATE,
        "local_tax_rate": BUSINESS_LOCAL_TAX_RATE,
        "income_tax": income_tax,
        "local_tax": local_tax,
        "total_withholding": total,
        "net_payment": payment - total,
        "formula": "지급금액 × 3% (소득세) + 지급금액 × 0.3% (지방세) = 3.3%",
        "legal_basis": "소득세법 §129①3호",
        "disclaimer": DISCLAIMER,
    }


def other_withholding(
    payment: int,
    type_: str,
    expense_rate: float | None = None,
    actual_expense: int | None = None,
) -> dict:
    """기타소득 원천징수 (소득세법 §21·§129①6호, 시행령 §87)."""
    if payment < 0:
        return {"error": "지급금액은 0 이상이어야 합니다"}

    # 유형별 필요경비 의제율 확정
    if type_ == "custom":
        if expense_rate is None:
            return {"error": "type=custom일 때 --expense-rate 필수입니다"}
        if not (0.0 <= expense_rate <= 1.0):
            return {"error": "expense-rate는 0.0 ~ 1.0 범위"}
        deemed_rate = expense_rate
        type_label = "사용자 지정 필요경비율"
    elif type_ in OTHER_INCOME_RATES:
        deemed_rate = OTHER_INCOME_RATES[type_]["rate"]
        type_label = OTHER_INCOME_RATES[type_]["label"]
    else:
        return {
            "error": (
                f"알 수 없는 type: {type_}. "
                "lecture | prize | general | custom 중 선택"
            )
        }

    # 필요경비 산정: general 유형에서 실제 필요경비가 주어지면 의제와 비교해 큰 값 사용
    deemed_expense = int(payment * deemed_rate)
    if type_ == "general" and actual_expense is not None:
        if actual_expense < 0:
            return {"error": "actual-expense는 0 이상"}
        # 실제 필요경비가 있으면 의제(0원)보다 크므로 실제액 사용
        expense = max(deemed_expense, actual_expense)
        expense_source = "actual_or_deemed_max"
    else:
        expense = deemed_expense
        expense_source = "deemed"

    taxable_income = max(0, payment - expense)
    income_tax = int(taxable_income * OTHER_INCOME_TAX_RATE)
    local_tax = int(income_tax * OTHER_LOCAL_TAX_RATIO_OF_INCOME_TAX)
    total = income_tax + local_tax

    effective_rate = (total / payment) if payment > 0 else 0.0

    result = {
        "mode": "other",
        "type": type_,
        "type_label": type_label,
        "payment": payment,
        "deemed_expense_rate": deemed_rate,
        "deemed_expense": expense,
        "expense_source": expense_source,
        "taxable_income": taxable_income,
        "income_tax": income_tax,
        "local_tax": local_tax,
        "total_withholding": total,
        "net_payment": payment - total,
        "effective_rate": round(effective_rate, 6),
        "formula": "(지급금액 - 필요경비) × 20% + 지방세 10% (소득세의)",
        "legal_basis": "소득세법 §21, §129①6호, 시행령 §87",
        "disclaimer": DISCLAIMER,
    }
    return result


def interest_dividend_withholding(amount: int, type_: str | None = None) -> dict:
    """이자·배당소득 원천징수 (소득세법 §129①1호·2호)."""
    if amount < 0:
        return {"error": "지급액은 0 이상"}

    income_tax = int(amount * INTEREST_DIVIDEND_INCOME_TAX_RATE)
    local_tax = int(amount * INTEREST_DIVIDEND_LOCAL_TAX_RATE)
    total = income_tax + local_tax

    return {
        "mode": "interest-dividend",
        "type": type_ or "interest_or_dividend",
        "amount": amount,
        "income_tax_rate": INTEREST_DIVIDEND_INCOME_TAX_RATE,
        "local_tax_rate": INTEREST_DIVIDEND_LOCAL_TAX_RATE,
        "income_tax": income_tax,
        "local_tax": local_tax,
        "total_withholding": total,
        "net_payment": amount - total,
        "formula": "지급액 × 14% (소득세) + 지급액 × 1.4% (지방세) = 15.4%",
        "legal_basis": "소득세법 §129①1호·2호",
        "note": (
            "이자·배당 합산 2천만원 이하는 분리과세 종결, "
            "초과 시 금융소득종합과세 대상."
        ),
        "disclaimer": DISCLAIMER,
    }


def daily_worker_withholding(daily_wage: int, days: int = 1) -> dict:
    """일용근로자 원천징수 (소득세법 §47·§134)."""
    if daily_wage < 0:
        return {"error": "일급은 0 이상"}
    if days < 1:
        return {"error": "일수는 1 이상"}

    taxable_per_day = max(0, daily_wage - DAILY_WORKER_EXEMPT_PER_DAY)

    if taxable_per_day == 0:
        return {
            "mode": "daily-worker",
            "daily_wage": daily_wage,
            "days": days,
            "exempt_per_day": DAILY_WORKER_EXEMPT_PER_DAY,
            "taxable_per_day": 0,
            "base_rate": DAILY_WORKER_BASE_RATE,
            "tax_credit_rate": DAILY_WORKER_TAX_CREDIT_RATE,
            "income_tax_per_day": 0,
            "local_tax_per_day": 0,
            "total_per_day": 0,
            "total_days_withholding": 0,
            "effective_rate_per_day": 0.0,
            "exempt_from_withholding": True,
            "formula": "(일급 - 150,000) × 6% × (1 - 0.55) + 지방세 10%",
            "note": (
                "일급 15만원 이하는 과세표준이 0이므로 원천징수 없음. "
                "'실효 2.7%'는 과세표준 대비 고정이며, "
                "지급총액 대비 실효율은 일급별로 다름."
            ),
            "legal_basis": "소득세법 §47, §134",
            "disclaimer": DISCLAIMER,
        }

    # 명세: taxable × 6% × (1 - 0.55) = taxable × 2.7%
    # 부동소수점 오차 회피를 위해 정수 연산 (2.7% = 27/1000)
    income_tax_per_day = (taxable_per_day * 27) // 1000
    local_tax_per_day = int(income_tax_per_day * DAILY_WORKER_LOCAL_RATIO_OF_INCOME_TAX)
    total_per_day = income_tax_per_day + local_tax_per_day
    total_days = total_per_day * days

    effective_per_day = (total_per_day / daily_wage) if daily_wage > 0 else 0.0

    return {
        "mode": "daily-worker",
        "daily_wage": daily_wage,
        "days": days,
        "exempt_per_day": DAILY_WORKER_EXEMPT_PER_DAY,
        "taxable_per_day": taxable_per_day,
        "base_rate": DAILY_WORKER_BASE_RATE,
        "tax_credit_rate": DAILY_WORKER_TAX_CREDIT_RATE,
        "income_tax_per_day": income_tax_per_day,
        "local_tax_per_day": local_tax_per_day,
        "total_per_day": total_per_day,
        "total_days_withholding": total_days,
        "effective_rate_per_day": round(effective_per_day, 6),
        "exempt_from_withholding": False,
        "formula": "(일급 - 150,000) × 6% × (1 - 0.55) + 지방세 10%",
        "note": (
            "실효율은 일급에 따라 달라짐. "
            "'2.7%'는 과세표준 대비 고정이지만, "
            "지급총액 대비 실효율은 일급별로 다름."
        ),
        "legal_basis": "소득세법 §47, §134",
        "disclaimer": DISCLAIMER,
    }


def employment_guidance(
    monthly_wage: int | None = None,
    dependents: int | None = None,
) -> dict:
    """상용 근로소득 안내 (간이세액표 URL 리디렉션)."""
    return {
        "mode": "employment",
        "monthly_wage": monthly_wage,
        "dependents": dependents,
        "note": (
            "상용 근로소득은 '근로소득 간이세액표'"
            "(월급·부양가족·7세 이상 20세 이하 자녀수 기준)로 원천징수. "
            "정확한 금액은 홈택스 간이세액표 계산기 조회 권장."
        ),
        "hometax_calc_url": HOMETAX_WITHHOLDING_TABLE_URL,
        "note2": "연말정산 시 실제 결정세액과 차액 정산.",
        "legal_basis": "소득세법 §134 + 시행령 §194 별표",
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="원천징수 계산기 (소득세법 §129·§21·§47·§134)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # business
    p_biz = sub.add_parser("business", help="사업소득 원천징수 (3.3%)")
    p_biz.add_argument("--payment", type=int, required=True, help="지급총액 (원)")

    # other
    p_other = sub.add_parser("other", help="기타소득 원천징수")
    p_other.add_argument("--payment", type=int, required=True, help="지급총액 (원)")
    p_other.add_argument(
        "--type", dest="type_", required=True,
        choices=["lecture", "prize", "general", "custom"],
        help="유형: lecture | prize | general | custom",
    )
    p_other.add_argument(
        "--expense-rate", type=float, default=None,
        help="custom 시 필수 (0.0 ~ 1.0)",
    )
    p_other.add_argument(
        "--actual-expense", type=int, default=None,
        help="general 유형에서 실제 필요경비 (선택)",
    )

    # interest-dividend
    p_id = sub.add_parser("interest-dividend", help="이자·배당 원천징수 (15.4%)")
    p_id.add_argument("--amount", type=int, required=True, help="지급액 (원)")
    p_id.add_argument(
        "--type", dest="type_", default=None,
        choices=["interest", "dividend"], help="interest | dividend (선택)",
    )

    # daily-worker
    p_dw = sub.add_parser("daily-worker", help="일용근로자 원천징수")
    p_dw.add_argument("--daily-wage", type=int, required=True, help="일급 (원)")
    p_dw.add_argument("--days", type=int, default=1, help="일수 (default 1)")

    # employment
    p_emp = sub.add_parser("employment", help="상용 근로소득 안내 (간이세액표)")
    p_emp.add_argument("--monthly-wage", type=int, default=None, help="월급 (원, 선택)")
    p_emp.add_argument("--dependents", type=int, default=None, help="부양가족 수 (선택)")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "business":
        result = business_withholding(payment=args.payment)
    elif args.cmd == "other":
        result = other_withholding(
            payment=args.payment,
            type_=args.type_,
            expense_rate=args.expense_rate,
            actual_expense=args.actual_expense,
        )
    elif args.cmd == "interest-dividend":
        result = interest_dividend_withholding(
            amount=args.amount, type_=args.type_,
        )
    elif args.cmd == "daily-worker":
        result = daily_worker_withholding(
            daily_wage=args.daily_wage, days=args.days,
        )
    elif args.cmd == "employment":
        result = employment_guidance(
            monthly_wage=args.monthly_wage, dependents=args.dependents,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
