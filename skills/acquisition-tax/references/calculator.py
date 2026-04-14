#!/usr/bin/env python3
"""
취득세 계산기 — 지방세법 §11 / §13의2

서브커맨드:
  general      일반 유상 주택 취득 (6억 이하 1% / 6~9억 공식세율 / 9억 초과 3%)
  multi-home   다주택 중과 (1세대 2주택·3주택·4주택+, 조정/비조정 구분)
  corporate    법인 주택 유상 취득 중과 (4% + 2%×400% = 12%)
  gift         증여 취득 (기본 3.5%, 조정지역+기준가 초과 12%)
  compare      시나리오 비교 (개인 vs 법인, 조정 vs 비조정)

CLI:
  python3 calculator.py general --acquisition-price 500000000 --area-sqm 84
  python3 calculator.py general --acquisition-price 1200000000 --area-sqm 110
  python3 calculator.py multi-home --acquisition-price 1000000000 --home-count 3 \\
      --in-adjusted-area --area-sqm 84
  python3 calculator.py corporate --acquisition-price 1000000000 --area-sqm 84
  python3 calculator.py gift --acquisition-price 800000000 --in-adjusted-area --area-sqm 84
  python3 calculator.py compare --acquisition-price 1000000000 --area-sqm 84

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 금액은 int (원 단위 절사)
  - JSON 출력: ensure_ascii=False, indent=2
  - 조정대상지역 지정 여부는 국토부 공고 별도 확인 (2026-04 현재 서울 4구만 지정)
  - 법인 대도시 중과 예외, 생애최초 감면 등 개별 특례는 미반영
"""

import argparse
import json
import sys

# ─── 상수 (지방세법 §11, §13의2) ───────────────────────────────────────────────

# 유상 주택 취득 표준세율 (§11①8)
HOUSE_RATE_LOW = 0.01        # 6억원 이하 1%
HOUSE_RATE_HIGH = 0.03       # 9억원 초과 3%
HOUSE_THRESHOLD_LOW = 600_000_000       # 6억원
HOUSE_THRESHOLD_HIGH = 900_000_000      # 9억원

# 기타 표준세율 (§11)
RATE_NON_HOUSE_PURCHASE = 0.04       # 유상 농지 외 기타 4% (§11①7나)
RATE_FARMLAND_PURCHASE = 0.03        # 유상 농지 3% (§11①7가)
RATE_INHERIT_FARMLAND = 0.023        # 상속 농지 2.3% (§11①1가)
RATE_INHERIT_OTHER = 0.028           # 상속 농지 외 2.8% (§11①1나)
RATE_GIFT_DEFAULT = 0.035            # 무상 취득 (증여) 3.5% (§11①2)
RATE_GIFT_NONPROFIT = 0.028          # 비영리사업자 증여 2.8%
RATE_ORIGINAL = 0.028                # 원시취득 2.8% (§11①3)
RATE_PARTITION = 0.023               # 공유분할 2.3% (§11①5,6)

# 중과기준세율 (§6) — 중과 계산용 2%
HEAVY_BASE_RATE = 0.02

# §13의2 다주택·법인 유상 중과
RATE_CORPORATE_HOUSE = 0.12          # 법인 주택 = 4% + 2%×400% = 12%
RATE_MULTI_HOUSE_HEAVY_8 = 0.08      # 4% + 2%×200% = 8%
RATE_MULTI_HOUSE_HEAVY_12 = 0.12     # 4% + 2%×400% = 12%

# §13의2② 조정대상지역 증여 중과 기준금액 (시가표준액 3억원 이상)
GIFT_HEAVY_THRESHOLD = 300_000_000   # 3억원
RATE_GIFT_HEAVY = 0.12               # 증여 중과 12%

# 부가세 (지방세법 / 교육세법 / 농특세법)
NATIONAL_HOUSING_AREA = 85           # 전용면적 85㎡ — 국민주택 규모
RATE_AGRI_SPECIAL = 0.10             # 농어촌특별세 = 취득세액의 10%
# 지방교육세율 (취득세 본세율별, 실무 통용 근사)
#  - 주택 유상 1% → 0.1%, 2% → 0.2%, 3% → 0.3%
#  - 일반 4% → 0.4%, 증여 3.5% → 0.3%, 중과 8%/12% → 0.4%
#  실무상 "본세율의 50%를 2%로 나눈 값" 근사식: local_edu = (본세율 - 2%) × 50% = 본세율의 ½ 수준 ≥0.1%
#  주택 유상은 §151 특례로 고정값 사용.

