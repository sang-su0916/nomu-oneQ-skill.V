#!/usr/bin/env python3
"""
감가상각 계산기 — 법인세법 §23·시행령 §26·시행규칙 별표5

공식:
  정액법       = (취득가액 - 잔존가치) / 내용연수
  정률법       = 기초 장부가액 × 상각률
    상각률     = 1 - (0.05)^(1/내용연수)   # 잔존가치율 5% (국내 관행)
  생산량비례법 = (취득가액 - 잔존가치) / 총추정생산량 × 실제생산량

모드: straight-line | declining-balance | production | estimate-useful-life

CLI:
  python3 calculator.py straight-line      --acquisition-cost 10000000 --useful-life 5
  python3 calculator.py declining-balance  --acquisition-cost 10000000 --useful-life 5
  python3 calculator.py production         --acquisition-cost 10000000 --salvage-value 0 \
                                           --total-production 100000 --actual-production 20000
  python3 calculator.py estimate-useful-life --asset-category computer

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 금액은 int (원 단위 절사)
  - JSON 출력: ensure_ascii=False, indent=2
  - 월할상각·세무조정·즉시상각 특례 미반영 (SKILL.md 한계 참고)
"""

import argparse
import json
import sys

# ─── 상수 ─────────────────────────────────────────────────────────────────────
# 법인세법 시행규칙 별표5·6 기준내용연수 (대표 참고값, 2026-04-14 기준)
# 실제 업종별 세부분류는 시행규칙 원문 확인 필요 (±25% 신고가능기간 존재)
USEFUL_LIFE_TABLE = {
    "building-steel":         {"years": 40, "desc": "철골·철근 건물"},
    "building-brick":         {"years": 20, "desc": "벽돌·석조 건물"},
    "building-wood":          {"years": 15, "desc": "목조 건물"},
    "vehicle":                {"years": 5,  "desc": "차량운반구"},
    "machinery-general":      {"years": 8,  "desc": "일반 기계장치"},
    "machinery-heavy":        {"years": 10, "desc": "중기계장치"},
    "office-equipment":       {"years": 5,  "desc": "사무용 비품"},
    "computer":               {"years": 4,  "desc": "컴퓨터·주변기기"},
    "furniture":              {"years": 5,  "desc": "집기·가구"},
    "leasehold-improvements": {"years": 5,  "desc": "임차자산 개량권"},
}

# 정률법 상각률 산출 시 가정하는 잔존가치율 (국내 관행)
SALVAGE_RATE_ASSUMPTION = 0.05

DISCLAIMER = (
    "실무는 법인세법 시행규칙 별표5·6 + 자산별 회사 회계정책 확인 필요. "
    "세무조정 시 한도초과액 확인."
)


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

def straight_line(
    acquisition_cost: int,
    useful_life: int,
    salvage_value: int = 0,
    year: int | None = None,
) -> dict:
    """정액법 감가상각 — (취득가액 - 잔존가치) / 내용연수."""
    if acquisition_cost < 0 or salvage_value < 0:
        return {"error": "취득가액·잔존가치는 0 이상이어야 합니다"}
    if useful_life <= 0:
        return {"error": "내용연수는 양수여야 합니다"}
    if salvage_value > acquisition_cost:
        return {"error": "잔존가치가 취득가액보다 클 수 없습니다"}

    depreciable_base = acquisition_cost - salvage_value
    annual = int(depreciable_base / useful_life)

    accumulated_per_year: list[int] = []
    book_value_per_year: list[int] = []
    acc = 0
    for y in range(1, useful_life + 1):
        # 최종연도에 잔여액을 털어넣어 잔존가치에 정확히 맞춤 (정수 절사 오차 보정)
        if y == useful_life:
            this_year = depreciable_base - acc
        else:
            this_year = annual
        acc += this_year
        accumulated_per_year.append(acc)
        book_value_per_year.append(acquisition_cost - acc)

    result: dict = {
        "mode": "straight-line",
        "method": "정액법",
        "acquisition_cost": acquisition_cost,
        "salvage_value": salvage_value,
        "useful_life_years": useful_life,
        "annual_depreciation": annual,
        "accumulated_per_year": accumulated_per_year,
        "book_value_per_year": book_value_per_year,
        "calculation": (
            f"({acquisition_cost:,} - {salvage_value:,}) / {useful_life} "
            f"= {annual:,}원/년"
        ),
        "disclaimer": DISCLAIMER,
    }

    if year is not None:
        if year < 1 or year > useful_life:
            result["year_error"] = f"year는 1 이상 {useful_life} 이하여야 합니다"
        else:
            result["year"] = year
            result["year_depreciation"] = (
                accumulated_per_year[year - 1]
                - (accumulated_per_year[year - 2] if year >= 2 else 0)
            )
            result["year_accumulated"] = accumulated_per_year[year - 1]
            result["year_book_value"] = book_value_per_year[year - 1]

    return result


