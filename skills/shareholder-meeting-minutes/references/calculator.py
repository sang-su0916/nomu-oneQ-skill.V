#!/usr/bin/env python3
"""
주주총회 의사록 보조 계산기 — 상법 §363 / §368 / §373 / §434 외

서브커맨드:
  quorum            의결 정족수 판정 (보통·특별)
  notice-deadline   소집통지 마감일 계산 (§363, §363⑤)
  checklist         의사록 필수 기재사항 체크 (§373)
  agenda-template   안건 문구 템플릿 생성 (정기주총 전형 안건 7종)

CLI:
  python3 calculator.py quorum --type special \\
      --total-shares 1000 --present-shares 500 --affirmative-shares 335
  python3 calculator.py notice-deadline --meeting-date 2026-05-15 \\
      --capital-under-1bn
  python3 calculator.py checklist --has-company-name --has-meeting-type \\
      --has-date-place --has-attendance --has-chair --has-opening \\
      --has-agenda-results --has-closing --has-signatures
  python3 calculator.py agenda-template --agenda-type financial-statement \\
      --company-name "주식회사 엘비즈파트너스" --fiscal-year "제10기"

주의:
  - 표준 라이브러리만 사용 (argparse, json, sys, datetime, fractions)
  - 모든 출력 JSON (ensure_ascii=False, indent=2)
  - 분수 비교는 Fraction으로 수행해 부동소수 오차 회피
  - 비상장 중소기업 기준. 상장회사 특례·공증·등기 요건은 별도 확인 필요.
"""

import argparse
import json
import sys
from datetime import date, datetime, timedelta
from fractions import Fraction

# ─── 상수 (상법 §363, §368, §373, §434) ─────────────────────────────────────

ORDINARY_PRESENT_RATIO = Fraction(1, 2)   # 보통결의 출석 요건: 과반수(1/2 초과)
ORDINARY_TOTAL_RATIO = Fraction(1, 4)     # 보통결의 총수 요건: 1/4 이상
SPECIAL_PRESENT_RATIO = Fraction(2, 3)    # 특별결의 출석 요건: 2/3 이상
SPECIAL_TOTAL_RATIO = Fraction(1, 3)      # 특별결의 총수 요건: 1/3 이상

NOTICE_DAYS_NORMAL = 14                   # §363 일반: 2주 전 (14일)
NOTICE_DAYS_SMALL = 10                    # §363⑤ 자본금 10억 미만: 10일 전

DISCLAIMER = (
    "2026년 기준 상법. 상장회사 특례(감사위원 분리선출·전자공시 등)와 "
    "주주명부 폐쇄·기준일·공증·등기 요건은 본 스킬 범위 밖 — 실제 의사록 "
    "확정 및 등기·공증은 변호사·법무사 자문 필수."
)


# ─── 1) quorum ────────────────────────────────────────────────────────────────

def quorum(
    resolution_type: str,
    total_shares: int,
    present_shares: int,
    affirmative_shares: int,
) -> dict:
    """의결 정족수 판정 (상법 §368 보통 / §434 특별).

    보통결의: 찬성 > 출석 × 1/2 AND 찬성 ≥ 총수 × 1/4
    특별결의: 찬성 ≥ 출석 × 2/3 AND 찬성 ≥ 총수 × 1/3

    ⚠️ "출석 과반수"는 §368 문언상 '초과'. 경계(정확히 1/2)는 부결.
    """
    if resolution_type not in ("ordinary", "special"):
        return {"error": "type은 ordinary 또는 special 이어야 합니다"}
    if total_shares <= 0:
        return {"error": "발행주식총수(total_shares)는 1 이상이어야 합니다"}
    if present_shares < 0 or affirmative_shares < 0:
        return {"error": "주식 수는 0 이상이어야 합니다"}
    if present_shares > total_shares:
        return {"error": "출석 주식수가 발행주식총수를 초과할 수 없습니다"}
    if affirmative_shares > present_shares:
        return {"error": "찬성 주식수가 출석 주식수를 초과할 수 없습니다"}

    if resolution_type == "ordinary":
        # 보통결의: 출석 과반수(초과) + 총수 1/4 이상
        present_threshold = present_shares * ORDINARY_PRESENT_RATIO
        total_threshold = total_shares * ORDINARY_TOTAL_RATIO
        # '과반수'는 초과 → 분수 비교: affirmative > present/2
        present_met = Fraction(affirmative_shares) > present_threshold
        total_met = Fraction(affirmative_shares) >= total_threshold
        present_label = "출석 의결권 과반수(1/2 초과)"
        total_label = "발행주식총수 1/4 이상"
        legal_basis = "상법 §368"
    else:
        # 특별결의: 출석 2/3 이상 + 총수 1/3 이상
        present_threshold = present_shares * SPECIAL_PRESENT_RATIO
        total_threshold = total_shares * SPECIAL_TOTAL_RATIO
        present_met = Fraction(affirmative_shares) >= present_threshold
        total_met = Fraction(affirmative_shares) >= total_threshold
        present_label = "출석 의결권 2/3 이상"
        total_label = "발행주식총수 1/3 이상"
        legal_basis = "상법 §434"

    passed = present_met and total_met

    return {
        "mode": "quorum",
        "resolution_type": resolution_type,
        "resolution_type_kr": "보통결의" if resolution_type == "ordinary" else "특별결의",
        "inputs": {
            "total_shares": total_shares,
            "present_shares": present_shares,
            "affirmative_shares": affirmative_shares,
        },
        "present_requirement": {
            "label": present_label,
            "threshold_shares": float(present_threshold),
            "affirmative_shares": affirmative_shares,
            "met": present_met,
        },
        "total_requirement": {
            "label": total_label,
            "threshold_shares": float(total_threshold),
            "affirmative_shares": affirmative_shares,
            "met": total_met,
        },
        "passed": passed,
        "result_label": "가결" if passed else "부결",
        "legal_basis": legal_basis,
        "disclaimer": DISCLAIMER,
    }


