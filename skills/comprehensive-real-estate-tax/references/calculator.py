#!/usr/bin/env python3
"""
종합부동산세 계산기 — 종부세법 §8 / §9, 시행령 §2의4

서브커맨드:
  household            개인 2주택 이하 세액 계산
  multi-home           개인 3주택 이상 세액 계산
  single-home-senior   1세대1주택 (고령자·장기보유 공제 적용)
  corporate            법인 단일세율 (2주택 이하 2.7% / 3주택 이상 5.0%)

CLI:
  python3 calculator.py household --published-price 3000000000
  python3 calculator.py multi-home --published-price 3000000000
  python3 calculator.py single-home-senior --published-price 2000000000 \\
      --age 70 --holding-years 10
  python3 calculator.py corporate --published-price 2000000000

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 금액은 int (원 단위 절사)
  - JSON 출력: ensure_ascii=False, indent=2
  - 공정시장가액비율은 시행령 §2의4①로 정해진 현재값 60%를 적용.
    종부세법 §8은 법상 60~100% 범위로 위임하며, 시행령 개정으로 변동 가능.
  - 세부담상한(§10)·재산세 중복 공제(§9③)는 계산 편의상 별도 안내.
"""

import argparse
import json
import sys

# ─── 상수 ────────────────────────────────────────────────────────────────────────

# 공정시장가액비율 (시행령 §2의4①)
#   법상 범위: 주택분 60~100% (종부세법 §8② 대통령령 위임)
#   시행령 현재값: 60% (2022년 이후 현행)
#   ⚠️ 시행령 개정으로 언제든 변동 가능 — 단정 표현 금지
FAIR_MARKET_RATIO = 0.60

# 기본 공제 (종부세법 §8① 주택분)
DEDUCTION_SINGLE_HOUSE = 1_200_000_000  # 1세대1주택자: 12억
DEDUCTION_GENERAL = 900_000_000         # 그 외 개인: 9억
DEDUCTION_CORPORATE = 0                 # 법인(중과대상): 0

# 법인 단일세율 (종부세법 §9②3)
CORPORATE_RATE_2HOME_LESS = 0.027  # 2주택 이하 2.7%
CORPORATE_RATE_3HOME_MORE = 0.05   # 3주택 이상 5.0%

# 주택분 세율표 (종부세법 §9①, 2주택 이하)
#   (구간 상한, 세율, 직전 구간까지 누적 세액)
#   과세표준 구간별 누적 세액 방식으로 구현 — 누진공제액 없이 구간별 가산
RATES_2HOME_LESS = [
    # (구간 상한,  세율,    구간 하한까지 누적세액)
    (300_000_000,   0.005,          0),
    (600_000_000,   0.007,  1_500_000),  # 3억×0.5%
    (1_200_000_000, 0.010,  3_600_000),  # + 3억×0.7% = 2.1M
    (2_500_000_000, 0.013,  9_600_000),  # + 6억×1.0% = 6.0M
    (5_000_000_000, 0.015, 26_500_000),  # + 13억×1.3% = 16.9M
    (9_400_000_000, 0.020, 64_000_000),  # + 25억×1.5% = 37.5M
    (float("inf"),  0.027,152_000_000),  # + 44억×2.0% = 88.0M
]

# 주택분 세율표 (종부세법 §9①, 3주택 이상)
#   12억 이하는 2주택과 동일, 12억 초과부터 중과
RATES_3HOME_MORE = [
    (300_000_000,   0.005,          0),
    (600_000_000,   0.007,  1_500_000),
    (1_200_000_000, 0.010,  3_600_000),
    (2_500_000_000, 0.020,  9_600_000),  # 12~25억: +13억×2.0% = 26M
    (5_000_000_000, 0.030, 35_600_000),  # 25~50억: +25억×3.0% = 75M
    (9_400_000_000, 0.040,110_600_000),  # 50~94억: +44억×4.0% = 176M
    (float("inf"),  0.050,286_600_000),
]

# 1세대1주택자 세액공제 (종부세법 §9⑥⑦⑧⑨)
SENIOR_CREDIT = {60: 0.20, 65: 0.30, 70: 0.40}         # 고령자 공제
HOLDING_CREDIT = {5: 0.20, 10: 0.40, 15: 0.50}         # 장기보유 공제
COMBINED_CREDIT_CAP = 0.80                              # 중복 적용 한도 80%

DISCLAIMER = (
    "2026년 기준 종합부동산세법. 공정시장가액비율은 시행령 §2의4①로 정해진 현재값 60%이며, "
    "법상 60~100% 범위(§8②)에서 시행령 개정에 따라 변동 가능. "
    "공시가격 실제 확인은 부동산공시가격알리미(realtyprice.kr) 별도 조회 필수. "
    "재산세 중복 공제(§9③), 세부담상한(§10), 부속토지·종업원 주거·임대주택 합산제외 등은 미반영. "
    "실제 신고 시 국세청·세무 전문가 확인 필수."
)


