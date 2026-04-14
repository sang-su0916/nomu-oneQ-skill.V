#!/usr/bin/env python3
"""
연말정산 간이 추정 계산기 — 2026년 귀속 기준

소득세법 §47(근로소득공제), §55(기본세율), §59의2(자녀세액공제),
§59의3(연금계좌세액공제), §59의6(표준세액공제), §126의2(신용카드 등 소득공제)

모드: calculate | deduction-table | compare-card | changes-2026

CLI:
  python3 calculator.py calculate --total-salary 60000000 \
    --dependents 1 --children-age-8-20 1 --pension-savings 6000000 --withheld-tax 4000000
  python3 calculator.py deduction-table
  python3 calculator.py compare-card --total-salary 60000000 --spending-above-threshold 10000000
  python3 calculator.py changes-2026

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 금액 int (원 단위 절사)
  - JSON 출력: ensure_ascii=False, indent=2
  - 결정세액·세부 한도 일부 단순화 (SKILL.md 한계 참고)
"""

import argparse
import json
import sys

# ─── 상수 ──────────────────────────────────────────────────────────────────────

# 근로소득공제 (소득세법 §47) — 구간 누적 공식
# 각 튜플: (상한, 증분율, 구간 하한에서의 기본 공제액)
# 공제액 = base + (총급여 - 직전 구간 상한) × rate
EMPLOYMENT_INCOME_DEDUCTION = [
    (5_000_000,        0.70, 0),
    (15_000_000,       0.40, 1_500_000),
    (45_000_000,       0.15, 7_500_000),
    (100_000_000,      0.05, 12_000_000),
    (float("inf"),     0.02, 15_000_000),
]
EMPLOYMENT_INCOME_DEDUCTION_CAP = 20_000_000

# 기본세율 (소득세법 §55, 2023년 귀속부터 현행)
BRACKETS_2026 = [
    (14_000_000,       0.06,          0),
    (50_000_000,       0.15,  1_260_000),
    (88_000_000,       0.24,  5_760_000),
    (150_000_000,      0.35, 15_440_000),
    (300_000_000,      0.38, 19_940_000),
    (500_000_000,      0.40, 25_940_000),
    (1_000_000_000,    0.42, 35_940_000),
    (float("inf"),     0.45, 65_940_000),
]

# 근로소득세액공제 한도 (소득세법 §59) — 총급여별
EMPLOYMENT_TAX_CREDIT_CAP = [
    (33_000_000,   740_000),
    (70_000_000,   660_000),
    (float("inf"), 500_000),
]

LOCAL_TAX_RATE = 0.10
PERSONAL_DEDUCTION_PER_HEAD = 1_500_000
SENIOR_DEDUCTION = 1_000_000
DISABLED_DEDUCTION = 2_000_000
STANDARD_TAX_CREDIT = 130_000
MARRIAGE_TAX_CREDIT = 500_000  # 본인 기준 (부부 합산 100만)

# 2026 변경 반영 한도
HOUSING_SUBSCRIPTION_RATE = 0.40
HOUSING_SUBSCRIPTION_CAP = 3_000_000    # 납입 한도 300만 (공제 = 한도 × 40%)
HOUSING_SUBSCRIPTION_DEDUCTION_CAP = 1_200_000  # 300만 × 40%

CREDIT_CARD_RATE = 0.15
CREDIT_CARD_CAP_SIMPLE = 3_000_000

MONTHLY_RENT_CAP = 10_000_000
MONTHLY_RENT_RATE_LOW = 0.17   # 총급여 5,500만 이하
MONTHLY_RENT_RATE_HIGH = 0.15  # 5,500만 ~ 8천만
MONTHLY_RENT_SALARY_CAP = 80_000_000

MEDICAL_THRESHOLD_RATE = 0.03
MEDICAL_RATE = 0.15
MEDICAL_CAP = 700_000

EDUCATION_RATE = 0.15

PENSION_SAVINGS_CAP = 6_000_000     # 연금저축 단독 한도
PENSION_IRP_TOTAL_CAP = 9_000_000   # 연금저축 + IRP
PENSION_RATE_LOW = 0.165   # 총급여 5,500만 이하 (지방세 포함 실효)
PENSION_RATE_HIGH = 0.132  # 5,500만 초과

CHILD_TAX_CREDIT_FIRST = 250_000
CHILD_TAX_CREDIT_SECOND = 300_000
CHILD_TAX_CREDIT_THIRD_PLUS = 400_000

