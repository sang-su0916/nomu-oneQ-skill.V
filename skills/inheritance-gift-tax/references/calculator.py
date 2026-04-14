#!/usr/bin/env python3
"""
상속세·증여세 계산기 — 상속세 및 증여세법 §18 / §19 / §21 / §26 / §53 / §53의2

서브커맨드:
  inheritance      상속세 계산 (기초·배우자·일괄공제 → 과세표준 → 산출세액)
  gift             증여세 계산 (§53 증여재산공제 → 과세표준 → 산출세액)
  marriage-birth   혼인·출산공제 시뮬레이션 (§53의2, 합산 1억 한도)
  compare          상속 vs 증여 비교 (동일 재산가액 기준)

CLI:
  python3 calculator.py inheritance --estate 2000000000 \\
      --spouse-deduction 500000000 --lump-sum-deduction 500000000
  python3 calculator.py gift --gift-amount 100000000 --relation lineal-descendant
  python3 calculator.py marriage-birth --gift-amount 150000000 \\
      --marriage-deduction 100000000 --birth-deduction 0
  python3 calculator.py compare --estate 2000000000 --spouse-deduction 500000000 \\
      --lump-sum-deduction 500000000 --relation lineal-descendant

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 금액은 int (원 단위 절사)
  - JSON 출력: ensure_ascii=False, indent=2
  - 2026-04-14 법제처 조회 기준 (상증세법 개편 논의 별도)
  - 비거주자·법인 증여 제외
"""

import argparse
import json
import sys

# ─── 상수 (상증세법 §26, 5단계 누진세율 — 상속세·증여세 동일) ──────────────────
# 법제처 law.go.kr 팩트체크 완료 (2026-04-14)
# 각 튜플: (상한 과세표준, 세율, 누진공제액)
TAX_BRACKETS = [
    (100_000_000,         0.10,          0),
    (500_000_000,         0.20,  10_000_000),
    (1_000_000_000,       0.30,  60_000_000),
    (3_000_000_000,       0.40, 160_000_000),
    (float("inf"),        0.50, 460_000_000),
]

# 상속공제 (상증세법 §18~§21)
BASIC_INHERITANCE_DEDUCTION = 200_000_000       # 기초공제 2억 (§18)
LUMP_SUM_DEDUCTION_MIN = 500_000_000            # 일괄공제 최저 5억 (§21)
SPOUSE_DEDUCTION_MIN = 500_000_000              # 배우자 실제상속 5억 미만 시 (§19)
SPOUSE_DEDUCTION_MAX = 3_000_000_000            # 배우자공제 한도 30억 (§19)

# 증여재산공제 (상증세법 §53, 10년 합산)
GIFT_DEDUCTIONS = {
    "spouse":            600_000_000,  # 배우자 6억
    "lineal-ascendant":   50_000_000,  # 직계존속 5천만
    "lineal-ascendant-minor": 20_000_000,  # 직계존속 → 미성년자 2천만
    "lineal-descendant":  50_000_000,  # 직계비속 5천만
    "other-relative":     10_000_000,  # 기타친족 (4촌 혈족·3촌 인척) 1천만
}

# 혼인·출산공제 (상증세법 §53의2)
MARRIAGE_BIRTH_CAP = 100_000_000  # 합산 1억 한도 (§53의2③)

DISCLAIMER = (
    "2026-04-14 법제처 조회 기준 상증세법. 비거주자·법인 증여, 특별연부공제·동거주택 상속공제, "
    "가업상속공제·영농상속공제, 합산과세(10년 내 증여합산) 등은 미반영. "
    "실제 신고 시 국세청·세무 전문가 확인 필수."
)


# ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _lookup_bracket(taxable_base: int) -> tuple[int | float, float, int]:
    """과세표준이 속한 구간 반환 (상한, 세율, 누진공제)."""
    for upper, rate, deduction in TAX_BRACKETS:
        if taxable_base <= upper:
            return upper, rate, deduction
    return TAX_BRACKETS[-1]


def _progressive_tax(taxable_base: int) -> tuple[int, int, int]:
    """상증세법 §26 산출세액 (국세, 한계세율%, 누진공제)."""
    if taxable_base <= 0:
        return 0, 0, 0
    _, rate, deduction = _lookup_bracket(taxable_base)
    national = max(0, int(taxable_base * rate - deduction))
    return national, int(rate * 100), deduction