DISCLAIMER = (
    "2026-04 기준 지방세법. 조정대상지역 지정 여부는 국토부 공고 별도 확인 필요 "
    "(2026-04 현재 서울 강남·서초·송파·용산 4구만 지정). "
    "생애최초 감면·일시적 2주택·대도시 법인 중과 예외·상속 1주택 특례 등 "
    "개별 감면·특례는 미반영. 실제 신고 시 지방자치단체·세무 전문가 확인 필수. "
    "지방교육세는 실무 통용 근사치로 산출."
)


# ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _house_standard_rate(price: int) -> tuple[float, str]:
    """유상 주택 취득 표준세율 (§11①8).

    - 6억 이하: 1%
    - 6억 초과 9억 이하: (가액×2/3억 - 3) × 1/100  (6억 1% → 9억 3% 선형, 소수점 넷째)
    - 9억 초과: 3%
    """
    if price <= HOUSE_THRESHOLD_LOW:
        return HOUSE_RATE_LOW, "6억 이하 1% (§11①8)"
    if price <= HOUSE_THRESHOLD_HIGH:
        # 6~9억 공식세율 (단위: 원 → 억 환산)
        billion = price / 100_000_000
        rate = round((billion * 2 / 3 - 3) / 100, 4)
        return rate, f"6~9억 공식세율 (가액×2/3억-3)/100 → {rate*100:.2f}% (§11①8)"
    return HOUSE_RATE_HIGH, "9억 초과 3% (§11①8)"


def _local_edu_rate_house_purchase(base_rate: float) -> float:
    """주택 유상 취득 지방교육세율 (실무 통용).

    본세율 1% → 0.1%, 2% → 0.2%, 3% → 0.3% (본세율의 10%)
    """
    return round(base_rate * 0.1, 4)


def _local_edu_rate_general(base_rate: float) -> float:
    """일반 취득 지방교육세율 (본세율의 50% 수준, 실무 근사).

    농특세법·교육세법 실무상 '(본세율 - 2%) × 50%' 근사, 최소 0.1%.
    예: 4% → 0.4%, 8% → 0.4%, 12% → 0.4%, 3.5% → 0.3%
    """
    val = (base_rate - HEAVY_BASE_RATE) * 0.5
    return round(max(0.001, val), 4)


def _compute_surcharges(
    price: int,
    acquisition_tax: int,
    area_sqm: float | None,
    local_edu_rate: float,
) -> dict:
    """농특세 + 지방교육세 계산.

    - 농특세: 취득세액 × 10% (단, 전용면적 85㎡ 이하 국민주택 규모 면제)
    - 지방교육세: 과세표준(가액) × 지방교육세율
    """
    if area_sqm is not None and area_sqm <= NATIONAL_HOUSING_AREA:
        agri_tax = 0
        agri_note = f"전용 {area_sqm}㎡ (≤ 85㎡ 국민주택 규모) → 농특세 면제"
    else:
        agri_tax = int(acquisition_tax * RATE_AGRI_SPECIAL)
        agri_note = f"취득세액 × 10% = 농특세 {agri_tax:,}원"

    local_edu_tax = int(price * local_edu_rate)
    return {
        "agricultural_special_tax": agri_tax,
        "agricultural_special_note": agri_note,
        "local_education_tax": local_edu_tax,
        "local_education_rate": local_edu_rate,
    }


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