# 국민연금 본인부담 간이 추정 (총급여 × 4.5%, 한도 반영)
NATIONAL_PENSION_RATE = 0.045
NATIONAL_PENSION_CAP = 2_700_000

DISCLAIMER = (
    "간이 연말정산 추정. 실제 결정세액은 홈택스 연말정산 미리보기/간소화 "
    "서비스에서 확인. 세부 공제 한도(신용카드 추가한도·주택자금·기부금·정치자금 "
    "등) 다수 미반영. 월세는 총급여 8천만 이하·무주택자 요건 별도 확인. "
    "경정청구는 5월 이후 가능."
)


# ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _employment_income_deduction(total_salary: int) -> int:
    """근로소득공제 (§47) — 구간 누적."""
    if total_salary <= 0:
        return 0
    prev_upper = 0
    for upper, rate, base in EMPLOYMENT_INCOME_DEDUCTION:
        if total_salary <= upper:
            deduction = int(base + (total_salary - prev_upper) * rate)
            return min(deduction, EMPLOYMENT_INCOME_DEDUCTION_CAP)
        prev_upper = upper
    return EMPLOYMENT_INCOME_DEDUCTION_CAP


def _apply_brackets(taxable_income: int) -> int:
    """기본세율 적용 → 산출세액."""
    if taxable_income <= 0:
        return 0
    for upper, rate, deduction in BRACKETS_2026:
        if taxable_income <= upper:
            return max(0, int(taxable_income * rate - deduction))
    return 0


def _employment_tax_credit(tax_before_credits: int, total_salary: int) -> int:
    """근로소득세액공제 (§59)."""
    if tax_before_credits <= 0:
        return 0
    threshold = 1_300_000
    if tax_before_credits <= threshold:
        credit = int(tax_before_credits * 0.55)
    else:
        credit = int(threshold * 0.55 + (tax_before_credits - threshold) * 0.30)
    cap = next(c for s, c in EMPLOYMENT_TAX_CREDIT_CAP if total_salary <= s)
    return min(credit, cap)


def _child_tax_credit(children: int) -> int:
    """자녀세액공제 (§59의2, 2026 귀속 인상)."""
    if children <= 0:
        return 0
    total = 0
    if children >= 1:
        total += CHILD_TAX_CREDIT_FIRST
    if children >= 2:
        total += CHILD_TAX_CREDIT_SECOND
    if children >= 3:
        total += CHILD_TAX_CREDIT_THIRD_PLUS * (children - 2)
    return total


def _pension_tax_credit(pension_savings: int, total_salary: int) -> int:
    """연금저축·IRP 세액공제 (§59의3). 입력은 연금저축+IRP 합산 또는 연금저축 단독.

    스펙 상 --pension-savings 한 항목만 받으므로, 납입액은 전체 한도 900만
    기준으로 절사하여 적용 (단순화).
    """
    if pension_savings <= 0:
        return 0
    base = min(pension_savings, PENSION_IRP_TOTAL_CAP)
    rate = PENSION_RATE_LOW if total_salary <= 55_000_000 else PENSION_RATE_HIGH
    return int(base * rate)


def _medical_tax_credit(medical_expense: int, total_salary: int) -> int:
    """의료비 세액공제 (§59의4). 총급여 3% 초과분 × 15%, 한도 70만."""
    if medical_expense <= 0 or total_salary <= 0:
        return 0
    threshold = int(total_salary * MEDICAL_THRESHOLD_RATE)
    excess = max(0, medical_expense - threshold)
    return min(int(excess * MEDICAL_RATE), MEDICAL_CAP)


def _education_tax_credit(education_expense: int) -> int:
    """교육비 세액공제 (§59의4). 간이는 한도 없이 15%."""
    if education_expense <= 0:
        return 0
    return int(education_expense * EDUCATION_RATE)


def _monthly_rent_credit(monthly_rent_annual: int, total_salary: int) -> int:
    """월세 세액공제 (2026 귀속 확대: 총급여 8천만 이하·한도 1천만·17%/15%)."""
    if monthly_rent_annual <= 0 or total_salary > MONTHLY_RENT_SALARY_CAP:
        return 0
    base = min(monthly_rent_annual, MONTHLY_RENT_CAP)
    rate = MONTHLY_RENT_RATE_LOW if total_salary <= 55_000_000 else MONTHLY_RENT_RATE_HIGH
    return int(base * rate)