def _bracket_desc(upper: int | float, rate: float, deduction: int) -> str:
    """사람이 읽기 좋은 구간 설명."""
    if upper == float("inf"):
        lo = TAX_BRACKETS[-2][0]
        return f"{lo:,}원 초과 구간 (세율 {int(rate*100)}%, 누진공제 {deduction:,}원)"
    idx = next(i for i, (u, _, _) in enumerate(TAX_BRACKETS) if u == upper)
    lo = 0 if idx == 0 else TAX_BRACKETS[idx - 1][0]
    return (
        f"{lo:,}원 초과 ~ {int(upper):,}원 이하 "
        f"(세율 {int(rate*100)}%, 누진공제 {deduction:,}원)"
    )


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

def inheritance_tax(
    estate: int,
    spouse_deduction: int = 0,
    lump_sum_deduction: int = LUMP_SUM_DEDUCTION_MIN,
    basic_deduction: int = BASIC_INHERITANCE_DEDUCTION,
    other_deduction: int = 0,
) -> dict:
    """상속세 계산 (상증세법 §18, §19, §21, §26).

    과세표준 = 상속재산가액 - (기초공제 2억 + 기타인적공제) 또는 일괄공제(5억) 중 큰 금액
              - 배우자 상속공제
              - 기타 공제

    간이 로직:
      - 일괄공제(5억) vs 기초공제(2억)+기타인적공제 → 큰 쪽 적용
      - 배우자공제는 별도 (min 30억, 실제상속 5억 미만 시 5억)
    """
    if estate < 0:
        return {"error": "상속재산가액은 0 이상이어야 합니다"}

    # 일괄공제 vs 기초+기타 비교
    basic_plus_other = basic_deduction + other_deduction
    applied_lump_sum = max(lump_sum_deduction, basic_plus_other)
    if applied_lump_sum < LUMP_SUM_DEDUCTION_MIN and lump_sum_deduction == LUMP_SUM_DEDUCTION_MIN:
        applied_lump_sum = LUMP_SUM_DEDUCTION_MIN

    # 배우자 공제 한도 검증 (30억 cap)
    spouse_applied = min(max(0, spouse_deduction), SPOUSE_DEDUCTION_MAX)

    total_deduction = applied_lump_sum + spouse_applied
    taxable_base = max(0, estate - total_deduction)

    national, marginal_rate, progressive_deduction = _progressive_tax(taxable_base)
    upper, rate, pd = _lookup_bracket(taxable_base) if taxable_base > 0 else (0, 0.0, 0)

    return {
        "mode": "inheritance",
        "estate": estate,
        "deductions": {
            "basic_deduction": basic_deduction,
            "other_deduction": other_deduction,
            "lump_sum_applied": applied_lump_sum,
            "spouse_deduction": spouse_applied,
            "total_deduction": total_deduction,
        },
        "taxable_base": taxable_base,
        "marginal_rate_pct": marginal_rate,
        "progressive_deduction": progressive_deduction,
        "calculated_tax": national,
        "calculation": (
            f"{taxable_base:,} × {marginal_rate}% - {progressive_deduction:,} = {national:,}원"
            if taxable_base > 0 else "과세표준 0 → 산출세액 0"
        ),
        "bracket": _bracket_desc(upper, rate, pd) if taxable_base > 0 else "-",
        "legal_basis": "상증세법 §18, §19, §21, §26",
        "disclaimer": DISCLAIMER,
    }


