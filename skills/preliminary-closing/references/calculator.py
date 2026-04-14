#!/usr/bin/env python3
"""
가결산 추정기 — 일반기업회계기준 제3장 중간재무제표 + 법인세법 §63·시행령 §100

모드:
  monthly              : 단월 가결산 (매출·원가·판관비 → 손익 단계·마진)
  ytd                  : 누적(YTD) 가결산 + 연환산 (선형)
  target-vs-actual     : 목표 대비 달성률 + 진도율 비교 플래그
  adjustment-checklist : 결산조정 체크리스트 (6개 카테고리)

CLI:
  python3 calculator.py monthly --revenue 100000000 --cogs 60000000 --sga 25000000 --interest-expense 2000000
  python3 calculator.py ytd --ytd-revenue 600000000 --ytd-cogs 360000000 --ytd-sga 150000000 --months-elapsed 6
  python3 calculator.py target-vs-actual --target-revenue 1200000000 --actual-revenue 550000000 ...
  python3 calculator.py adjustment-checklist [--month 2026-04]

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys)
  - 모든 금액 int 절사 (truncation)
  - margin·achievement·progress 는 percent 소수점 2자리
  - JSON 출력: ensure_ascii=False, indent=2
"""

import argparse
import json
import sys

# ─── 상수 ─────────────────────────────────────────────────────────────────────
# 2026-04-14 기준: 법인세 과표 2억 이하 9% + 지방세 0.9% ≈ 9.9% / 2억 초과 ~200억 19% + 지방세 1.9% ≈ 20.9%
# 실무 편의치 0.20 (지방소득세 포함 약 20%) 을 default 로 사용
DEFAULT_TAX_RATE = 0.20

FLAG_THRESHOLD_PP = 5.0  # 진도율 대비 ±5%p 이탈 시 플래그

DISCLAIMER = (
    "가결산은 확정치 아님. 월말 마감 전 선급·미지급·감가 등 결산조정 미반영 가능성. "
    "법인세는 예상 세율 기준 추정치로 실제 신고 시 차이."
)


# ─── 내부 유틸 ─────────────────────────────────────────────────────────────────

def _pct(num: float, den: float) -> float | None:
    """비율(%)을 소수점 2자리로 반환. 분모 0이면 None."""
    if den == 0:
        return None
    return round((num / den) * 100, 2)


def _build_income_statement(
    revenue: int,
    cogs: int,
    sga: int,
    other_income: int,
    other_expense: int,
    interest_expense: int,
    estimated_tax_rate: float,
) -> dict:
    """손익 단계별 수치 + 마진 딕셔너리 생성 (monthly·ytd 공용)."""
    gross_profit = revenue - cogs
    operating_income = gross_profit - sga
    non_operating_net = other_income - other_expense
    pretax_income = operating_income + non_operating_net - interest_expense
    # 세전이익이 음수면 법인세 0 (단순화 — 이월결손금·환급 미고려)
    estimated_tax = int(max(pretax_income, 0) * estimated_tax_rate)
    net_income = pretax_income - estimated_tax

    margins = {
        "gross_margin_pct": _pct(gross_profit, revenue),
        "operating_margin_pct": _pct(operating_income, revenue),
        "net_margin_pct": _pct(net_income, revenue),
    }

    return {
        "revenue": int(revenue),
        "cogs": int(cogs),
        "gross_profit": int(gross_profit),
        "sga": int(sga),
        "operating_income": int(operating_income),
        "non_operating_net": int(non_operating_net),
        "interest_expense": int(interest_expense),
        "pretax_income": int(pretax_income),
        "estimated_tax": int(estimated_tax),
        "net_income": int(net_income),
        "margins": margins,
    }


# ─── 핵심 계산 함수 ────────────────────────────────────────────────────────────

def calc_monthly(
    revenue: int,
    cogs: int,
    sga: int,
    other_income: int = 0,
    other_expense: int = 0,
    interest_expense: int = 0,
    estimated_tax_rate: float = DEFAULT_TAX_RATE,
) -> dict:
    """단월 가결산."""
    if revenue < 0:
        return {"error": "revenue must be >= 0"}

    body = _build_income_statement(
        revenue, cogs, sga, other_income, other_expense,
        interest_expense, estimated_tax_rate,
    )
    return {
        "mode": "monthly",
        **body,
        "estimated_tax_rate": estimated_tax_rate,
        "disclaimer": DISCLAIMER,
    }