def _housing_subscription_deduction(housing_subscription: int, total_salary: int) -> int:
    """주택청약 소득공제 (§87). 2026 확대: 한도 300만·40%·총급여 7천만 이하."""
    if housing_subscription <= 0 or total_salary > 70_000_000:
        return 0
    base = min(housing_subscription, HOUSING_SUBSCRIPTION_CAP)
    return int(base * HOUSING_SUBSCRIPTION_RATE)


def _credit_card_deduction(credit_card_usage: int, total_salary: int) -> int:
    """신용카드 등 소득공제 (§126의2). 간이: 25% 초과분 × 15%, 한도 300만."""
    if credit_card_usage <= 0 or total_salary <= 0:
        return 0
    threshold = int(total_salary * 0.25)
    excess = max(0, credit_card_usage - threshold)
    return min(int(excess * CREDIT_CARD_RATE), CREDIT_CARD_CAP_SIMPLE)


def _national_pension_deduction(total_salary: int) -> int:
    """국민연금 본인부담 간이 추정 (4.5%, 연 한도 ~270만)."""
    if total_salary <= 0:
        return 0
    return min(int(total_salary * NATIONAL_PENSION_RATE), NATIONAL_PENSION_CAP)


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

def calculate_year_end(
    total_salary: int,
    dependents: int = 0,
    seniors: int = 0,
    disabled: int = 0,
    children_age_8_20: int = 0,
    pension_savings: int = 0,
    medical_expense: int = 0,
    education_expense: int = 0,
    monthly_rent_annual: int = 0,
    credit_card_usage: int = 0,
    housing_subscription: int = 0,
    withheld_tax: int = 0,
    married_newly: bool = False,
) -> dict:
    """간이 연말정산 추정."""
    if total_salary < 0:
        return {"error": "총급여는 0 이상이어야 합니다"}

    # 1) 근로소득공제 → 근로소득금액
    eid = _employment_income_deduction(total_salary)
    employment_income = max(0, total_salary - eid)

    # 2) 인적공제 (본인 포함)
    personal = (
        PERSONAL_DEDUCTION_PER_HEAD * (1 + max(0, dependents))
        + SENIOR_DEDUCTION * max(0, seniors)
        + DISABLED_DEDUCTION * max(0, disabled)
    )

    # 3) 연금보험료공제 (국민연금 본인부담)
    pension_contribution = _national_pension_deduction(total_salary)

    # 4) 주택청약 소득공제
    housing_sub_ded = _housing_subscription_deduction(housing_subscription, total_salary)

    # 5) 신용카드 소득공제
    card_ded = _credit_card_deduction(credit_card_usage, total_salary)

    # 6) 과세표준
    taxable_income = max(
        0,
        employment_income - personal - pension_contribution - housing_sub_ded - card_ded,
    )

    # 7) 산출세액
    tax_before_credits = _apply_brackets(taxable_income)

    # 8) 세액공제
    emp_credit = _employment_tax_credit(tax_before_credits, total_salary)
    child_credit = _child_tax_credit(children_age_8_20)
    pension_credit = _pension_tax_credit(pension_savings, total_salary)
    medical_credit = _medical_tax_credit(medical_expense, total_salary)
    education_credit = _education_tax_credit(education_expense)
    rent_credit = _monthly_rent_credit(monthly_rent_annual, total_salary)
    marriage_credit = MARRIAGE_TAX_CREDIT if married_newly else 0
    standard_credit = STANDARD_TAX_CREDIT

    total_credits = (
        emp_credit + child_credit + pension_credit + medical_credit
        + education_credit + rent_credit + marriage_credit + standard_credit
    )

    # 9) 결정세액
    final_tax = max(0, tax_before_credits - total_credits)
    local_tax = int(final_tax * LOCAL_TAX_RATE)
    total_due = final_tax + local_tax
    refund = withheld_tax - total_due

    if refund >= 0:
        label = f"환급 {refund:,}원"
    else:
        label = f"추가납부 {abs(refund):,}원"

    return {
        "mode": "calculate",
        "total_salary": total_salary,
        "employment_income_deduction": eid,
        "employment_income": employment_income,
        "personal_deductions": personal,
        "pension_contribution_deduction": pension_contribution,
        "credit_card_deduction": card_ded,
        "housing_subscription_deduction": housing_sub_ded,
        "taxable_income": taxable_income,
        "tax_before_credits": tax_before_credits,
        "tax_credits": {
            "employment_tax_credit": emp_credit,
            "child_tax_credit": child_credit,
            "pension_tax_credit": pension_credit,
            "medical_tax_credit": medical_credit,
            "education_tax_credit": education_credit,
            "monthly_rent_credit": rent_credit,
            "marriage_credit": marriage_credit,
            "standard_credit": standard_credit,
            "total_credits": total_credits,
        },
        "final_tax": final_tax,
        "local_tax": local_tax,
        "total_tax_due": total_due,
        "withheld_tax": withheld_tax,
        "refund_or_additional": refund,
        "result_label": label,
        "disclaimer": DISCLAIMER,
    }