# ─── 내부 유틸 ──────────────────────────────────────────────────────────────────

def _tax_base(published_price: int, deduction: int) -> int:
    """과세표준 = max(공시가격 합산 - 공제액, 0) × 공정시장가액비율"""
    net = max(0, published_price - deduction)
    return int(net * FAIR_MARKET_RATIO)


def _lookup_rate(tax_base: int, rates: list) -> tuple[float, int, int]:
    """세율표에서 tax_base가 속한 구간 반환 (세율, 구간 하한, 누적세액)."""
    prev_upper = 0
    for upper, rate, cumulative in rates:
        if tax_base <= upper:
            return rate, prev_upper, cumulative
        prev_upper = upper
    upper, rate, cumulative = rates[-1]
    return rate, prev_upper, cumulative


def _apply_rates(tax_base: int, rates: list) -> tuple[int, float]:
    """과세표준에 세율표 적용 → (세액, 한계세율)."""
    if tax_base <= 0:
        return 0, 0.0
    rate, lower, cumulative = _lookup_rate(tax_base, rates)
    tax = cumulative + int((tax_base - lower) * rate)
    return max(0, tax), rate


def _senior_credit_rate(age: int) -> float:
    """고령자 공제율 (60↑20% / 65↑30% / 70↑40%)."""
    if age >= 70:
        return SENIOR_CREDIT[70]
    if age >= 65:
        return SENIOR_CREDIT[65]
    if age >= 60:
        return SENIOR_CREDIT[60]
    return 0.0


def _holding_credit_rate(years: int) -> float:
    """장기보유 공제율 (5↑20% / 10↑40% / 15↑50%)."""
    if years >= 15:
        return HOLDING_CREDIT[15]
    if years >= 10:
        return HOLDING_CREDIT[10]
    if years >= 5:
        return HOLDING_CREDIT[5]
    return 0.0


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

def household(published_price: int) -> dict:
    """개인 2주택 이하 세액 계산.

    과세표준 = max(공시가 - 9억, 0) × 60%
    세액 = 과세표준 × 2주택 이하 세율표 적용
    """
    if published_price < 0:
        return {"error": "공시가격은 0 이상이어야 합니다"}

    tax_base = _tax_base(published_price, DEDUCTION_GENERAL)
    tax, marginal = _apply_rates(tax_base, RATES_2HOME_LESS)
    return {
        "mode": "household",
        "published_price": published_price,
        "deduction": DEDUCTION_GENERAL,
        "fair_market_ratio": FAIR_MARKET_RATIO,
        "fair_market_ratio_note": "시행령 §2의4① 현재값 60% (법상 60~100% 범위)",
        "tax_base": tax_base,
        "marginal_rate": marginal,
        "tax": tax,
        "formula": "과세표준 = max(공시가 - 9억, 0) × 60% → 2주택 이하 세율표 적용",
        "legal_basis": "종부세법 §8, §9①, 시행령 §2의4",
        "disclaimer": DISCLAIMER,
    }


def multi_home(published_price: int) -> dict:
    """개인 3주택 이상 세액 계산.

    과세표준 = max(공시가 - 9억, 0) × 60%
    세액 = 과세표준 × 3주택 이상 세율표 적용 (12억 초과부터 중과)
    """
    if published_price < 0:
        return {"error": "공시가격은 0 이상이어야 합니다"}

    tax_base = _tax_base(published_price, DEDUCTION_GENERAL)
    tax, marginal = _apply_rates(tax_base, RATES_3HOME_MORE)
    return {
        "mode": "multi-home",
        "published_price": published_price,
        "deduction": DEDUCTION_GENERAL,
        "fair_market_ratio": FAIR_MARKET_RATIO,
        "fair_market_ratio_note": "시행령 §2의4① 현재값 60% (법상 60~100% 범위)",
        "tax_base": tax_base,
        "marginal_rate": marginal,
        "tax": tax,
        "formula": "과세표준 = max(공시가 - 9억, 0) × 60% → 3주택 이상 세율표 적용 (12억 초과 중과)",
        "legal_basis": "종부세법 §8, §9①, 시행령 §2의4",
        "disclaimer": DISCLAIMER,
    }