# ─── 2) notice-deadline ──────────────────────────────────────────────────────

def notice_deadline(meeting_date_str: str, capital_under_1bn: bool) -> dict:
    """소집통지 마감일 계산 (§363).

    - 일반: 주총일의 2주 전(14일 전)까지 서면/전자 통지
    - 자본금 10억 미만 소규모회사(§363⑤): 10일 전까지 가능
    - 주주 전원동의 시 소집절차 생략 가능 (§363④)
    """
    try:
        meeting_date = datetime.strptime(meeting_date_str, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "meeting-date 형식은 YYYY-MM-DD 이어야 합니다"}

    days = NOTICE_DAYS_SMALL if capital_under_1bn else NOTICE_DAYS_NORMAL
    deadline = meeting_date - timedelta(days=days)

    return {
        "mode": "notice-deadline",
        "inputs": {
            "meeting_date": meeting_date.isoformat(),
            "capital_under_1bn": capital_under_1bn,
        },
        "notice_days": days,
        "rule_label": (
            "자본금 10억 미만 소규모회사 10일 전 특례 (§363⑤)"
            if capital_under_1bn else "일반 2주(14일) 전 (§363)"
        ),
        "deadline_date": deadline.isoformat(),
        "notice_statement": f"{deadline.isoformat()}까지 서면 또는 전자적 방법으로 소집통지 완료",
        "waiver_note": "주주 전원의 동의가 있으면 소집절차를 생략할 수 있습니다(§363④).",
        "legal_basis": "상법 §363",
        "disclaimer": DISCLAIMER,
    }


# ─── 3) checklist ────────────────────────────────────────────────────────────

CHECKLIST_ITEMS = [
    ("has_company_name", "1. 회사명"),
    ("has_meeting_type", "2. 총회 종류(정기·임시)"),
    ("has_date_place", "3. 일시·장소"),
    ("has_attendance", "4. 출석주주 수·의결권 수"),
    ("has_chair", "5. 의장 선임"),
    ("has_opening", "6. 개회 선언"),
    ("has_agenda_results", "7. 안건별 심의·결의 결과"),
    ("has_closing", "8. 폐회"),
    ("has_signatures", "9. 의장·출석이사 기명날인/서명"),
]