def gift_tax(
    gift_amount: int,
    relation: str = "lineal-descendant",
    is_minor: bool = False,
    prior_deduction_used: int = 0,
) -> dict:
    """증여세 계산 (상증세법 §26, §53).

    과세표준 = 증여재산가액 - §53 증여재산공제(10년 합산, 직전 10년 내 공제액 차감)
    산출세액 = 과세표준 × 세율 - 누진공제
    """
    if gift_amount < 0:
        return {"error": "증여재산가액은 0 이상이어야 합니다"}
    if prior_deduction_used < 0:
        return {"error": "prior_deduction_used는 0 이상이어야 합니다"}

    # 관계별 공제 한도
    key = relation
    if relation == "lineal-ascendant" and is_minor:
        key = "lineal-ascendant-minor"
    if key not in GIFT_DEDUCTIONS:
        return {
            "error": (
                f"relation은 {list(GIFT_DEDUCTIONS.keys())} 중 하나여야 합니다 "
                f"(is_minor=True일 때 lineal-ascendant → lineal-ascendant-minor 자동 적용)"
            )
        }

    cap = GIFT_DEDUCTIONS[key]
    remaining_cap = max(0, cap - prior_deduction_used)
    applied_deduction = min(gift_amount, remaining_cap)
    taxable_base = max(0, gift_amount - applied_deduction)

    national, marginal_rate, progressive_deduction = _progressive_tax(taxable_base)
    upper, rate, pd = _lookup_bracket(taxable_base) if taxable_base > 0 else (0, 0.0, 0)

    return {
        "mode": "gift",
        "gift_amount": gift_amount,
        "relation": relation,
        "is_minor": is_minor,
        "deduction_cap": cap,
        "prior_deduction_used": prior_deduction_used,
        "applied_deduction": applied_deduction,
        "taxable_base": taxable_base,
        "marginal_rate_pct": marginal_rate,
        "progressive_deduction": progressive_deduction,
        "calculated_tax": national,
        "calculation": (
            f"{taxable_base:,} × {marginal_rate}% - {progressive_deduction:,} = {national:,}원"
            if taxable_base > 0 else "과세표준 0 → 산출세액 0"
        ),
        "bracket": _bracket_desc(upper, rate, pd) if taxable_base > 0 else "-",
        "legal_basis": "상증세법 §26, §53",
        "disclaimer": DISCLAIMER,
    }


def marriage_birth(
    gift_amount: int,
    marriage_deduction: int = 0,
    birth_deduction: int = 0,
    relation_deduction_used: int = 0,
    is_minor: bool = False,
) -> dict:
    """혼인·출산공제 시뮬레이션 (상증세법 §53의2).

    - 혼인공제: 혼인일 전후 2년, 1억 한도
    - 출산공제: 출생·입양일부터 2년, 1억 한도
    - ⚠️ ③항 핵심: 혼인공제 + 출산공제 합산 1억 한도 (둘 다 받아도 최대 1억)
    - §53(직계존속 5천만) 공제와 별개로 추가 적용

    본 함수는 직계존속으로부터의 증여 기준.
    relation_deduction_used: §53 직계존속 공제 중 이미 사용한 금액 (10년 내)
    """
    if gift_amount < 0:
        return {"error": "증여재산가액은 0 이상이어야 합니다"}
    if marriage_deduction < 0 or birth_deduction < 0:
        return {"error": "혼인·출산공제 금액은 0 이상이어야 합니다"}
    if relation_deduction_used < 0:
        return {"error": "relation_deduction_used는 0 이상이어야 합니다"}

    # §53 직계존속 공제 한도
    key = "lineal-ascendant-minor" if is_minor else "lineal-ascendant"
    relation_cap = GIFT_DEDUCTIONS[key]
    relation_remaining = max(0, relation_cap - relation_deduction_used)
    relation_applied = min(gift_amount, relation_remaining)

    # §53의2 혼인+출산 합산 1억 한도 (③항)
    requested_mb = marriage_deduction + birth_deduction
    cap_applied_mb = min(requested_mb, MARRIAGE_BIRTH_CAP)

    # 요청액을 한도에 비례 배분 (혼인·출산 각각 추적)
    if requested_mb > 0:
        marriage_applied = int(marriage_deduction * cap_applied_mb / requested_mb)
        birth_applied = cap_applied_mb - marriage_applied  # 잔차 흡수
    else:
        marriage_applied = 0
        birth_applied = 0

    # 남은 증여가액에만 §53의2 적용
    gift_after_relation = gift_amount - relation_applied
    mb_applied_final = min(gift_after_relation, cap_applied_mb)
    # 비례 재조정
    if cap_applied_mb > 0 and mb_applied_final < cap_applied_mb:
        scale = mb_applied_final / cap_applied_mb
        marriage_applied = int(marriage_applied * scale)
        birth_applied = mb_applied_final - marriage_applied

    total_deduction = relation_applied + marriage_applied + birth_applied
    taxable_base = max(0, gift_amount - total_deduction)

    national, marginal_rate, progressive_deduction = _progressive_tax(taxable_base)

    # 한도 초과 경고
    warnings: list[str] = []
    if requested_mb > MARRIAGE_BIRTH_CAP:
        warnings.append(
            f"혼인({marriage_deduction:,}) + 출산({birth_deduction:,}) = {requested_mb:,}원 요청. "
            f"§53의2③ 합산 1억 한도 적용 → 실제 공제 {cap_applied_mb:,}원"
        )

    return {
        "mode": "marriage-birth",
        "gift_amount": gift_amount,
        "relation_deduction": {
            "cap": relation_cap,
            "prior_used": relation_deduction_used,
            "applied": relation_applied,
            "legal_basis": "상증세법 §53 (직계존속)",
        },
        "marriage_birth_deduction": {
            "marriage_requested": marriage_deduction,
            "birth_requested": birth_deduction,
            "sum_requested": requested_mb,
            "sum_cap": MARRIAGE_BIRTH_CAP,
            "marriage_applied": marriage_applied,
            "birth_applied": birth_applied,
            "total_applied": marriage_applied + birth_applied,
            "legal_basis": "상증세법 §53의2 (혼인·출산공제, ③항 합산 1억 한도)",
        },
        "total_deduction": total_deduction,
        "taxable_base": taxable_base,
        "marginal_rate_pct": marginal_rate,
        "progressive_deduction": progressive_deduction,
        "calculated_tax": national,
        "warnings": warnings,
        "legal_basis": "상증세법 §26, §53, §53의2",
        "disclaimer": DISCLAIMER,
    }