def general(
    acquisition_price: int,
    area_sqm: float | None = None,
) -> dict:
    """일반 유상 주택 취득 (지방세법 §11①8)."""
    if acquisition_price < 0:
        return {"error": "취득가액은 0 이상이어야 합니다"}

    rate, label = _house_standard_rate(acquisition_price)
    acquisition_tax = int(acquisition_price * rate)
    local_edu_rate = _local_edu_rate_house_purchase(rate)
    surcharge = _compute_surcharges(
        price=acquisition_price,
        acquisition_tax=acquisition_tax,
        area_sqm=area_sqm,
        local_edu_rate=local_edu_rate,
    )
    total = acquisition_tax + surcharge["agricultural_special_tax"] + surcharge["local_education_tax"]

    return {
        "mode": "general",
        "acquisition_price": acquisition_price,
        "area_sqm": area_sqm,
        "applied_rate": rate,
        "applied_rate_label": label,
        "acquisition_tax": acquisition_tax,
        **surcharge,
        "total_tax": total,
        "formula": "취득세 = 취득가액 × 표준세율 / 농특세 = 취득세액 × 10% (85㎡ 이하 면제) / 지방교육세 = 본세율의 10%",
        "legal_basis": "지방세법 §11①8",
        "disclaimer": DISCLAIMER,
    }


def multi_home(
    acquisition_price: int,
    home_count: int,
    in_adjusted_area: bool = False,
    area_sqm: float | None = None,
) -> dict:
    """1세대 다주택 유상 취득 중과 (지방세법 §13의2).

    조정대상지역:
      - 2주택: 8%  (4% + 2%×200%)
      - 3주택↑: 12% (4% + 2%×400%)
    비조정대상지역:
      - 3주택: 8%
      - 4주택↑: 12%
    그 외(조정 1주택, 비조정 1~2주택): 일반 표준세율 (§11①8)
    """
    if acquisition_price < 0:
        return {"error": "취득가액은 0 이상이어야 합니다"}
    if home_count < 1:
        return {"error": "home_count는 1 이상이어야 합니다"}

    rate: float
    label: str
    heavy = False

    if in_adjusted_area:
        if home_count == 1:
            rate, label = _house_standard_rate(acquisition_price)
        elif home_count == 2:
            rate, label, heavy = RATE_MULTI_HOUSE_HEAVY_8, "조정지역 1세대 2주택 중과 8% (§13의2)", True
        else:  # 3주택↑
            rate, label, heavy = RATE_MULTI_HOUSE_HEAVY_12, "조정지역 1세대 3주택↑ 중과 12% (§13의2)", True
    else:
        if home_count <= 2:
            rate, label = _house_standard_rate(acquisition_price)
        elif home_count == 3:
            rate, label, heavy = RATE_MULTI_HOUSE_HEAVY_8, "비조정지역 1세대 3주택 중과 8% (§13의2)", True
        else:  # 4주택↑
            rate, label, heavy = RATE_MULTI_HOUSE_HEAVY_12, "비조정지역 1세대 4주택↑ 중과 12% (§13의2)", True

    acquisition_tax = int(acquisition_price * rate)
    # 지방교육세: 중과 구간은 일반 근사식, 표준세율 구간은 주택 유상 특례식
    if heavy:
        local_edu_rate = _local_edu_rate_general(rate)
    else:
        local_edu_rate = _local_edu_rate_house_purchase(rate)
    surcharge = _compute_surcharges(
        price=acquisition_price,
        acquisition_tax=acquisition_tax,
        area_sqm=area_sqm,
        local_edu_rate=local_edu_rate,
    )
    total = acquisition_tax + surcharge["agricultural_special_tax"] + surcharge["local_education_tax"]

    return {
        "mode": "multi-home",
        "acquisition_price": acquisition_price,
        "home_count": home_count,
        "in_adjusted_area": in_adjusted_area,
        "area_sqm": area_sqm,
        "applied_rate": rate,
        "applied_rate_label": label,
        "heavy_tax_applied": heavy,
        "acquisition_tax": acquisition_tax,
        **surcharge,
        "total_tax": total,
        "formula": "취득세 = 취득가액 × 중과/표준세율 (§13의2)",
        "legal_basis": "지방세법 §13의2, §11①8",
        "disclaimer": DISCLAIMER,
    }