def checklist(flags: dict) -> dict:
    """의사록 필수 기재사항 9항목 체크 (§373 기준).

    §373: ① 의사의 경과요령 ② 결과 ③ 의장·출석이사 기명날인/서명
    → 실무상 9항목(회사명~서명)으로 세분화.
    """
    satisfied: list[str] = []
    missing: list[str] = []

    for key, label in CHECKLIST_ITEMS:
        if flags.get(key, False):
            satisfied.append(label)
        else:
            missing.append(label)

    total = len(CHECKLIST_ITEMS)
    sat_count = len(satisfied)
    compliant = len(missing) == 0

    recommendations: list[str] = []
    if missing:
        recommendations.append(
            "누락된 항목을 보완하여 §373(의사의 경과요령·결과·기명날인) 요건을 충족하세요."
        )
    if "6. 개회 선언" in missing or "8. 폐회" in missing:
        recommendations.append(
            "개회·폐회 선언은 의사 경과요령의 필수 요소이므로 누락 시 분쟁 시 다툼의 여지."
        )
    if "9. 의장·출석이사 기명날인/서명" in missing:
        recommendations.append(
            "§373③ 기명날인/서명이 없으면 의사록 효력 자체가 문제됩니다 — 반드시 보완."
        )

    return {
        "mode": "checklist",
        "inputs": {key: bool(flags.get(key, False)) for key, _ in CHECKLIST_ITEMS},
        "total_items": total,
        "satisfied_count": sat_count,
        "missing_count": len(missing),
        "satisfied": satisfied,
        "missing": missing,
        "compliant_with_art_373": compliant,
        "recommendations": recommendations,
        "legal_basis": "상법 §373",
        "disclaimer": DISCLAIMER,
    }


# ─── 4) agenda-template ──────────────────────────────────────────────────────

AGENDA_TEMPLATES = {
    "financial-statement": {
        "title_tpl": "{fiscal_year} ({company_name}) 재무제표 승인의 건",
        "chair_tpl": (
            "의장은 {fiscal_year} 재무제표(대차대조표·손익계산서·이익잉여금처분계산서)를 "
            "별첨과 같이 제출하고 그 내용을 설명한 후 본 의안의 승인을 구하였다."
        ),
        "result_tpl": "출석 주주 전원의 찬성으로 원안대로 가결되다.",
        "resolution_type": "ordinary",
        "legal_basis": "상법 §449·§447, §368 (보통결의)",
    },
    "dividend": {
        "title_tpl": "{fiscal_year} 이익잉여금 처분(현금배당) 결의의 건",
        "chair_tpl": (
            "의장은 {fiscal_year} 이익잉여금 중 1주당 금 ○○○원, 총액 금 ○○○,○○○,○○○원을 "
            "현금배당하고, 배당기준일과 배당금 지급 개시일을 정할 것을 부의하였다."
        ),
        "result_tpl": "출석 주주 전원의 찬성으로 원안대로 가결되다.",
        "resolution_type": "ordinary",
        "legal_basis": "상법 §462, §368 (보통결의)",
    },
    "director-compensation": {
        "title_tpl": "이사 및 감사의 보수한도 승인의 건",
        "chair_tpl": (
            "의장은 {fiscal_year} 이사의 보수한도액과 감사의 보수한도액을 정할 것을 부의하였다."
        ),
        "result_tpl": "출석 주주 전원의 찬성으로 원안대로 가결되다.",
        "resolution_type": "ordinary",
        "legal_basis": "상법 §388, §368 (보통결의)",
    },
    "director-appointment": {
        "title_tpl": "이사 선임의 건",
        "chair_tpl": (
            "의장은 이사 선임의 건을 부의하고, 후보자의 인적사항·경력을 설명한 후 "
            "본 의안의 승인을 구하였다."
        ),
        "result_tpl": (
            "출석 주주 ○○주(○○.○%)의 찬성으로 원안대로 가결되다. "
            "(이해관계 안건으로 기권·반대표가 있는 경우 별도 기재)"
        ),
        "resolution_type": "ordinary",
        "legal_basis": "상법 §382, §368 (보통결의)",
    },
    "articles-amendment": {
        "title_tpl": "정관 일부 변경의 건",
        "chair_tpl": (
            "의장은 {fiscal_year} 정관 일부 변경안을 별첨과 같이 제출하고 주요 변경사항을 "
            "설명한 후 본 의안의 승인을 구하였다."
        ),
        "result_tpl": (
            "발행주식총수 1/3 이상 및 출석 의결권 2/3 이상의 찬성으로 원안대로 가결되다."
        ),
        "resolution_type": "special",
        "legal_basis": "상법 §433·§434 (특별결의)",
    },
    "stock-option": {
        "title_tpl": "주식매수선택권 부여의 건",
        "chair_tpl": (
            "의장은 임직원 ○○○ 외 ○명에게 주식매수선택권을 부여하는 건을 부의하고, "
            "부여 대상자·수량·행사가액·행사기간을 설명한 후 본 의안의 승인을 구하였다."
        ),
        "result_tpl": "출석 주주 전원의 찬성으로 원안대로 가결되다.",
        "resolution_type": "ordinary",
        "legal_basis": "상법 §340의2·§340의3, §368 (정관 근거 + 보통결의)",
    },
    "custom": {
        "title_tpl": "(안건명 수기 입력)",
        "chair_tpl": "의장은 본 의안을 부의하고 내용을 설명한 후 승인을 구하였다.",
        "result_tpl": "출석 주주 전원의 찬성으로 원안대로 가결되다.",
        "resolution_type": "ordinary",
        "legal_basis": "상법 §368 또는 §434 (안건 성격에 따라)",
    },
}