def calc_ytd(
    ytd_revenue: int,
    ytd_cogs: int,
    ytd_sga: int,
    months_elapsed: int,
    ytd_other_income: int = 0,
    ytd_other_expense: int = 0,
    ytd_interest_expense: int = 0,
    estimated_tax_rate: float = DEFAULT_TAX_RATE,
) -> dict:
    """YTD 누적 가결산 + 연환산."""
    if months_elapsed < 1 or months_elapsed > 12:
        return {"error": "months_elapsed must be in 1..12"}
    if ytd_revenue < 0:
        return {"error": "ytd_revenue must be >= 0"}

    ytd_body = _build_income_statement(
        ytd_revenue, ytd_cogs, ytd_sga,
        ytd_other_income, ytd_other_expense,
        ytd_interest_expense, estimated_tax_rate,
    )

    factor = 12 / months_elapsed
    ann_revenue = int(ytd_revenue * factor)
    ann_cogs = int(ytd_cogs * factor)
    ann_sga = int(ytd_sga * factor)
    ann_other_income = int(ytd_other_income * factor)
    ann_other_expense = int(ytd_other_expense * factor)
    ann_interest = int(ytd_interest_expense * factor)

    ann_gross = ann_revenue - ann_cogs
    ann_operating = ann_gross - ann_sga
    ann_non_op = ann_other_income - ann_other_expense
    ann_pretax = ann_operating + ann_non_op - ann_interest
    ann_tax = int(max(ann_pretax, 0) * estimated_tax_rate)
    ann_net = ann_pretax - ann_tax

    annualized = {
        "revenue": int(ann_revenue),
        "operating_income": int(ann_operating),
        "pretax_income": int(ann_pretax),
        "estimated_tax": int(ann_tax),
        "net_income": int(ann_net),
        "method": "YTD × 12 / months_elapsed (선형 가정, 계절성 미반영)",
    }

    return {
        "mode": "ytd",
        "months_elapsed": int(months_elapsed),
        "estimated_tax_rate": estimated_tax_rate,
        "ytd": ytd_body,
        "annualized": annualized,
        "disclaimer": DISCLAIMER,
    }


def _item_achievement(target: int, actual: int, progress_rate_pct: float, label: str) -> dict:
    """단일 항목 달성률·gap·flag 계산."""
    if target == 0:
        return {
            "target": int(target),
            "actual": int(actual),
            "achievement_pct": None,
            "gap": int(actual - target),
            "flag": f"{label} 목표 0원 — 달성률 산출 불가",
        }
    achievement_pct = round((actual / target) * 100, 2)
    gap = int(actual - target)

    diff = achievement_pct - progress_rate_pct
    if diff < -FLAG_THRESHOLD_PP:
        flag = f"{label} 진도율 저조 ({diff:+.2f}%p)"
    elif diff > FLAG_THRESHOLD_PP:
        flag = f"{label} 목표 상회 ({diff:+.2f}%p)"
    else:
        flag = f"{label} 진도율 정상 범위 ({diff:+.2f}%p)"

    return {
        "target": int(target),
        "actual": int(actual),
        "achievement_pct": achievement_pct,
        "gap": gap,
        "flag": flag,
    }


def calc_target_vs_actual(
    target_revenue: int,
    actual_revenue: int,
    target_operating_income: int,
    actual_operating_income: int,
    target_net_income: int,
    actual_net_income: int,
    months_elapsed: int | None = None,
) -> dict:
    """목표 대비 달성률."""
    progress_rate_pct = (
        round((months_elapsed / 12) * 100, 2) if months_elapsed else 100.0
    )

    items = {
        "revenue": _item_achievement(
            target_revenue, actual_revenue, progress_rate_pct, "매출",
        ),
        "operating_income": _item_achievement(
            target_operating_income, actual_operating_income,
            progress_rate_pct, "영업이익",
        ),
        "net_income": _item_achievement(
            target_net_income, actual_net_income,
            progress_rate_pct, "당기순이익",
        ),
    }

    # 종합 상태 판정
    flags_summary = []
    rev_ach = items["revenue"]["achievement_pct"]
    op_ach = items["operating_income"]["achievement_pct"]

    def _is_behind(ach: float | None) -> bool:
        return ach is not None and ach < progress_rate_pct - FLAG_THRESHOLD_PP

    def _is_ahead(ach: float | None) -> bool:
        return ach is not None and ach > progress_rate_pct + FLAG_THRESHOLD_PP

    rev_behind = _is_behind(rev_ach)
    rev_ahead = _is_ahead(rev_ach)
    op_behind = _is_behind(op_ach)
    op_ahead = _is_ahead(op_ach)

    if rev_behind and op_ahead:
        overall_status = "혼조 — 매출은 부진하나 수익성은 양호"
    elif rev_ahead and op_behind:
        overall_status = "혼조 — 매출은 양호하나 수익성은 부진"
    elif rev_behind and op_behind:
        overall_status = "전반 부진 — 매출·수익성 모두 진도율 미달"
    elif rev_ahead and op_ahead:
        overall_status = "전반 양호 — 매출·수익성 모두 목표 상회"
    else:
        overall_status = "정상 범위 — 진도율 대비 큰 이탈 없음"

    return {
        "mode": "target-vs-actual",
        "months_elapsed": int(months_elapsed) if months_elapsed else None,
        "progress_rate_pct": progress_rate_pct,
        "items": items,
        "overall_status": overall_status,
        "disclaimer": DISCLAIMER,
    }


