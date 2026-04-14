#!/usr/bin/env python3
"""
주주총회 의사록 보조 계산기 — 상법 §363 / §368 / §373 / §434 외

서브커맨드:
  quorum            의결 정족수 판정 (보통·특별)
  notice-deadline   소집통지 마감일 계산 (§363, §363⑤)
  checklist         의사록 필수 기재사항 체크 (§373)
  agenda-template   안건 문구 템플릿 생성 (11종 + custom)
  full-minutes      회사 유형별 전체 의사록 텍스트 생성
                    (general / small / single-shareholder / written-resolution,
                     regular / extraordinary)

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
  python3 calculator.py full-minutes --company-type general \\
      --meeting-type regular --fiscal-year 10 \\
      --agenda-types financial-statement,dividend,director-compensation

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

# 상수님 제공 표준 결의 문구
ORDINARY_RESULT = (
    "출석주주의 의결권의 과반수와 발행주식총수의 4분의 1 이상 찬성으로 "
    "원안대로 승인 가결하다."
)
SPECIAL_RESULT = (
    "출석주주의 의결권의 3분의 2 이상과 발행주식총수의 3분의 1 이상 찬성으로 "
    "원안대로 승인 가결하다."
)

AGENDA_TEMPLATES = {
    "financial-statement": {
        "title_tpl": "{fiscal_year} 재무제표 승인의 건",
        "chair_tpl": (
            "의장은 {fiscal_year} 재무상태표·손익계산서·이익잉여금처분계산서(안)을 "
            "별첨과 같이 제출하고 그 내용을 설명한 후 본 의안의 승인을 구한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": ORDINARY_RESULT,
        "resolution_type": "ordinary",
        "legal_basis": "상법 §449·§447, §368 (보통결의)",
    },
    "dividend": {
        "title_tpl": "{fiscal_year} 이익잉여금 처분(현금배당) 결의의 건",
        "chair_tpl": (
            "의장은 {fiscal_year} 이익잉여금 중 1주당 금 ○○○원, 총액 금 ○○○,○○○,○○○원을 "
            "현금배당하고, 배당기준일을 ○○○○년 ○월 ○일로, 배당금 지급 개시일을 "
            "○○○○년 ○월 ○일로 할 것을 부의한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": ORDINARY_RESULT,
        "resolution_type": "ordinary",
        "legal_basis": "상법 §462, §368 (보통결의)",
    },
    "director-compensation": {
        "title_tpl": "이사 및 감사의 보수한도 승인의 건",
        "chair_tpl": (
            "의장은 {fiscal_year} 이사의 보수한도액을 금 ○○○,○○○,○○○원, "
            "감사의 보수한도액을 금 ○○,○○○,○○○원으로 정할 것을 부의한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": ORDINARY_RESULT,
        "resolution_type": "ordinary",
        "legal_basis": "상법 §388, §368 (보통결의)",
    },
    "director-appointment": {
        "title_tpl": "이사 선임의 건",
        "chair_tpl": (
            "의장은 이사 ○○○를 선임하고자 함을 설명한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": ORDINARY_RESULT,
        "resolution_type": "ordinary",
        "legal_basis": "상법 §382, §368 (보통결의)",
    },
    "articles-amendment": {
        "title_tpl": "정관 일부 변경의 건",
        "chair_tpl": (
            "의장은 정관 일부 변경안을 별첨과 같이 제출하고 주요 변경사항을 "
            "설명한바, 상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": SPECIAL_RESULT,
        "resolution_type": "special",
        "legal_basis": "상법 §433·§434 (특별결의)",
    },
    "stock-option": {
        "title_tpl": "주식매수선택권 부여의 건",
        "chair_tpl": (
            "의장은 임직원 ○○○ 외 ○명에게 주식매수선택권을 부여하는 건을 부의하고, "
            "부여 대상자·수량·행사가액·행사기간을 설명한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": ORDINARY_RESULT,
        "resolution_type": "ordinary",
        "legal_basis": "상법 §340의2·§340의3, §368 (정관 근거 + 보통결의)",
    },
    "ceo-appointment": {
        "title_tpl": "대표이사 선임의 건",
        "chair_tpl": (
            "의장은 새로 선임된 이사 ○○○를 대표이사로 선임하고자 함을 설명한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": ORDINARY_RESULT,
        "resolution_type": "ordinary",
        "legal_basis": "상법 §389, §368 (보통결의)",
    },
    "headquarters-relocation": {
        "title_tpl": "본점 이전의 건",
        "chair_tpl": (
            "의장은 회사 본점을 ○○시 ○○구 ○○로 ○○로 이전하고자 함을 설명한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": ORDINARY_RESULT,
        "resolution_type": "ordinary",
        "legal_basis": "상법 §289·§368 (정관 범위 내 보통결의 / 정관 변경 동반 시 특별결의)",
    },
    "capital-reduction": {
        "title_tpl": "자본금 감소의 건",
        "chair_tpl": (
            "의장은 회사의 자본금을 금 ○○○,○○○,○○○원에서 금 ○○○,○○○,○○○원으로 "
            "감소하고자 함을 설명한바, 상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": SPECIAL_RESULT,
        "resolution_type": "special",
        "legal_basis": "상법 §438·§434 (특별결의)",
    },
    "director-removal": {
        "title_tpl": "이사 해임의 건",
        "chair_tpl": (
            "의장은 이사 ○○○를 해임하고자 함을 설명한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": SPECIAL_RESULT,
        "resolution_type": "special",
        "legal_basis": "상법 §385·§434 (특별결의)",
    },
    "merger": {
        "title_tpl": "회사 합병의 건",
        "chair_tpl": (
            "의장은 회사가 ○○주식회사와 합병하고자 함을 설명하고 합병계약서(안)을 "
            "별첨과 같이 제출한바, 상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": SPECIAL_RESULT,
        "resolution_type": "special",
        "legal_basis": "상법 §522·§434 (특별결의)",
    },
    "custom": {
        "title_tpl": "(안건명 수기 입력)",
        "chair_tpl": (
            "의장은 본 의안을 부의하고 내용을 설명한바, "
            "상법 및 정관이 정한 결의요건을 충족하였으므로"
        ),
        "result_tpl": ORDINARY_RESULT,
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
        "full_text": f"{title}\n\n  {chair} {result}",
        "resolution_type": tpl["resolution_type"],
        "resolution_type_kr": (
            "보통결의" if tpl["resolution_type"] == "ordinary" else "특별결의"
        ),
        "legal_basis": tpl["legal_basis"],
        "disclaimer": DISCLAIMER,
    }


# ─── 5) full-minutes ─────────────────────────────────────────────────────────

COMPANY_TYPE_LABELS = {
    "general": "비상장 일반 주식회사",
    "small": "소규모회사(자본금 10억 원 미만)",
    "single-shareholder": "1인 주주 회사(개최형)",
    "written-resolution": "1인 주주 회사(서면결의형)",
}

MEETING_TYPE_LABELS = {
    "regular": "정기주주총회",
    "extraordinary": "임시주주총회",
}

# 변경 금지 문구 (상수님 제공 표준)
NOTICE_SMALL = (
    "자본금 총액 10억 원 미만 회사로서 상법 제363조에 따라 "
    "주주총회일 10일 전에 각 주주에게 소집통지를 완료하였다."
)
NOTICE_WAIVER_SINGLE = (
    "주주 전원의 동의에 따라 소집절차 없이 주주총회를 개최하였다."
)
WRITTEN_RESOLUTION_CLAUSE = (
    "상법 제363조 제5항에 따라 아래 사항에 대하여 서면으로 동의하고, "
    "주주총회 결의가 있었던 것으로 하기로 하다."
)
CLOSING_CLAUSE = (
    "위 결의를 명확히 하기 위하여 이 의사록을 작성하고 "
    "의장과 출석한 이사가 아래와 같이 기명날인 또는 서명하다."
)


def _render_agenda_block(idx: int, agenda_type: str, fiscal_year_str: str,
                         company_name: str) -> tuple[str, str]:
    """안건 1건을 의사록 본문용으로 렌더링. (블록 텍스트, resolution_type) 반환."""
    tpl = AGENDA_TEMPLATES[agenda_type]
    title = tpl["title_tpl"].format(
        company_name=company_name, fiscal_year=fiscal_year_str,
    )
    chair = tpl["chair_tpl"].format(
        company_name=company_name, fiscal_year=fiscal_year_str,
    )
    result = tpl["result_tpl"]
    block = (
        f"  제{idx}호 의안: {title}\n"
        f"    {chair} {result}"
    )
    return block, tpl["resolution_type"]


def full_minutes(
    company_type: str,
    meeting_type: str,
    fiscal_year: int,
    meeting_date_str: str,
    company_name: str,
    address: str,
    agenda_types: list[str],
) -> dict:
    """회사 유형별 전체 의사록 텍스트 생성.

    - company_type: general / small / single-shareholder / written-resolution
    - meeting_type: regular / extraordinary
    - 출력: template_text 필드에 복붙 가능한 전체 의사록 문자열.
    """
    if company_type not in COMPANY_TYPE_LABELS:
        return {"error": f"company-type은 {list(COMPANY_TYPE_LABELS)} 중 하나여야 합니다"}
    if meeting_type not in MEETING_TYPE_LABELS:
        return {"error": f"meeting-type은 {list(MEETING_TYPE_LABELS)} 중 하나여야 합니다"}
    if fiscal_year <= 0:
        return {"error": "fiscal-year는 1 이상 정수여야 합니다"}
    try:
        meeting_date = datetime.strptime(meeting_date_str, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "meeting-date 형식은 YYYY-MM-DD 이어야 합니다"}

    unknown = [a for a in agenda_types if a not in AGENDA_TEMPLATES]
    if unknown:
        return {"error": f"미지원 안건: {unknown} — 지원: {list(AGENDA_TEMPLATES)}"}

    fiscal_str = f"제{fiscal_year}기"
    meeting_label = MEETING_TYPE_LABELS[meeting_type]
    date_str = (
        f"{meeting_date.year}년 {meeting_date.month}월 {meeting_date.day}일"
    )

    # 헤더 (1인 서면결의형은 "주주총회 결의서" 제목, 그 외는 "의사록")
    lines: list[str] = []
    if company_type == "written-resolution":
        # 서면결의는 정기/임시 구분 없이 별도 양식
        header = f"{fiscal_str} 주주총회 결의서"
    else:
        if meeting_type == "regular":
            header = f"{fiscal_str} 정기주주총회 의사록"
        else:
            header = "임시주주총회 의사록"
    lines.append("─" * 40)
    lines.append(f"           {header}")
    lines.append("─" * 40)
    lines.append("")

    # 기본 정보
    lines.append(f"1. 회 사 명: {company_name}")
    lines.append(f"2. 총회종류: {meeting_label}")
    lines.append(f"3. 일    시: {date_str}")
    lines.append(f"4. 장    소: {address}")
    lines.append("")

    if company_type == "written-resolution":
        # 1인 서면결의형 — 소집·출석·의장 생략, 결의서 본문
        lines.append("5. 결의 방식:")
        lines.append(f"   {WRITTEN_RESOLUTION_CLAUSE}")
        lines.append("")
        lines.append("6. 결의 사항:")
        lines.append("")
        for i, atype in enumerate(agenda_types, start=1):
            block, _ = _render_agenda_block(i, atype, fiscal_str, company_name)
            lines.append(block)
            lines.append("")
        lines.append(f"   {date_str}")
        lines.append("")
        lines.append(f"   {company_name}")
        lines.append("     주주 ○ ○ ○  (인)")
    else:
        # 소집통지·출석·의장 파트
        lines.append("5. 소집 및 출석 상황:")
        if company_type == "small":
            lines.append(f"   - {NOTICE_SMALL}")
            lines.append("   - 발행주식의 총수:          ○○,○○○주")
            lines.append("   - 의결권 있는 주식의 총수:  ○○,○○○주")
            lines.append("   - 출석주주의 주식수:        ○○,○○○주")
        elif company_type == "single-shareholder":
            lines.append(f"   - {NOTICE_WAIVER_SINGLE}")
            lines.append(
                "   - 주주 ○○○가 의결권 있는 주식 ○○주 전부를 보유하고 출석하였다."
            )
        else:  # general
            lines.append(
                "   - 상법 제363조에 따라 주주총회일 2주 전에 "
                "각 주주에게 소집통지를 완료하였다."
            )
            lines.append("   - 발행주식의 총수:          ○○,○○○주")
            lines.append("   - 의결권 있는 주식의 총수:  ○○,○○○주")
            lines.append("   - 출석주주의 주식수:        ○○,○○○주 (출석률 ○○.○%)")
        lines.append("")

        lines.append("6. 의    장: 대표이사 ○ ○ ○")
        lines.append(
            "7. 개 회 선언: 의장은 위와 같이 적법한 성원이 되었음을 확인하고 "
            "○시 ○분에 개회를 선언하다."
        )
        lines.append("")

        # 임시주총은 사유 문구 추가
        if meeting_type == "extraordinary":
            lines.append(
                "   ※ 본 임시주주총회는 아래 안건을 신속히 처리하기 위하여 "
                "소집되었음을 의장이 설명하였다."
            )
            lines.append("")

        lines.append("8. 의안의 심의 및 결의:")
        lines.append("")
        for i, atype in enumerate(agenda_types, start=1):
            block, _ = _render_agenda_block(i, atype, fiscal_str, company_name)
            lines.append(block)
            lines.append("")

        lines.append("9. 폐    회: 의장은 ○시 ○분에 폐회를 선언하다.")
        lines.append("")
        lines.append(f"   {CLOSING_CLAUSE}")
        lines.append("")
        lines.append(f"     {date_str}")
        lines.append("")
        lines.append(f"     {company_name}")
        lines.append("        의장 대표이사 ○ ○ ○  (인)")
        lines.append("        출석이사      ○ ○ ○  (인)")
        lines.append("        출석이사      ○ ○ ○  (인)")

    lines.append("─" * 40)
    template_text = "\n".join(lines)

    # 안건별 결의유형 요약
    agenda_summary = []
    for i, atype in enumerate(agenda_types, start=1):
        tpl = AGENDA_TEMPLATES[atype]
        agenda_summary.append({
            "index": i,
            "agenda_type": atype,
            "title": tpl["title_tpl"].format(
                company_name=company_name, fiscal_year=fiscal_str,
            ),
            "resolution_type": tpl["resolution_type"],
            "resolution_type_kr": (
                "보통결의" if tpl["resolution_type"] == "ordinary" else "특별결의"
            ),
            "legal_basis": tpl["legal_basis"],
        })

    return {
        "mode": "full-minutes",
        "company_type": company_type,
        "company_type_kr": COMPANY_TYPE_LABELS[company_type],
        "meeting_type": meeting_type,
        "meeting_type_kr": MEETING_TYPE_LABELS[meeting_type],
        "inputs": {
            "fiscal_year": fiscal_year,
            "meeting_date": meeting_date.isoformat(),
            "company_name": company_name,
            "address": address,
            "agenda_types": agenda_types,
        },
        "agenda_summary": agenda_summary,
        "template_text": template_text,
        "legal_basis": "상법 §363·§368·§373·§434",
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

    # full-minutes
    p_f = sub.add_parser("full-minutes", help="회사 유형별 전체 의사록 텍스트 생성")
    p_f.add_argument("--company-type",
                     choices=tuple(COMPANY_TYPE_LABELS.keys()),
                     default="general",
                     help="회사 유형 (general/small/single-shareholder/written-resolution)")
    p_f.add_argument("--meeting-type",
                     choices=tuple(MEETING_TYPE_LABELS.keys()),
                     default="regular",
                     help="총회 유형 (regular=정기, extraordinary=임시)")
    p_f.add_argument("--fiscal-year", type=int, default=10,
                     help="기수 (정수, 예: 10 → 제10기)")
    p_f.add_argument("--meeting-date",
                     default=date.today().isoformat(),
                     help="주총 개최일 YYYY-MM-DD (기본: 오늘)")
    p_f.add_argument("--company-name", default="○○주식회사", help="회사명")
    p_f.add_argument("--address",
                     default="○○시 ○○구 ○○로 ○○",
                     help="회사 주소(총회 장소)")
    p_f.add_argument("--agenda-types",
                     default="financial-statement,dividend,director-compensation",
                     help=(
                         "콤마 구분 안건 타입 리스트. 지원: "
                         + ",".join(AGENDA_TEMPLATES.keys())
                     ))

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
    elif args.cmd == "full-minutes":
        agenda_list = [a.strip() for a in args.agenda_types.split(",") if a.strip()]
        result = full_minutes(
            company_type=args.company_type,
            meeting_type=args.meeting_type,
            fiscal_year=args.fiscal_year,
            meeting_date_str=args.meeting_date,
            company_name=args.company_name,
            address=args.address,
            agenda_types=agenda_list,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