def declining_balance(
    acquisition_cost: int,
    useful_life: int,
    rate: float | None = None,
    year: int | None = None,
) -> dict:
    """정률법 감가상각 — 기초 장부가액 × 상각률 (미지정 시 자동산출)."""
    if acquisition_cost < 0:
        return {"error": "취득가액은 0 이상이어야 합니다"}
    if useful_life <= 0:
        return {"error": "내용연수는 양수여야 합니다"}

    if rate is None:
        # 잔존가치율 5% 가정 기반 자동 산출: 1 - 0.05^(1/n)
        computed_rate = 1 - (SALVAGE_RATE_ASSUMPTION ** (1 / useful_life))
        rate_used = round(computed_rate, 4)
        rate_source = f"자동산출 (1 - 0.05^(1/{useful_life}))"
    else:
        if rate <= 0 or rate >= 1:
            return {"error": "상각률은 0 초과 1 미만이어야 합니다"}
        rate_used = round(rate, 4)
        rate_source = "사용자 지정"

    yearly_depreciation: list[int] = []
    accumulated: list[int] = []
    book_value: list[int] = []

    current_book = float(acquisition_cost)
    acc = 0.0
    for _ in range(1, useful_life + 1):
        this_year = int(current_book * rate_used)
        acc += this_year
        current_book -= this_year
        yearly_depreciation.append(this_year)
        accumulated.append(int(acc))
        book_value.append(int(round(current_book)))

    result: dict = {
        "mode": "declining-balance",
        "method": "정률법",
        "acquisition_cost": acquisition_cost,
        "useful_life_years": useful_life,
        "depreciation_rate": rate_used,
        "rate_source": rate_source,
        "yearly_depreciation": yearly_depreciation,
        "accumulated": accumulated,
        "book_value": book_value,
        "calculation": (
            f"상각률 {rate_used} × 기초장부가액 (매년 장부가액 감소분 × 상각률)"
        ),
        "disclaimer": DISCLAIMER,
    }

    if year is not None:
        if year < 1 or year > useful_life:
            result["year_error"] = f"year는 1 이상 {useful_life} 이하여야 합니다"
        else:
            result["year"] = year
            result["year_depreciation"] = yearly_depreciation[year - 1]
            result["year_accumulated"] = accumulated[year - 1]
            result["year_book_value"] = book_value[year - 1]

    return result


def production(
    acquisition_cost: int,
    salvage_value: int,
    total_production: float,
    actual_production: float,
) -> dict:
    """생산량비례법 — (취득가액 - 잔존가치) / 총추정생산량 × 실제생산량."""
    if acquisition_cost < 0 or salvage_value < 0:
        return {"error": "취득가액·잔존가치는 0 이상이어야 합니다"}
    if salvage_value > acquisition_cost:
        return {"error": "잔존가치가 취득가액보다 클 수 없습니다"}
    if total_production <= 0:
        return {"error": "총추정생산량은 양수여야 합니다"}
    if actual_production < 0:
        return {"error": "실제생산량은 0 이상이어야 합니다"}

    depreciable_base = acquisition_cost - salvage_value
    depreciation_per_unit = depreciable_base / total_production
    current = int(depreciation_per_unit * actual_production)

    return {
        "mode": "production",
        "method": "생산량비례법",
        "acquisition_cost": acquisition_cost,
        "salvage_value": salvage_value,
        "total_production": total_production,
        "actual_production": actual_production,
        "depreciation_per_unit": round(depreciation_per_unit, 4),
        "current_depreciation": current,
        "calculation": (
            f"({acquisition_cost:,} - {salvage_value:,}) / {total_production:g} "
            f"× {actual_production:g} = {current:,}원"
        ),
        "disclaimer": DISCLAIMER,
    }


