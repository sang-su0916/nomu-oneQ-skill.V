#!/usr/bin/env python3
"""
양도소득세(부동산) 계산기 — 소득세법 §55 / §94 / §95 / §103 / §104, 시행령 §154

서브커맨드:
  calculate-gain        양도차익 (양도가액 - 취득가액 - 필요경비)
  long-term-deduction   장기보유특별공제 (일반 표1 / 1세대1주택 특례 표2+표3)
  one-house-exemption   1세대1주택 비과세 판정 (12억 고가주택 부분과세 포함)
  basic-tax             기본세율 산출세액 (단기보유 중과 자동 적용)
  full-calc             종합 계산 (위 4개 통합)

CLI:
  python3 calculator.py calculate-gain --sale-price 1500000000 \\
      --acquisition-price 800000000 --necessary-expense 50000000
  python3 calculator.py long-term-deduction --capital-gain 650000000 \\
      --holding-years 10 --is-one-house --residence-years 10
  python3 calculator.py one-house-exemption --sale-price 1100000000 \\
      --holding-years 5 --residence-years 2
  python3 calculator.py basic-tax --taxable-gain 127500000
  python3 calculator.py full-calc --sale-price 1500000000 \\
      --acquisition-price 800000000 --holding-years 10

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 금액은 int (원 단위 절사)
  - JSON 출력: ensure_ascii=False, indent=2
  - 2주택·3주택 조정지역 중과는 현재 유예 상태 (disclaimer 참고)
  - 부동산 양도세 기준. 비상장주식 양도세는 별개 체계.
"""

import argparse
import json
import sys

# ─── 상수 (소득세법 §55, 종소세와 동일 8단계 누진세율) ─────────────────────────
# income-tax 스킬과 동일한 TAX_BRACKETS 사용 (소득세법 §55)
CAPITAL_GAINS_BRACKETS = [
    (14_000_000,    0.06,          0),
    (50_000_000,    0.15,  1_260_000),
    (88_000_000,    0.24,  5_760_000),
    (150_000_000,   0.35, 15_440_000),
    (300_000_000,   0.38, 19_940_000),
    (500_000_000,   0.40, 25_940_000),
    (1_000_000_000, 0.42, 35_940_000),
    (float("inf"),  0.45, 65_940_000),
]

# 지방소득세 (지방세법 §92, 산출세액의 10%)
LOCAL_TAX_RATE = 0.10

# 1세대1주택 고가주택 기준 (소득세법 시행령 §154, 2021.12.8 개정)
HIGH_PRICE_THRESHOLD = 1_200_000_000  # 12억원

# 양도소득 기본공제 (소득세법 §103)
DEFAULT_BASIC_DEDUCTION = 2_500_000  # 연 250만원

DISCLAIMER = (
    "2026년 기준 양도소득세법. 조정대상지역·다주택자 중과(2주택 +20%p, 3주택 +30%p)는 "
    "현재 유예 상태 — 정부 정책에 따라 변동되므로 실제 신고 시 국세청·세무 전문가 확인 필수. "
    "비사업용 토지·비거주자·감정가 기준 등 예외는 미반영. 지방소득세는 소득세의 10%로 단순 계산."
)


# ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _lookup_bracket(taxable_gain: int) -> tuple[int | float, float, int]:
    """과세표준이 속한 구간 반환 (상한, 세율, 누진공제)."""
    for upper, rate, deduction in CAPITAL_GAINS_BRACKETS:
        if taxable_gain <= upper:
            return upper, rate, deduction
    return CAPITAL_GAINS_BRACKETS[-1]


def _basic_rate_tax(taxable_gain: int) -> tuple[int, int, int]:
    """기본세율 적용 산출세액 (국세, 지방세, 합계)."""
    if taxable_gain <= 0:
        return 0, 0, 0
    _, rate, deduction = _lookup_bracket(taxable_gain)
    national = max(0, int(taxable_gain * rate - deduction))
    local = int(national * LOCAL_TAX_RATE)
    return national, local, national + local