def deduction_table() -> dict:
    """2026 귀속 공제 항목 요약."""
    items = [
        {
            "name": "근로소득공제",
            "type": "소득공제",
            "law": "소득세법 §47",
            "formula": "구간별 누적 (70%/40%/15%/5%/2%)",
            "cap": f"{EMPLOYMENT_INCOME_DEDUCTION_CAP:,}원",
        },
        {
            "name": "인적공제 (본인·부양가족)",
            "type": "소득공제",
            "law": "소득세법 §50",
            "formula": "1인당 150만원",
            "condition": "연 소득 100만원 이하 + 나이·관계 요건",
        },
        {
            "name": "경로우대 (70세↑)",
            "type": "소득공제",
            "law": "소득세법 §51",
            "formula": "1인당 100만원 추가",
        },
        {
            "name": "장애인",
            "type": "소득공제",
            "law": "소득세법 §51",
            "formula": "1인당 200만원 추가",
        },
        {
            "name": "연금보험료공제 (국민연금)",
            "type": "소득공제",
            "law": "소득세법 §51의3",
            "formula": "본인부담 전액",
        },
        {
            "name": "주택청약종합저축",
            "type": "소득공제",
            "law": "조특법 §87",
            "formula": "납입액의 40%",
            "cap": "연 300만원 (공제 120만)",
            "condition": "총급여 7천만 이하 무주택자, 배우자도 가능 (2026)",
        },
        {
            "name": "신용카드 등 사용금액",
            "type": "소득공제",
            "law": "조특법 §126의2",
            "formula": "총급여 25% 초과분 (신용 15%/체크·현금 30%/전통시장·대중교통 40%/문화비 30%)",
            "cap": "총급여 7천만↓ 300만 / 초과 250만 + 추가(전통시장·대중교통·문화 각 300만)",
            "note": "2025.7~ 헬스장·수영장 문화비 30% 포함",
        },
        {
            "name": "근로소득세액공제",
            "type": "세액공제",
            "law": "소득세법 §59",
            "formula": "산출 130만 이하 55% / 초과분 30%",
            "cap": "총급여 3,300만↓ 74만 / ~7,000만 66만 / 초과 50만",
        },
        {
            "name": "자녀세액공제",
            "type": "세액공제",
            "law": "소득세법 §59의2",
            "formula": "첫째 25만 + 둘째 30만 + 셋째이상 40만/인 (2026 인상)",
            "condition": "만 8~20세 자녀·손자녀",
        },
        {
            "name": "연금계좌세액공제 (연금저축·IRP)",
            "type": "세액공제",
            "law": "소득세법 §59의3",
            "formula": "납입액 × 16.5% (총급여 5,500만↓) / 13.2% (초과)",
            "cap": "연금저축 600만 / 연금+IRP 합산 900만",
            "note": "지방세 포함 실효율 (소득세 12%/15% + 지방세 10%)",
        },
        {
            "name": "의료비세액공제",
            "type": "세액공제",
            "law": "소득세법 §59의4",
            "formula": "(의료비 - 총급여 3%) × 15%",
            "cap": "700만 (본인·65세↑·장애인·난임·6세↓ 자녀 한도 없음)",
        },
        {
            "name": "교육비세액공제",
            "type": "세액공제",
            "law": "소득세법 §59의4",
            "formula": "교육비 × 15%",
            "cap": "유치원·초중고 자녀 1인당 300만 / 대학생 900만 / 본인 한도 없음",
            "note": "2026~ 초등 2학년 이하 예체능 학원비 추가",
        },
        {
            "name": "월세세액공제",
            "type": "세액공제",
            "law": "조특법 §95의2",
            "formula": "월세 × 17% (총급여 5,500만↓) / 15% (초과)",
            "cap": "연 1,000만원 (2026 확대)",
            "condition": "총급여 8천만 이하 무주택 세대주",
        },
        {
            "name": "결혼세액공제 (신설)",
            "type": "세액공제",
            "law": "조특법 §95의3",
            "formula": "본인 50만 + 배우자 50만 = 부부 합산 100만",
            "condition": "2024~2026 혼인신고자, 생애 1회",
        },
        {
            "name": "표준세액공제",
            "type": "세액공제",
            "law": "소득세법 §59의6",
            "formula": "연 13만원",
            "condition": "특별소득공제·특별세액공제 미신청 시",
        },
    ]
    return {
        "mode": "deduction-table",
        "year": "2026 귀속",
        "items": items,
        "disclaimer": DISCLAIMER,
    }