def estimate_useful_life(asset_category: str) -> dict:
    """법인세법 시행규칙 별표5·6 기준내용연수 조회 (대표 참고값)."""
    if asset_category not in USEFUL_LIFE_TABLE:
        return {
            "error": (
                f"알 수 없는 카테고리: {asset_category}. "
                f"사용 가능: {', '.join(USEFUL_LIFE_TABLE.keys())}"
            )
        }

    entry = USEFUL_LIFE_TABLE[asset_category]
    years = entry["years"]
    # 시행규칙상 ±25% 신고가능기간
    low = int(years * 0.75)
    high = int(years * 1.25)

    return {
        "mode": "estimate-useful-life",
        "asset_category": asset_category,
        "asset_description": entry["desc"],
        "useful_life_years": years,
        "permitted_range": {"min": low, "max": high},
        "legal_basis": "법인세법 시행규칙 §15 별표5·6 (기준내용연수)",
        "disclaimer": (
            "업종별 자산별 시행규칙 별표5·6 확인 필요. 본 값은 대표 참고값."
        ),
    }


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="감가상각 계산기 (법인세법 §23·시행령 §26·시행규칙 별표5)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_sl = sub.add_parser("straight-line", help="정액법")
    p_sl.add_argument("--acquisition-cost", type=int, required=True, help="취득가액 (원)")
    p_sl.add_argument("--salvage-value", type=int, default=0, help="잔존가치 (원, 기본 0)")
    p_sl.add_argument("--useful-life", type=int, required=True, help="내용연수 (년)")
    p_sl.add_argument("--year", type=int, default=None, help="특정 연도 상각액만 출력")

    p_db = sub.add_parser("declining-balance", help="정률법")
    p_db.add_argument("--acquisition-cost", type=int, required=True, help="취득가액 (원)")
    p_db.add_argument("--useful-life", type=int, required=True, help="내용연수 (년)")
    p_db.add_argument("--rate", type=float, default=None,
                      help="상각률 (미지정 시 1 - 0.05^(1/n) 자동산출)")
    p_db.add_argument("--year", type=int, default=None, help="특정 연도 상각액만 출력")

    p_pr = sub.add_parser("production", help="생산량비례법")
    p_pr.add_argument("--acquisition-cost", type=int, required=True, help="취득가액 (원)")
    p_pr.add_argument("--salvage-value", type=int, default=0, help="잔존가치 (원, 기본 0)")
    p_pr.add_argument("--total-production", type=float, required=True, help="총추정생산량")
    p_pr.add_argument("--actual-production", type=float, required=True, help="실제생산량")

    p_ul = sub.add_parser("estimate-useful-life", help="기준내용연수 조회")
    p_ul.add_argument(
        "--asset-category", type=str, required=True,
        choices=list(USEFUL_LIFE_TABLE.keys()),
        help="자산 카테고리 (시행규칙 별표5·6 대표값)",
    )

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "straight-line":
        result = straight_line(
            acquisition_cost=args.acquisition_cost,
            useful_life=args.useful_life,
            salvage_value=args.salvage_value,
            year=args.year,
        )
    elif args.cmd == "declining-balance":
        result = declining_balance(
            acquisition_cost=args.acquisition_cost,
            useful_life=args.useful_life,
            rate=args.rate,
            year=args.year,
        )
    elif args.cmd == "production":
        result = production(
            acquisition_cost=args.acquisition_cost,
            salvage_value=args.salvage_value,
            total_production=args.total_production,
            actual_production=args.actual_production,
        )
    elif args.cmd == "estimate-useful-life":
        result = estimate_useful_life(asset_category=args.asset_category)
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