def _long_term_rate(holding_years: int, is_one_house: bool, residence_years: int) -> tuple[float, str]:
    """장기보유특별공제율 + 표 설명."""
    # 1세대1주택 특례 (표2 보유 + 표3 거주) — 둘 다 3년 이상일 때만 특례 적용
    if is_one_house and holding_years >= 3 and residence_years >= 3:
        # 표2: 3년 12%, 이후 연 4%p, 10년 이상 40%
        hold_rate = min(0.40, 0.12 + (holding_years - 3) * 0.04)
        # 표3: 3년 12%, 이후 연 4%p, 10년 이상 40%
        resid_rate = min(0.40, 0.12 + (residence_years - 3) * 0.04)
        total = min(0.80, hold_rate + resid_rate)
        label = (
            f"1세대1주택 특례 (표2 보유 {int(hold_rate*100)}% "
            f"+ 표3 거주 {int(resid_rate*100)}% = {int(total*100)}%)"
        )
        return round(total, 4), label

    # 일반 (표1): 3년 미만 0%, 3년 이상 (holding-2)*2%p, 최대 30%
    if holding_years < 3:
        return 0.0, "일반 표1 (3년 미만 미적용)"
    rate = min(0.30, (holding_years - 2) * 0.02)
    return round(rate, 4), f"일반 표1 ({holding_years}년 보유 → {int(rate*100)}%)"


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

def calculate_gain(sale_price: int, acquisition_price: int, necessary_expense: int = 0) -> dict:
    """양도차익 산정 (소득세법 §94).

    양도차익 = 양도가액 - 취득가액 - 필요경비(자본적지출·양도비용)
    """
    if sale_price < 0 or acquisition_price < 0 or necessary_expense < 0:
        return {"error": "금액은 0 이상이어야 합니다"}

    capital_gain = sale_price - acquisition_price - necessary_expense
    return {
        "mode": "calculate-gain",
        "sale_price": sale_price,
        "acquisition_price": acquisition_price,
        "necessary_expense": necessary_expense,
        "capital_gain": capital_gain,
        "formula": "양도차익 = 양도가액 - 취득가액 - 필요경비",
        "legal_basis": "소득세법 §94",
        "disclaimer": DISCLAIMER,
    }


def long_term_deduction(
    capital_gain: int,
    holding_years: int,
    is_one_house: bool = False,
    residence_years: int = 0,
) -> dict:
    """장기보유특별공제 (소득세법 §95).

    - 일반 표1: 3년 6% → 연 2%p → 15년 이상 30% (최대)
    - 1세대1주택 특례 (표2+표3): 거주3년·보유3년 이상일 때 보유 40% + 거주 40% = 최대 80%
    """
    if capital_gain < 0:
        return {"error": "양도차익은 0 이상이어야 합니다"}
    if holding_years < 0 or residence_years < 0:
        return {"error": "보유·거주연수는 0 이상이어야 합니다"}

    rate, label = _long_term_rate(holding_years, is_one_house, residence_years)
    deduction_amount = int(capital_gain * rate)
    gain_after = capital_gain - deduction_amount

    return {
        "mode": "long-term-deduction",
        "capital_gain": capital_gain,
        "holding_years": holding_years,
        "is_one_house": is_one_house,
        "residence_years": residence_years,
        "deduction_rate": rate,
        "deduction_table": label,
        "deduction_amount": deduction_amount,
        "gain_after_deduction": gain_after,
        "legal_basis": "소득세법 §95",
        "disclaimer": DISCLAIMER,
    }