def calc_adjustment_checklist(month: str | None = None) -> dict:
    """결산조정 체크리스트."""
    categories = {
        "매출/채권": [
            "당월 발행분 전체 세금계산서 집계",
            "매출채권 잔액 확인",
            "대손충당금 설정률 점검",
        ],
        "재고": [
            "실사 or 장부 마감",
            "재고평가손실 검토",
        ],
        "고정자산": [
            "당월 감가상각비 계상",
            "자산 폐기·매각 회계처리",
        ],
        "선급/미지급": [
            "미지급비용 (급여·이자·임차료) 인식",
            "선급비용 (보험·월세 선납) 기간배분",
        ],
        "세금": [
            "부가세 예수금·대급금 정산",
            "법인세 중간예납 추정액",
        ],
        "충당금": [
            "퇴직급여충당금 전입",
            "제품보증충당금",
        ],
    }
    total_items = sum(len(v) for v in categories.values())

    result: dict = {
        "mode": "adjustment-checklist",
        "categories": categories,
        "total_items": total_items,
        "disclaimer": DISCLAIMER,
    }
    if month:
        result["month"] = month
    return result


# ─── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="가결산 추정기 (월별·YTD·목표대비·결산조정 체크리스트)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # monthly
    p_m = sub.add_parser("monthly", help="단월 가결산")
    p_m.add_argument("--revenue", type=int, required=True, help="당월 매출 (원)")
    p_m.add_argument("--cogs", type=int, required=True, help="당월 매출원가 (원)")
    p_m.add_argument("--sga", type=int, required=True, help="당월 판관비 (원)")
    p_m.add_argument("--other-income", type=int, default=0, help="영업외수익 (원)")
    p_m.add_argument("--other-expense", type=int, default=0, help="영업외비용 (원)")
    p_m.add_argument("--interest-expense", type=int, default=0, help="이자비용 (원)")
    p_m.add_argument(
        "--estimated-tax-rate", type=float, default=DEFAULT_TAX_RATE,
        help=f"예상 법인세율 (default {DEFAULT_TAX_RATE} — 지방세 포함 과표 2억 초과 구간)",
    )

    # ytd
    p_y = sub.add_parser("ytd", help="누적(YTD) 가결산 + 연환산")
    p_y.add_argument("--ytd-revenue", type=int, required=True, help="누적 매출 (원)")
    p_y.add_argument("--ytd-cogs", type=int, required=True, help="누적 매출원가 (원)")
    p_y.add_argument("--ytd-sga", type=int, required=True, help="누적 판관비 (원)")
    p_y.add_argument("--ytd-other-income", type=int, default=0)
    p_y.add_argument("--ytd-other-expense", type=int, default=0)
    p_y.add_argument("--ytd-interest-expense", type=int, default=0)
    p_y.add_argument(
        "--months-elapsed", type=int, required=True,
        help="누적 개월수 (1~12)",
    )
    p_y.add_argument(
        "--estimated-tax-rate", type=float, default=DEFAULT_TAX_RATE,
    )

    # target-vs-actual
    p_t = sub.add_parser("target-vs-actual", help="목표 대비 달성률")
    p_t.add_argument("--target-revenue", type=int, required=True)
    p_t.add_argument("--actual-revenue", type=int, required=True)
    p_t.add_argument("--target-operating-income", type=int, required=True)
    p_t.add_argument("--actual-operating-income", type=int, required=True)
    p_t.add_argument("--target-net-income", type=int, required=True)
    p_t.add_argument("--actual-net-income", type=int, required=True)
    p_t.add_argument(
        "--months-elapsed", type=int, default=None,
        help="경과월수 (1~12). 미지정 시 progress_rate=100%",
    )

    # adjustment-checklist
    p_c = sub.add_parser("adjustment-checklist", help="결산조정 체크리스트")
    p_c.add_argument("--month", type=str, default=None, help="표시용 라벨 (예: 2026-04)")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "monthly":
        result = calc_monthly(
            revenue=args.revenue,
            cogs=args.cogs,
            sga=args.sga,
            other_income=args.other_income,
            other_expense=args.other_expense,
            interest_expense=args.interest_expense,
            estimated_tax_rate=args.estimated_tax_rate,
        )
    elif args.cmd == "ytd":
        result = calc_ytd(
            ytd_revenue=args.ytd_revenue,
            ytd_cogs=args.ytd_cogs,
            ytd_sga=args.ytd_sga,
            months_elapsed=args.months_elapsed,
            ytd_other_income=args.ytd_other_income,
            ytd_other_expense=args.ytd_other_expense,
            ytd_interest_expense=args.ytd_interest_expense,
            estimated_tax_rate=args.estimated_tax_rate,
        )
    elif args.cmd == "target-vs-actual":
        result = calc_target_vs_actual(
            target_revenue=args.target_revenue,
            actual_revenue=args.actual_revenue,
            target_operating_income=args.target_operating_income,
            actual_operating_income=args.actual_operating_income,
            target_net_income=args.target_net_income,
            actual_net_income=args.actual_net_income,
            months_elapsed=args.months_elapsed,
        )
    elif args.cmd == "adjustment-checklist":
        result = calc_adjustment_checklist(month=args.month)
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