def corporate(
    acquisition_price: int,
    area_sqm: float | None = None,
) -> dict:
    """법인 주택 유상 취득 중과 (지방세법 §13의2, 4% + 2%×400% = 12%)."""
    if acquisition_price < 0:
        return {"error": "취득가액은 0 이상이어야 합니다"}

    rate = RATE_CORPORATE_HOUSE
    label = "법인 주택 유상 취득 중과 12% (4% + 2%×400%, §13의2)"
    acquisition_tax = int(acquisition_price * rate)
    local_edu_rate = _local_edu_rate_general(rate)
    surcharge = _compute_surcharges(
        price=acquisition_price,
        acquisition_tax=acquisition_tax,
        area_sqm=area_sqm,
        local_edu_rate=local_edu_rate,
    )
    total = acquisition_tax + surcharge["agricultural_special_tax"] + surcharge["local_education_tax"]

    return {
        "mode": "corporate",
        "acquisition_price": acquisition_price,
        "area_sqm": area_sqm,
        "applied_rate": rate,
        "applied_rate_label": label,
        "acquisition_tax": acquisition_tax,
        **surcharge,
        "total_tax": total,
        "formula": "취득세 = 취득가액 × 12% (§13의2, 법인 주택 중과)",
        "legal_basis": "지방세법 §13의2",
        "disclaimer": DISCLAIMER,
    }


def gift(
    acquisition_price: int,
    in_adjusted_area: bool = False,
    is_nonprofit: bool = False,
    is_spouse_or_lineal_from_one_house: bool = False,
    area_sqm: float | None = None,
) -> dict:
    """증여(무상) 취득 (지방세법 §11①2, §13의2②).

    - 기본: 3.5% (비영리사업자 2.8%)
    - 조정대상지역 + 시가표준 3억 이상 + 다주택자 증여 → 12% 중과
    - 1세대1주택자가 배우자·직계존비속에게 증여 시 중과 제외
    """
    if acquisition_price < 0:
        return {"error": "취득가액은 0 이상이어야 합니다"}

    heavy = False
    if is_nonprofit:
        rate, label = RATE_GIFT_NONPROFIT, "비영리사업자 증여 2.8% (§11①2)"
    elif (
        in_adjusted_area
        and acquisition_price >= GIFT_HEAVY_THRESHOLD
        and not is_spouse_or_lineal_from_one_house
    ):
        rate, label, heavy = RATE_GIFT_HEAVY, (
            "조정지역 기준금액 3억↑ 주택 증여 중과 12% (§13의2②)"
        ), True
    else:
        rate, label = RATE_GIFT_DEFAULT, "증여(무상) 취득 3.5% (§11①2)"

    acquisition_tax = int(acquisition_price * rate)
    local_edu_rate = _local_edu_rate_general(rate)
    surcharge = _compute_surcharges(
        price=acquisition_price,
        acquisition_tax=acquisition_tax,
        area_sqm=area_sqm,
        local_edu_rate=local_edu_rate,
    )
    total = acquisition_tax + surcharge["agricultural_special_tax"] + surcharge["local_education_tax"]

    return {
        "mode": "gift",
        "acquisition_price": acquisition_price,
        "in_adjusted_area": in_adjusted_area,
        "is_nonprofit": is_nonprofit,
        "is_spouse_or_lineal_from_one_house": is_spouse_or_lineal_from_one_house,
        "area_sqm": area_sqm,
        "applied_rate": rate,
        "applied_rate_label": label,
        "heavy_tax_applied": heavy,
        "acquisition_tax": acquisition_tax,
        **surcharge,
        "total_tax": total,
        "formula": "취득세 = 시가표준액 × 세율 (기본 3.5% / 조정+3억↑+다주택 12% 중과)",
        "legal_basis": "지방세법 §11①2, §13의2②",
        "disclaimer": DISCLAIMER,
    }