def compare_inheritance_gift(
    estate: int,
    spouse_deduction: int = 0,
    lump_sum_deduction: int = LUMP_SUM_DEDUCTION_MIN,
    basic_deduction: int = BASIC_INHERITANCE_DEDUCTION,
    other_deduction: int = 0,
    relation: str = "lineal-descendant",
    is_minor: bool = False,
    prior_deduction_used: int = 0,
) -> dict:
    """상속 vs 증여 비교 (동일 재산가액에 대해 어느 쪽이 유리한지)."""
    if estate < 0:
        return {"error": "재산가액은 0 이상이어야 합니다"}

    inh = inheritance_tax(
        estate=estate,
        spouse_deduction=spouse_deduction,
        lump_sum_deduction=lump_sum_deduction,
        basic_deduction=basic_deduction,
        other_deduction=other_deduction,
    )
    gft = gift_tax(
        gift_amount=estate,
        relation=relation,
        is_minor=is_minor,
        prior_deduction_used=prior_deduction_used,
    )

    inh_tax = inh.get("calculated_tax", 0)
    gft_tax = gft.get("calculated_tax", 0)

    if inh_tax < gft_tax:
        verdict = "상속이 유리"
        diff = gft_tax - inh_tax
    elif gft_tax < inh_tax:
        verdict = "증여가 유리"
        diff = inh_tax - gft_tax
    else:
        verdict = "동일"
        diff = 0

    return {
        "mode": "compare",
        "amount": estate,
        "inheritance": {
            "taxable_base": inh.get("taxable_base"),
            "calculated_tax": inh_tax,
            "total_deduction": inh.get("deductions", {}).get("total_deduction"),
        },
        "gift": {
            "taxable_base": gft.get("taxable_base"),
            "calculated_tax": gft_tax,
            "applied_deduction": gft.get("applied_deduction"),
            "relation": relation,
        },
        "verdict": verdict,
        "difference": diff,
        "note": (
            "상속·증여는 공제구조가 다르므로 단순 비교만으로 결정 금지. "
            "자산 종류(부동산·현금·주식), 수증자 수, 10년 합산과세, "
            "사후관리·가업승계 특례, 감정평가 등 종합 고려 필요."
        ),
        "legal_basis": "상증세법 §18, §19, §21, §26, §53",
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="상속세·증여세 계산기 (상증세법 §18/§19/§21/§26/§53/§53의2)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # inheritance
    p_inh = sub.add_parser("inheritance", help="상속세 계산")
    p_inh.add_argument("--estate", type=int, required=True, help="상속재산가액 (원)")
    p_inh.add_argument("--spouse-deduction", type=int, default=0,
                       help="배우자 상속공제 (원, §19, 한도 30억)")
    p_inh.add_argument("--lump-sum-deduction", type=int, default=LUMP_SUM_DEDUCTION_MIN,
                       help=f"일괄공제 (원, §21, 기본 5억 = {LUMP_SUM_DEDUCTION_MIN:,})")
    p_inh.add_argument("--basic-deduction", type=int, default=BASIC_INHERITANCE_DEDUCTION,
                       help=f"기초공제 (원, §18, 기본 2억 = {BASIC_INHERITANCE_DEDUCTION:,})")
    p_inh.add_argument("--other-deduction", type=int, default=0,
                       help="기타인적공제 합계 (원, 일괄공제와 비교)")

    # gift
    p_gft = sub.add_parser("gift", help="증여세 계산")
    p_gft.add_argument("--gift-amount", type=int, required=True, help="증여재산가액 (원)")
    p_gft.add_argument("--relation", type=str, default="lineal-descendant",
                       choices=list(GIFT_DEDUCTIONS.keys()) + ["lineal-ascendant"],
                       help="수증자·증여자 관계")
    p_gft.add_argument("--is-minor", action="store_true",
                       help="수증자가 미성년자 (직계존속→미성년 2천만 적용)")
    p_gft.add_argument("--prior-deduction-used", type=int, default=0,
                       help="직전 10년 내 해당 관계 공제 사용액 (원)")

    # marriage-birth
    p_mb = sub.add_parser("marriage-birth", help="혼인·출산공제 시뮬레이션")
    p_mb.add_argument("--gift-amount", type=int, required=True,
                      help="직계존속으로부터 증여받은 금액 (원)")
    p_mb.add_argument("--marriage-deduction", type=int, default=0,
                      help="혼인공제 요청액 (원, §53의2, 1억 한도)")
    p_mb.add_argument("--birth-deduction", type=int, default=0,
                      help="출산공제 요청액 (원, §53의2, 1억 한도)")
    p_mb.add_argument("--relation-deduction-used", type=int, default=0,
                      help="§53 직계존속 공제 중 직전 10년 내 사용액 (원)")
    p_mb.add_argument("--is-minor", action="store_true",
                      help="수증자가 미성년자")

    # compare
    p_cmp = sub.add_parser("compare", help="상속 vs 증여 비교")
    p_cmp.add_argument("--estate", type=int, required=True, help="재산가액 (원)")
    p_cmp.add_argument("--spouse-deduction", type=int, default=0)
    p_cmp.add_argument("--lump-sum-deduction", type=int, default=LUMP_SUM_DEDUCTION_MIN)
    p_cmp.add_argument("--basic-deduction", type=int, default=BASIC_INHERITANCE_DEDUCTION)
    p_cmp.add_argument("--other-deduction", type=int, default=0)
    p_cmp.add_argument("--relation", type=str, default="lineal-descendant",
                       choices=list(GIFT_DEDUCTIONS.keys()) + ["lineal-ascendant"])
    p_cmp.add_argument("--is-minor", action="store_true")
    p_cmp.add_argument("--prior-deduction-used", type=int, default=0)

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "inheritance":
        result = inheritance_tax(
            estate=args.estate,
            spouse_deduction=args.spouse_deduction,
            lump_sum_deduction=args.lump_sum_deduction,
            basic_deduction=args.basic_deduction,
            other_deduction=args.other_deduction,
        )
    elif args.cmd == "gift":
        result = gift_tax(
            gift_amount=args.gift_amount,
            relation=args.relation,
            is_minor=args.is_minor,
            prior_deduction_used=args.prior_deduction_used,
        )
    elif args.cmd == "marriage-birth":
        result = marriage_birth(
            gift_amount=args.gift_amount,
            marriage_deduction=args.marriage_deduction,
            birth_deduction=args.birth_deduction,
            relation_deduction_used=args.relation_deduction_used,
            is_minor=args.is_minor,
        )
    elif args.cmd == "compare":
        result = compare_inheritance_gift(
            estate=args.estate,
            spouse_deduction=args.spouse_deduction,
            lump_sum_deduction=args.lump_sum_deduction,
            basic_deduction=args.basic_deduction,
            other_deduction=args.other_deduction,
            relation=args.relation,
            is_minor=args.is_minor,
            prior_deduction_used=args.prior_deduction_used,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