def compare_card(total_salary: int, spending_above_threshold: int) -> dict:
    """신용카드 vs 체크카드 소득공제 비교 (25% 초과분 기준)."""
    if total_salary <= 0:
        return {"error": "총급여는 양수여야 합니다"}
    if spending_above_threshold < 0:
        return {"error": "초과사용액은 0 이상이어야 합니다"}

    credit_deduction = int(spending_above_threshold * 0.15)
    debit_deduction = int(spending_above_threshold * 0.30)

    # 공제 한도 (간이): 총급여 7천만 이하 300만, 초과 250만
    cap = 3_000_000 if total_salary <= 70_000_000 else 2_500_000
    credit_deduction_capped = min(credit_deduction, cap)
    debit_deduction_capped = min(debit_deduction, cap)

    # 한계세율
    for upper, rate, _ in BRACKETS_2026:
        # 과세표준이 아닌 총급여 기준 근사 → 한계세율 조회
        if total_salary <= upper:
            marginal = rate
            break
    else:
        marginal = BRACKETS_2026[-1][1]

    credit_tax_saved = int(credit_deduction_capped * marginal * 1.10)   # 지방세 포함
    debit_tax_saved = int(debit_deduction_capped * marginal * 1.10)
    diff = debit_tax_saved - credit_tax_saved

    recommendation = (
        "체크카드·현금영수증이 세금 절감 관점에서 유리합니다."
        if diff > 0 else
        "한도·지출 패턴상 두 방식 절세 효과가 동일합니다."
    )

    return {
        "mode": "compare-card",
        "total_salary": total_salary,
        "spending_above_threshold": spending_above_threshold,
        "deduction_cap": cap,
        "credit_card": {
            "rate": 0.15,
            "raw_deduction": credit_deduction,
            "capped_deduction": credit_deduction_capped,
            "estimated_tax_saved": credit_tax_saved,
        },
        "debit_card_or_cash": {
            "rate": 0.30,
            "raw_deduction": debit_deduction,
            "capped_deduction": debit_deduction_capped,
            "estimated_tax_saved": debit_tax_saved,
        },
        "tax_saving_difference": diff,
        "recommendation": recommendation,
        "note": (
            "총급여 25% 초과분 기준. 한도는 총급여 7천만↓ 300만, 초과 250만 적용. "
            "한계세율 × 1.10(지방세 포함) 절세 효과 근사치."
        ),
        "disclaimer": DISCLAIMER,
    }