def single_home_senior(published_price: int, age: int = 0, holding_years: int = 0) -> dict:
    """1세대1주택자 세액 (고령자·장기보유 공제 적용, 중복 80% 한도).

    과세표준 = max(공시가 - 12억, 0) × 60%
    기본세액 = 과세표준 × 2주택 이하 세율표
    납부세액 = 기본세액 × (1 - min(고령자공제 + 장기보유공제, 80%))
    """
    if published_price < 0:
        return {"error": "공시가격은 0 이상이어야 합니다"}
    if age < 0 or holding_years < 0:
        return {"error": "연령·보유연수는 0 이상이어야 합니다"}

    tax_base = _tax_base(published_price, DEDUCTION_SINGLE_HOUSE)
    base_tax, marginal = _apply_rates(tax_base, RATES_2HOME_LESS)

    senior_rate = _senior_credit_rate(age)
    holding_rate = _holding_credit_rate(holding_years)
    combined = min(COMBINED_CREDIT_CAP, senior_rate + holding_rate)

    credit_amount = int(base_tax * combined)
    final_tax = max(0, base_tax - credit_amount)

    return {
        "mode": "single-home-senior",
        "published_price": published_price,
        "deduction": DEDUCTION_SINGLE_HOUSE,
        "fair_market_ratio": FAIR_MARKET_RATIO,
        "fair_market_ratio_note": "시행령 §2의4① 현재값 60% (법상 60~100% 범위)",
        "tax_base": tax_base,
        "marginal_rate": marginal,
        "base_tax": base_tax,
        "age": age,
        "holding_years": holding_years,
        "senior_credit_rate": senior_rate,
        "holding_credit_rate": holding_rate,
        "combined_credit_rate": round(combined, 4),
        "credit_cap_applied": (senior_rate + holding_rate) > COMBINED_CREDIT_CAP,
        "credit_amount": credit_amount,
        "tax": final_tax,
        "formula": (
            "과세표준 = max(공시가 - 12억, 0) × 60% → 기본세액 × "
            "(1 - min(고령자+장기보유, 80%))"
        ),
        "legal_basis": "종부세법 §8, §9①, §9⑥⑦⑧⑨, 시행령 §2의4",
        "disclaimer": DISCLAIMER,
    }


def corporate(published_price: int, is_multi_home: bool = False) -> dict:
    """법인 세액 계산 (단일세율 2.7% 또는 5.0%).

    과세표준 = 공시가 × 60% (공제 0)
    세액 = 과세표준 × 단일세율
    """
    if published_price < 0:
        return {"error": "공시가격은 0 이상이어야 합니다"}

    tax_base = _tax_base(published_price, DEDUCTION_CORPORATE)
    rate = CORPORATE_RATE_3HOME_MORE if is_multi_home else CORPORATE_RATE_2HOME_LESS
    tax = int(tax_base * rate)

    return {
        "mode": "corporate",
        "published_price": published_price,
        "deduction": DEDUCTION_CORPORATE,
        "fair_market_ratio": FAIR_MARKET_RATIO,
        "fair_market_ratio_note": "시행령 §2의4① 현재값 60% (법상 60~100% 범위)",
        "tax_base": tax_base,
        "is_multi_home": is_multi_home,
        "applied_rate": rate,
        "applied_rate_label": (
            "법인 3주택 이상 5.0%" if is_multi_home else "법인 2주택 이하 2.7%"
        ),
        "tax": tax,
        "formula": "과세표준 = 공시가 × 60% (공제 0) → 법인 단일세율 적용",
        "legal_basis": "종부세법 §8, §9②3, 시행령 §2의4",
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="종합부동산세 계산기 — 종부세법 §8/§9, 시행령 §2의4",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # household
    p_h = sub.add_parser("household", help="개인 2주택 이하 세액 계산")
    p_h.add_argument("--published-price", type=int, required=True,
                     help="공시가격 합산 (원)")

    # multi-home
    p_m = sub.add_parser("multi-home", help="개인 3주택 이상 세액 계산")
    p_m.add_argument("--published-price", type=int, required=True,
                     help="공시가격 합산 (원)")

    # single-home-senior
    p_s = sub.add_parser("single-home-senior",
                         help="1세대1주택 고령자·장기보유 공제 적용")
    p_s.add_argument("--published-price", type=int, required=True,
                     help="공시가격 (원)")
    p_s.add_argument("--age", type=int, default=0, help="연령 (정수, 기본 0)")
    p_s.add_argument("--holding-years", type=int, default=0,
                     help="보유연수 (정수, 기본 0)")

    # corporate
    p_c = sub.add_parser("corporate", help="법인 단일세율 2.7%/5.0%")
    p_c.add_argument("--published-price", type=int, required=True,
                     help="공시가격 합산 (원)")
    p_c.add_argument("--is-multi-home", action="store_true",
                     help="법인 3주택 이상 여부 (미지정 시 2주택 이하 2.7%)")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "household":
        result = household(published_price=args.published_price)
    elif args.cmd == "multi-home":
        result = multi_home(published_price=args.published_price)
    elif args.cmd == "single-home-senior":
        result = single_home_senior(
            published_price=args.published_price,
            age=args.age,
            holding_years=args.holding_years,
        )
    elif args.cmd == "corporate":
        result = corporate(
            published_price=args.published_price,
            is_multi_home=args.is_multi_home,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