def one_house_exemption(
    sale_price: int,
    holding_years: int,
    residence_years: int = 0,
    in_adjusted_area: bool = False,
    acquired_after_2017_08_03: bool = False,
    capital_gain: int | None = None,
) -> dict:
    """1세대1주택 비과세 판정 (소득세법 시행령 §154).

    요건:
      - 보유 2년 이상
      - 조정대상지역(2017.8.3 이후 취득분)은 거주 2년 이상 추가
      - 양도가액 12억 이하 → 전액 비과세
      - 양도가액 12억 초과 → 초과분만 과세 (고가주택 부분과세)
    """
    if sale_price < 0:
        return {"error": "양도가액은 0 이상이어야 합니다"}

    reasons: list[str] = []
    disqualified: list[str] = []

    # 보유요건
    if holding_years >= 2:
        reasons.append(f"보유 {holding_years}년 (2년 이상)")
    else:
        disqualified.append(f"보유 {holding_years}년 (2년 미만)")

    # 거주요건 (조정대상지역 + 2017.8.3 이후 취득)
    residence_required = in_adjusted_area and acquired_after_2017_08_03
    if residence_required:
        if residence_years >= 2:
            reasons.append(f"조정대상지역 거주 {residence_years}년 (2년 이상)")
        else:
            disqualified.append(
                f"조정대상지역(2017.8.3 이후 취득) 거주 {residence_years}년 (2년 미만)"
            )

    eligible = len(disqualified) == 0

    result: dict = {
        "mode": "one-house-exemption",
        "sale_price": sale_price,
        "holding_years": holding_years,
        "residence_years": residence_years,
        "in_adjusted_area": in_adjusted_area,
        "acquired_after_2017_08_03": acquired_after_2017_08_03,
        "threshold": HIGH_PRICE_THRESHOLD,
        "legal_basis": "소득세법 시행령 §154",
        "disclaimer": DISCLAIMER,
    }

    if not eligible:
        result.update({
            "exempt_fully": False,
            "eligible": False,
            "taxable_gain": capital_gain if capital_gain is not None else None,
            "reasons": reasons,
            "disqualification_reasons": disqualified,
            "note": "1세대1주택 비과세 요건 미충족 — 전액 과세 대상",
        })
        return result

    # 요건 충족: 12억 이하 전액 비과세, 초과 시 부분과세
    if sale_price <= HIGH_PRICE_THRESHOLD:
        reasons.append(f"양도가액 {sale_price:,}원 (12억 이하)")
        result.update({
            "exempt_fully": True,
            "eligible": True,
            "taxable_gain": 0,
            "reasons": reasons,
        })
        return result

    # 고가주택 부분과세
    reasons.append(f"양도가액 {sale_price:,}원 (12억 초과 — 고가주택 부분과세)")
    if capital_gain is None:
        result.update({
            "exempt_fully": False,
            "eligible": True,
            "taxable_gain": None,
            "reasons": reasons,
            "note": (
                "양도차익(--capital-gain) 입력 시 과세 양도차익 자동 산정. "
                "taxable_gain = capital_gain × (양도가액 - 12억) / 양도가액"
            ),
        })
        return result

    if capital_gain < 0:
        return {"error": "capital_gain은 0 이상이어야 합니다"}

    taxable_gain = int(capital_gain * (sale_price - HIGH_PRICE_THRESHOLD) / sale_price)
    exempt_gain = capital_gain - taxable_gain
    result.update({
        "exempt_fully": False,
        "eligible": True,
        "capital_gain": capital_gain,
        "exempt_gain": exempt_gain,
        "taxable_gain": taxable_gain,
        "reasons": reasons,
        "formula": "과세 양도차익 = 양도차익 × (양도가액 - 12억) / 양도가액",
    })
    return result


def basic_tax(
    taxable_gain: int,
    short_term_months: int | None = None,
    asset_type: str = "house",
) -> dict:
    """기본세율 산출세액 (소득세법 §55, §104).

    단기보유 중과 (§104, 주택·조합원입주권·분양권):
      - 주택: 1년 미만 70%, 1~2년 60%
      - 토지·기타: 1년 미만 50%, 1~2년 40%
      - 24개월 이상 → 기본세율 적용
    """
    if taxable_gain < 0:
        return {"error": "과세표준은 0 이상이어야 합니다"}
    if asset_type not in ("house", "land", "stock-other"):
        return {"error": "asset_type은 house / land / stock-other 중 하나여야 합니다"}

    # 단기보유 판정
    short_rate: float | None = None
    short_label = ""
    if short_term_months is not None and short_term_months >= 0:
        if asset_type == "house":
            if short_term_months < 12:
                short_rate, short_label = 0.70, "주택 단기보유 1년 미만 70% (§104)"
            elif short_term_months < 24:
                short_rate, short_label = 0.60, "주택 단기보유 1~2년 미만 60% (§104)"
        elif asset_type == "land":
            if short_term_months < 12:
                short_rate, short_label = 0.50, "토지·기타 단기보유 1년 미만 50% (§104)"
            elif short_term_months < 24:
                short_rate, short_label = 0.40, "토지·기타 단기보유 1~2년 미만 40% (§104)"

    if short_rate is not None:
        national = int(taxable_gain * short_rate)
        local = int(national * LOCAL_TAX_RATE)
        return {
            "mode": "basic-tax",
            "taxable_gain": taxable_gain,
            "method": "short-term-heavy-tax",
            "asset_type": asset_type,
            "short_term_months": short_term_months,
            "applied_rate_label": short_label,
            "applied_rate": short_rate,
            "income_tax": national,
            "local_tax": local,
            "total_tax": national + local,
            "formula": "과세표준 × 단일세율 + 지방세(소득세의 10%)",
            "legal_basis": "소득세법 §104",
            "disclaimer": DISCLAIMER,
        }

    # 기본세율 8단계 누진
    national, local, total = _basic_rate_tax(taxable_gain)
    _, rate, deduction = _lookup_bracket(taxable_gain) if taxable_gain > 0 else (0, 0.0, 0)
    return {
        "mode": "basic-tax",
        "taxable_gain": taxable_gain,
        "method": "basic-rate",
        "asset_type": asset_type,
        "short_term_months": short_term_months,
        "applied_rate_label": "종합소득세율 6~45% 8단계",
        "marginal_rate_pct": int(rate * 100) if taxable_gain > 0 else 0,
        "progressive_deduction": deduction if taxable_gain > 0 else 0,
        "income_tax": national,
        "local_tax": local,
        "total_tax": total,
        "formula": "과세표준 × 세율 - 누진공제 + 지방세(소득세의 10%)",
        "legal_basis": "소득세법 §55, §104",
        "disclaimer": DISCLAIMER,
    }