def compare(
    acquisition_price: int,
    area_sqm: float | None = None,
) -> dict:
    """시나리오 비교 — 개인 일반 / 개인 3주택(조정) / 법인 / 증여(조정)."""
    if acquisition_price < 0:
        return {"error": "취득가액은 0 이상이어야 합니다"}

    scenarios = {
        "individual_general": general(acquisition_price, area_sqm=area_sqm),
        "individual_multi_home_adjusted_3": multi_home(
            acquisition_price, home_count=3, in_adjusted_area=True, area_sqm=area_sqm,
        ),
        "individual_multi_home_non_adjusted_4": multi_home(
            acquisition_price, home_count=4, in_adjusted_area=False, area_sqm=area_sqm,
        ),
        "corporate": corporate(acquisition_price, area_sqm=area_sqm),
        "gift_adjusted": gift(
            acquisition_price, in_adjusted_area=True, area_sqm=area_sqm,
        ),
    }

    ranking = sorted(
        ((k, v["total_tax"]) for k, v in scenarios.items() if "error" not in v),
        key=lambda x: x[1],
    )

    return {
        "mode": "compare",
        "acquisition_price": acquisition_price,
        "area_sqm": area_sqm,
        "scenarios": scenarios,
        "ranking_by_total_tax": [
            {"scenario": k, "total_tax": v} for k, v in ranking
        ],
        "legal_basis": "지방세법 §11, §13의2",
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="취득세 계산기 — 지방세법 §11, §13의2",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # general
    p_gen = sub.add_parser("general", help="일반 유상 주택 취득 (6억↓ 1% / 6~9억 공식 / 9억↑ 3%)")
    p_gen.add_argument("--acquisition-price", type=int, required=True, help="취득가액 (원)")
    p_gen.add_argument("--area-sqm", type=float, default=None,
                       help="전용면적 (㎡, 85㎡ 이하 국민주택 규모 → 농특세 면제)")

    # multi-home
    p_mh = sub.add_parser("multi-home", help="1세대 다주택 유상 중과 (§13의2)")
    p_mh.add_argument("--acquisition-price", type=int, required=True)
    p_mh.add_argument("--home-count", type=int, required=True,
                      help="취득 후 1세대 보유 주택 수 (취득 주택 포함)")
    p_mh.add_argument("--in-adjusted-area", action="store_true",
                      help="취득 주택이 조정대상지역 소재 여부")
    p_mh.add_argument("--area-sqm", type=float, default=None)

    # corporate
    p_co = sub.add_parser("corporate", help="법인 주택 유상 취득 중과 (12%, §13의2)")
    p_co.add_argument("--acquisition-price", type=int, required=True)
    p_co.add_argument("--area-sqm", type=float, default=None)

    # gift
    p_gift = sub.add_parser("gift", help="증여(무상) 취득 (3.5% / 조정+3억↑ 12%)")
    p_gift.add_argument("--acquisition-price", type=int, required=True,
                        help="시가표준액 (원)")
    p_gift.add_argument("--in-adjusted-area", action="store_true")
    p_gift.add_argument("--is-nonprofit", action="store_true",
                        help="비영리사업자 (2.8%)")
    p_gift.add_argument("--is-spouse-or-lineal-from-one-house", action="store_true",
                        help="1세대1주택자가 배우자·직계존비속에게 증여 (중과 제외)")
    p_gift.add_argument("--area-sqm", type=float, default=None)

    # compare
    p_cmp = sub.add_parser("compare", help="시나리오 비교 (개인 vs 법인, 조정 vs 비조정)")
    p_cmp.add_argument("--acquisition-price", type=int, required=True)
    p_cmp.add_argument("--area-sqm", type=float, default=None)

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "general":
        result = general(
            acquisition_price=args.acquisition_price,
            area_sqm=args.area_sqm,
        )
    elif args.cmd == "multi-home":
        result = multi_home(
            acquisition_price=args.acquisition_price,
            home_count=args.home_count,
            in_adjusted_area=args.in_adjusted_area,
            area_sqm=args.area_sqm,
        )
    elif args.cmd == "corporate":
        result = corporate(
            acquisition_price=args.acquisition_price,
            area_sqm=args.area_sqm,
        )
    elif args.cmd == "gift":
        result = gift(
            acquisition_price=args.acquisition_price,
            in_adjusted_area=args.in_adjusted_area,
            is_nonprofit=args.is_nonprofit,
            is_spouse_or_lineal_from_one_house=args.is_spouse_or_lineal_from_one_house,
            area_sqm=args.area_sqm,
        )
    elif args.cmd == "compare":
        result = compare(
            acquisition_price=args.acquisition_price,
            area_sqm=args.area_sqm,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