def changes_2026() -> dict:
    """2026 귀속 주요 변경사항 요약."""
    changes = [
        {
            "item": "결혼세액공제 (신설)",
            "detail": "본인 50만 + 배우자 50만, 부부 합산 최대 100만원, 생애 1회",
            "scope": "2024~2026년 혼인신고자",
            "law": "조특법 §95의3",
        },
        {
            "item": "자녀세액공제 확대",
            "detail": "첫째 15만→25만, 둘째 20만→30만, 셋째 이상 30만→40만/인",
            "scope": "만 8~20세 자녀·손자녀",
            "law": "소득세법 §59의2",
        },
        {
            "item": "월세 세액공제 확대",
            "detail": "대상 총급여 7천만→8천만, 한도 750만→1,000만, 공제율 17%/15%",
            "scope": "무주택 세대주",
            "law": "조특법 §95의2",
        },
        {
            "item": "주택청약 소득공제 확대",
            "detail": "한도 240만→300만 (납입액 기준), 공제율 40%, 배우자도 가능",
            "scope": "총급여 7천만 이하 무주택자",
            "law": "조특법 §87",
        },
        {
            "item": "6세 이하 자녀 의료비 한도 폐지",
            "detail": "6세 이하 자녀 의료비 세액공제 한도 없음 (본인·65세↑·장애인·난임과 동일 취급)",
            "scope": "만 6세 이하 자녀",
            "law": "소득세법 §59의4",
        },
        {
            "item": "체육시설 문화비 소득공제 신설",
            "detail": "헬스장·수영장 이용료 신용카드 문화비 공제(30%) 포함",
            "scope": "2025년 7월 1일 이후 사용분",
            "law": "조특법 §126의2",
        },
        {
            "item": "고향사랑기부금 한도 확대",
            "detail": "연 500만→2,000만원 한도 확대 (10만 이하 전액, 초과 15%)",
            "scope": "고향사랑기부제",
            "law": "조특법 §58",
        },
        {
            "item": "출산지원금 비과세 확대",
            "detail": "사용자가 근로자에게 지급하는 출산지원금 비과세 (한도 확대)",
            "scope": "자녀 출생 후 2년 이내 수령분",
            "law": "소득세법 §12",
        },
        {
            "item": "초등 2학년 이하 예체능 학원비 교육비공제",
            "detail": "취학아동 예체능 학원비 교육비 세액공제 대상 추가",
            "scope": "초등 2학년 이하",
            "law": "소득세법 §59의4",
        },
    ]
    return {
        "mode": "changes-2026",
        "year": "2026 귀속",
        "count": len(changes),
        "changes": changes,
        "source": [
            "vault/r-resources/business-guides/2026년-연말정산-꿀팁-완벽-가이드.md",
            "vault/r-resources/business-guides/ebook-전체-2026년-연초-세무-노무-가이드-20260105-091107.md",
        ],
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="연말정산 간이 추정 (2026 귀속)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    pc = sub.add_parser("calculate", help="간이 연말정산 추정")
    pc.add_argument("--total-salary", type=int, required=True, help="총급여 (원)")
    pc.add_argument("--dependents", type=int, default=0, help="부양가족 수 (본인 제외)")
    pc.add_argument("--seniors", type=int, default=0, help="70세 이상 경로우대 수")
    pc.add_argument("--disabled", type=int, default=0, help="장애인 수")
    pc.add_argument("--children-age-8-20", type=int, default=0, help="만 8~20세 자녀 수")
    pc.add_argument("--pension-savings", type=int, default=0, help="연금저축·IRP 납입액 (원)")
    pc.add_argument("--medical-expense", type=int, default=0, help="의료비 (원)")
    pc.add_argument("--education-expense", type=int, default=0, help="교육비 (원)")
    pc.add_argument("--monthly-rent-annual", type=int, default=0, help="월세 연간 합계 (원)")
    pc.add_argument("--credit-card-usage", type=int, default=0, help="신용카드 등 합계 (원)")
    pc.add_argument("--housing-subscription", type=int, default=0, help="주택청약 납입액 (원)")
    pc.add_argument("--withheld-tax", type=int, default=0, help="기납부세액 (원)")
    pc.add_argument("--married-newly", action="store_true", help="결혼세액공제 대상 여부")

    sub.add_parser("deduction-table", help="2026 귀속 공제 항목 요약")

    pcc = sub.add_parser("compare-card", help="신용카드 vs 체크카드 절세 비교")
    pcc.add_argument("--total-salary", type=int, required=True, help="총급여 (원)")
    pcc.add_argument("--spending-above-threshold", type=int, required=True, help="총급여 25% 초과 사용액 (원)")

    sub.add_parser("changes-2026", help="2026 귀속 주요 변경사항")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "calculate":
        result = calculate_year_end(
            total_salary=args.total_salary,
            dependents=args.dependents,
            seniors=args.seniors,
            disabled=args.disabled,
            children_age_8_20=args.children_age_8_20,
            pension_savings=args.pension_savings,
            medical_expense=args.medical_expense,
            education_expense=args.education_expense,
            monthly_rent_annual=args.monthly_rent_annual,
            credit_card_usage=args.credit_card_usage,
            housing_subscription=args.housing_subscription,
            withheld_tax=args.withheld_tax,
            married_newly=args.married_newly,
        )
    elif args.cmd == "deduction-table":
        result = deduction_table()
    elif args.cmd == "compare-card":
        result = compare_card(
            total_salary=args.total_salary,
            spending_above_threshold=args.spending_above_threshold,
        )
    elif args.cmd == "changes-2026":
        result = changes_2026()
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