def full_calc(
    sale_price: int,
    acquisition_price: int,
    necessary_expense: int = 0,
    holding_years: int = 0,
    is_one_house: bool = False,
    residence_years: int = 0,
    in_adjusted_area: bool = False,
    acquired_after_2017_08_03: bool = False,
    short_term_months: int | None = None,
    asset_type: str = "house",
    basic_deduction: int = DEFAULT_BASIC_DEDUCTION,
) -> dict:
    """종합 계산: 양도차익 → 장특공 → 기본공제 → 과세표준 → 산출세액."""
    gain_result = calculate_gain(sale_price, acquisition_price, necessary_expense)
    if "error" in gain_result:
        return gain_result
    capital_gain = gain_result["capital_gain"]

    # 1세대1주택 비과세 판정 (고가주택 부분과세 포함)
    taxable_base_gain = capital_gain
    exemption_block: dict | None = None
    if is_one_house:
        exemption_block = one_house_exemption(
            sale_price=sale_price,
            holding_years=holding_years,
            residence_years=residence_years,
            in_adjusted_area=in_adjusted_area,
            acquired_after_2017_08_03=acquired_after_2017_08_03,
            capital_gain=capital_gain,
        )
        if exemption_block.get("eligible"):
            if exemption_block.get("exempt_fully"):
                taxable_base_gain = 0
            elif exemption_block.get("taxable_gain") is not None:
                taxable_base_gain = exemption_block["taxable_gain"]

    # 장기보유특별공제
    ltd_result = long_term_deduction(
        capital_gain=taxable_base_gain,
        holding_years=holding_years,
        is_one_house=is_one_house,
        residence_years=residence_years,
    )
    gain_after_ltd = ltd_result.get("gain_after_deduction", taxable_base_gain)

    # 기본공제 (연 250만)
    taxable_gain = max(0, gain_after_ltd - basic_deduction)

    # 산출세액
    tax_result = basic_tax(
        taxable_gain=taxable_gain,
        short_term_months=short_term_months,
        asset_type=asset_type,
    )

    return {
        "mode": "full-calc",
        "inputs": {
            "sale_price": sale_price,
            "acquisition_price": acquisition_price,
            "necessary_expense": necessary_expense,
            "holding_years": holding_years,
            "is_one_house": is_one_house,
            "residence_years": residence_years,
            "in_adjusted_area": in_adjusted_area,
            "acquired_after_2017_08_03": acquired_after_2017_08_03,
            "short_term_months": short_term_months,
            "asset_type": asset_type,
            "basic_deduction": basic_deduction,
        },
        "step1_capital_gain": gain_result,
        "step2_one_house_exemption": exemption_block,
        "step3_long_term_deduction": ltd_result,
        "step4_basic_deduction": {
            "gain_after_ltd": gain_after_ltd,
            "basic_deduction": basic_deduction,
            "taxable_gain": taxable_gain,
            "legal_basis": "소득세법 §103",
        },
        "step5_tax": tax_result,
        "summary": {
            "capital_gain": capital_gain,
            "taxable_gain_after_exemption": taxable_base_gain,
            "deduction_amount": ltd_result.get("deduction_amount", 0),
            "taxable_gain": taxable_gain,
            "income_tax": tax_result.get("income_tax", 0),
            "local_tax": tax_result.get("local_tax", 0),
            "total_tax": tax_result.get("total_tax", 0),
        },
        "legal_basis": "소득세법 §55, §94, §95, §103, §104, 시행령 §154",
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="양도소득세(부동산) 계산기 — 소득세법 §55/§94/§95/§103/§104, 시행령 §154",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # calculate-gain
    p_gain = sub.add_parser("calculate-gain", help="양도차익 = 양도가액 - 취득가액 - 필요경비")
    p_gain.add_argument("--sale-price", type=int, required=True, help="양도가액 (원)")
    p_gain.add_argument("--acquisition-price", type=int, required=True, help="취득가액 (원)")
    p_gain.add_argument("--necessary-expense", type=int, default=0,
                        help="필요경비 (자본적지출·양도비용, 원). 기본값 0")

    # long-term-deduction
    p_ltd = sub.add_parser("long-term-deduction", help="장기보유특별공제 (소득세법 §95)")
    p_ltd.add_argument("--capital-gain", type=int, required=True, help="양도차익 (원)")
    p_ltd.add_argument("--holding-years", type=int, required=True, help="보유연수 (정수)")
    p_ltd.add_argument("--is-one-house", action="store_true", help="1세대1주택 여부")
    p_ltd.add_argument("--residence-years", type=int, default=0,
                       help="거주연수 (1세대1주택 특례 적용 시 필수, 정수)")

    # one-house-exemption
    p_ex = sub.add_parser("one-house-exemption",
                          help="1세대1주택 비과세 판정 (고가주택 12억 부분과세 포함)")
    p_ex.add_argument("--sale-price", type=int, required=True, help="양도가액 (원)")
    p_ex.add_argument("--holding-years", type=int, required=True, help="보유연수")
    p_ex.add_argument("--residence-years", type=int, default=0, help="거주연수")
    p_ex.add_argument("--in-adjusted-area", action="store_true", help="조정대상지역 주택 여부")
    p_ex.add_argument("--acquired-after-2017-08-03", action="store_true",
                      help="2017.8.3 이후 취득 여부")
    p_ex.add_argument("--capital-gain", type=int, default=None,
                      help="양도차익 (선택) — 12억 초과분 과세 계산용")

    # basic-tax
    p_tax = sub.add_parser("basic-tax", help="기본세율 산출세액 (+ 단기보유 중과 자동 적용)")
    p_tax.add_argument("--taxable-gain", type=int, required=True,
                       help="과세표준 (양도차익 - 장특공 - 기본공제)")
    p_tax.add_argument("--short-term-months", type=int, default=None,
                       help="보유월수 (선택 — 단기보유 중과 판정용)")
    p_tax.add_argument("--asset-type", choices=("house", "land", "stock-other"),
                       default="house", help="자산 종류 (기본 house)")

    # full-calc
    p_full = sub.add_parser("full-calc", help="양도차익→장특공→기본공제→산출세액 종합")
    p_full.add_argument("--sale-price", type=int, required=True)
    p_full.add_argument("--acquisition-price", type=int, required=True)
    p_full.add_argument("--necessary-expense", type=int, default=0)
    p_full.add_argument("--holding-years", type=int, required=True)
    p_full.add_argument("--is-one-house", action="store_true")
    p_full.add_argument("--residence-years", type=int, default=0)
    p_full.add_argument("--in-adjusted-area", action="store_true")
    p_full.add_argument("--acquired-after-2017-08-03", action="store_true")
    p_full.add_argument("--short-term-months", type=int, default=None)
    p_full.add_argument("--asset-type", choices=("house", "land", "stock-other"),
                        default="house")
    p_full.add_argument("--basic-deduction", type=int, default=DEFAULT_BASIC_DEDUCTION,
                        help=f"양도소득 기본공제 (기본값 {DEFAULT_BASIC_DEDUCTION:,}원, §103)")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "calculate-gain":
        result = calculate_gain(
            sale_price=args.sale_price,
            acquisition_price=args.acquisition_price,
            necessary_expense=args.necessary_expense,
        )
    elif args.cmd == "long-term-deduction":
        result = long_term_deduction(
            capital_gain=args.capital_gain,
            holding_years=args.holding_years,
            is_one_house=args.is_one_house,
            residence_years=args.residence_years,
        )
    elif args.cmd == "one-house-exemption":
        result = one_house_exemption(
            sale_price=args.sale_price,
            holding_years=args.holding_years,
            residence_years=args.residence_years,
            in_adjusted_area=args.in_adjusted_area,
            acquired_after_2017_08_03=args.acquired_after_2017_08_03,
            capital_gain=args.capital_gain,
        )
    elif args.cmd == "basic-tax":
        result = basic_tax(
            taxable_gain=args.taxable_gain,
            short_term_months=args.short_term_months,
            asset_type=args.asset_type,
        )
    elif args.cmd == "full-calc":
        result = full_calc(
            sale_price=args.sale_price,
            acquisition_price=args.acquisition_price,
            necessary_expense=args.necessary_expense,
            holding_years=args.holding_years,
            is_one_house=args.is_one_house,
            residence_years=args.residence_years,
            in_adjusted_area=args.in_adjusted_area,
            acquired_after_2017_08_03=args.acquired_after_2017_08_03,
            short_term_months=args.short_term_months,
            asset_type=args.asset_type,
            basic_deduction=args.basic_deduction,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