def agenda_template(
    agenda_type: str,
    company_name: str = "주식회사 ○○○○",
    fiscal_year: str = "제○○기",
) -> dict:
    """안건 문구 템플릿 생성 (정기주총 전형 안건 7종 + custom)."""
    if agenda_type not in AGENDA_TEMPLATES:
        return {
            "error": (
                f"agenda-type은 {list(AGENDA_TEMPLATES.keys())} 중 하나여야 합니다"
            ),
        }

    tpl = AGENDA_TEMPLATES[agenda_type]
    title = tpl["title_tpl"].format(company_name=company_name, fiscal_year=fiscal_year)
    chair = tpl["chair_tpl"].format(company_name=company_name, fiscal_year=fiscal_year)
    result = tpl["result_tpl"]

    return {
        "mode": "agenda-template",
        "agenda_type": agenda_type,
        "inputs": {
            "company_name": company_name,
            "fiscal_year": fiscal_year,
        },
        "title": title,
        "chair_statement": chair,
        "result_statement": result,
        "full_text": f"{title}\n\n  {chair}\n  → {result}",
        "resolution_type": tpl["resolution_type"],
        "resolution_type_kr": (
            "보통결의" if tpl["resolution_type"] == "ordinary" else "특별결의"
        ),
        "legal_basis": tpl["legal_basis"],
        "disclaimer": DISCLAIMER,
    }


# ─── CLI ─────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="calculator.py",
        description="주주총회 의사록 보조 계산기 — 상법 §363·§368·§373·§434 외",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # quorum
    p_q = sub.add_parser("quorum", help="의결 정족수 판정 (보통·특별)")
    p_q.add_argument("--type", dest="resolution_type",
                     choices=("ordinary", "special"), required=True,
                     help="결의 유형 (ordinary=보통, special=특별)")
    p_q.add_argument("--total-shares", type=int, required=True, help="발행주식총수")
    p_q.add_argument("--present-shares", type=int, required=True, help="출석 주식수")
    p_q.add_argument("--affirmative-shares", type=int, required=True, help="찬성 주식수")

    # notice-deadline
    p_n = sub.add_parser("notice-deadline", help="소집통지 마감일 계산 (§363)")
    p_n.add_argument("--meeting-date", required=True, help="주총일 (YYYY-MM-DD)")
    p_n.add_argument("--capital-under-1bn", action="store_true",
                     help="자본금 10억 미만 소규모회사 여부 (§363⑤ 10일 전 특례)")

    # checklist
    p_c = sub.add_parser("checklist", help="의사록 필수 기재 9항목 체크 (§373)")
    for key, label in CHECKLIST_ITEMS:
        flag_name = "--" + key.replace("_", "-")
        p_c.add_argument(flag_name, action="store_true", help=f"체크: {label}")

    # agenda-template
    p_a = sub.add_parser("agenda-template", help="안건 문구 템플릿 생성")
    p_a.add_argument("--agenda-type",
                     choices=tuple(AGENDA_TEMPLATES.keys()),
                     required=True, help="안건 유형")
    p_a.add_argument("--company-name", default="주식회사 ○○○○", help="회사명")
    p_a.add_argument("--fiscal-year", default="제○○기",
                     help="사업연도 (예: 제10기)")

    return parser


def main(argv=None) -> int:
    args = _build_parser().parse_args(argv)

    if args.cmd == "quorum":
        result = quorum(
            resolution_type=args.resolution_type,
            total_shares=args.total_shares,
            present_shares=args.present_shares,
            affirmative_shares=args.affirmative_shares,
        )
    elif args.cmd == "notice-deadline":
        result = notice_deadline(
            meeting_date_str=args.meeting_date,
            capital_under_1bn=args.capital_under_1bn,
        )
    elif args.cmd == "checklist":
        flags = {key: getattr(args, key) for key, _ in CHECKLIST_ITEMS}
        result = checklist(flags=flags)
    elif args.cmd == "agenda-template":
        result = agenda_template(
            agenda_type=args.agenda_type,
            company_name=args.company_name,
            fiscal_year=args.fiscal_year,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
