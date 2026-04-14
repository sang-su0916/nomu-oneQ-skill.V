#!/usr/bin/env python3
"""
주주총회 의사록 보조 계산기 — 상법 §363 / §368 / §373 / §434 외

서브커맨드:
  quorum            의결 정족수 판정 (보통·특별)
  notice-deadline   소집통지 마감일 계산 (§363, §363⑤)
  checklist         의사록 필수 기재사항 체크 (§373)
  agenda-template   안건 문구 템플릿 생성 (11종 + custom)
  full-minutes      회사 유형별 전체 의사록 텍스트 생성
                    (general / small / single-shareholder / written-resolution
                     / lbiz-standard,
                     regular / extraordinary)
  consent-form      주주 전원 기간 단축(소집통지 생략) 동의서 생성 (§363⑤)

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
    "lbiz-standard": "엘비즈 표준 양식(상수님 실무 템플릿)",
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


def _format_korean_date(d: date, long_form: bool = False) -> str:
    """'YYYY. M. DD' 형식으로 포매팅. long_form=True면 'YYYY년 M월 DD일'."""
    if long_form:
        return f"{d.year}년 {d.month}월 {d.day}일"
    return f"{d.year}. {d.month}. {d.day:02d}"


def _render_lbiz_standard(
    fiscal_year: int,
    meeting_date: date,
    company_name: str,
    address: str,
    day_of_week: str,
    meeting_time: str,
    end_time: str,
    total_shares: str,
    total_shareholders: str,
    present_shareholders: str,
    present_shares: str,
    chair_name: str,
    ceo_name: str,
    settlement_year: int,
    total_comp_limit: str,
    ceo_comp_limit: str,
    director_comp_limit: str,
    dividend_total: str,
    dividend_base_date: date,
    dividend_payment_date: date,
) -> str:
    """엘비즈 표준 양식(아드폰테스 정기주총 의사록 기반) 렌더링.

    원본 공백·들여쓰기·자간 띄어쓰기를 그대로 재현.
    기본 3안건: 재무제표 승인 / 이사 보수한도 / 정기배당.
    """
    meeting_year = meeting_date.year
    meeting_date_long = _format_korean_date(meeting_date, long_form=True)
    dividend_base_str = _format_korean_date(dividend_base_date)
    dividend_payment_str = _format_korean_date(dividend_payment_date)

    lines: list[str] = []
    lines.append("<표>")
    lines.append("")
    lines.append(f"제 {fiscal_year} 기 정 기 주 주 총 회 의 사 록 ")
    lines.append("")
    lines.append("")
    lines.append(f"1. 일  시 : {meeting_date.year}년 {meeting_date.month}월 {meeting_date.day}일 ({day_of_week}) {meeting_time}  ")
    lines.append(f"2. 장  소 : {address}")
    lines.append(
        f"3. 출석현황 : 주식총수     {total_shares} 주          주주총수            {total_shareholders}명"
    )
    lines.append(
        f"                    출석주주수          {present_shareholders}명        출석주식수       {present_shares} 주"
    )
    lines.append("")
    lines.append(
        f"의장 {chair_name}은 의장석에 등단하여 출석 주식 수 현황을 보고하고 본 총회가 적법하게 성립되었음을 선언한 후 의장인사 및 영업보고 후 심의안건에 들어감."
    )
    lines.append("")
    lines.append(" ")
    lines.append(
        "              제 1호 의안: 재무상태표,손익계산서 및 이익잉여금처분계산서 승인의 건"
    )
    lines.append("")
    lines.append(
        f"     의장은 당회사의 {settlement_year}년도 결산기가 12월31일자로 종료함에 따라 그에 따른 당해 〔별첨〕"
    )
    lines.append(
        "     의 재무상태표, 손익계산서, 이익잉여금처분계산서(안)를 상정하고 이에 따른 그 승인을 "
    )
    lines.append(
        "     구한바, 참석주주들의 상호간 토론이 있은 후 참석한 주주 전원의 찬성으로 이를 승인가결하다."
    )
    lines.append("     [별첨1 참고] 재무상태표, 손익계산서, 이익잉여금처분계산서(안)")
    lines.append("")
    lines.append(" ")
    lines.append(
        f"              제 2호 의안: {meeting_year}년도 이사 보수 지급한도 승인의 건"
    )
    lines.append(
        f"의장이 제2호 의안을 상정하자 {settlement_year}년도 이사보수지급한도액으로 {total_comp_limit}을 승인함"
    )
    lines.append(f"- 대표이사 : 최대 {ceo_comp_limit}")
    lines.append(f"- 이사 : 최대 {director_comp_limit}")
    lines.append("")
    lines.append(" ")
    lines.append("  ")
    lines.append(
        f"             제 3호 의안:  {meeting_year}년 정기배당 지급 승인의 건"
    )
    lines.append("")
    lines.append(
        f"  의장은 {dividend_base_str}일 현재 주주명부상 주주에게 이익배당 {dividend_total} 지급승인 의안을 상정하고, "
    )
    lines.append(" 이에 대한 가부를 물은 바 전원 이의 없이 찬성가결하다.")
    lines.append(" ")
    lines.append(f"    - 배당기준일 : {dividend_base_str}")
    lines.append(f"    - 지급  시기 : {dividend_payment_str}")
    lines.append("    [별첨2]정기배당 결의서")
    lines.append("")
    lines.append("   의장은 이상으로서  총회의 목적사항에 대한 심의를 마치고 폐회를 선언하다")
    lines.append(f"(총회 종료시각 {end_time})")
    lines.append("")
    lines.append("")
    lines.append("위 결의를 명확히 하기 위하여 본 의사록을 작성하고 의장과 출석한 이사가 아래와 같이 기명 날인하다.")
    lines.append("")
    lines.append("")
    lines.append(f"       {meeting_date_long}   ")
    lines.append(f"       주식회사 {company_name}")
    lines.append("")
    lines.append("")
    lines.append("")
    lines.append(f"                                                  대표이사    {ceo_name}          (인)")
    lines.append(" ")
    lines.append("                                             ")
    lines.append("")
    lines.append("")
    lines.append("")
    lines.append("    ")
    lines.append("                               ")
    lines.append(
        "                                       - 별첨1 : 재무상태표,손익계산서,이익잉여금처분계산서(안)"
    )
    lines.append(
        "                                       - 별첨2 : 정기배당 결의서"
    )

    return "\n".join(lines)


def full_minutes(
    company_type: str,
    meeting_type: str,
    fiscal_year: int,
    meeting_date_str: str,
    company_name: str,
    address: str,
    agenda_types: list[str],
    # lbiz-standard 전용 파라미터 (optional)
    day_of_week: str = "",
    meeting_time: str = "",
    end_time: str = "",
    total_shares: str = "",
    total_shareholders: str = "",
    present_shareholders: str = "",
    present_shares: str = "",
    chair_name: str = "",
    ceo_name: str = "",
    settlement_year: int = 0,
    total_comp_limit: str = "",
    ceo_comp_limit: str = "",
    director_comp_limit: str = "",
    dividend_total: str = "",
    dividend_base_date_str: str = "",
    dividend_payment_date_str: str = "",
) -> dict:
    """회사 유형별 전체 의사록 텍스트 생성.

    - company_type: general / small / single-shareholder / written-resolution / lbiz-standard
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

    # lbiz-standard 전용 분기 (기본 3안건 고정, agenda_types 무시 가능)
    if company_type == "lbiz-standard":
        # 기본값 보완
        _dow = day_of_week or "목"
        _mtime = meeting_time or "오후 1시"
        _etime = end_time or "오후 1시 50분"
        _tshr = total_shares or "○○○"
        _tsh = total_shareholders or "○"
        _psh = present_shareholders or "○"
        _pshr = present_shares or "○○○"
        _chair = chair_name or "○○○"
        _ceo = ceo_name or _chair
        _syear = settlement_year if settlement_year > 0 else meeting_date.year - 1
        _tcl = total_comp_limit or "○○○원"
        _ccl = ceo_comp_limit or "○○○원"
        _dcl = director_comp_limit or "○○○원"
        _dtot = dividend_total or "○○○원"
        try:
            _dbase = (
                datetime.strptime(dividend_base_date_str, "%Y-%m-%d").date()
                if dividend_base_date_str
                else date(_syear, 12, 31)
            )
        except ValueError:
            return {"error": "dividend-base-date 형식은 YYYY-MM-DD 이어야 합니다"}
        try:
            _dpay = (
                datetime.strptime(dividend_payment_date_str, "%Y-%m-%d").date()
                if dividend_payment_date_str
                else meeting_date
            )
        except ValueError:
            return {"error": "dividend-payment-date 형식은 YYYY-MM-DD 이어야 합니다"}

        template_text = _render_lbiz_standard(
            fiscal_year=fiscal_year,
            meeting_date=meeting_date,
            company_name=company_name,
            address=address,
            day_of_week=_dow,
            meeting_time=_mtime,
            end_time=_etime,
            total_shares=_tshr,
            total_shareholders=_tsh,
            present_shareholders=_psh,
            present_shares=_pshr,
            chair_name=_chair,
            ceo_name=_ceo,
            settlement_year=_syear,
            total_comp_limit=_tcl,
            ceo_comp_limit=_ccl,
            director_comp_limit=_dcl,
            dividend_total=_dtot,
            dividend_base_date=_dbase,
            dividend_payment_date=_dpay,
        )

        return {
            "mode": "full-minutes",
            "company_type": company_type,
            "company_type_kr": COMPANY_TYPE_LABELS[company_type],
            "meeting_type": "regular",
            "meeting_type_kr": "정기주주총회",
            "inputs": {
                "fiscal_year": fiscal_year,
                "meeting_date": meeting_date.isoformat(),
                "company_name": company_name,
                "address": address,
                "day_of_week": _dow,
                "meeting_time": _mtime,
                "end_time": _etime,
                "total_shares": _tshr,
                "total_shareholders": _tsh,
                "present_shareholders": _psh,
                "present_shares": _pshr,
                "chair_name": _chair,
                "ceo_name": _ceo,
                "settlement_year": _syear,
                "total_comp_limit": _tcl,
                "ceo_comp_limit": _ccl,
                "director_comp_limit": _dcl,
                "dividend_total": _dtot,
                "dividend_base_date": _dbase.isoformat(),
                "dividend_payment_date": _dpay.isoformat(),
            },
            "agenda_summary": [
                {"index": 1, "title": "재무상태표,손익계산서 및 이익잉여금처분계산서 승인의 건",
                 "resolution_type": "ordinary", "resolution_type_kr": "보통결의",
                 "legal_basis": "상법 §449·§447, §368"},
                {"index": 2, "title": f"{meeting_date.year}년도 이사 보수 지급한도 승인의 건",
                 "resolution_type": "ordinary", "resolution_type_kr": "보통결의",
                 "legal_basis": "상법 §388, §368"},
                {"index": 3, "title": f"{meeting_date.year}년 정기배당 지급 승인의 건",
                 "resolution_type": "ordinary", "resolution_type_kr": "보통결의",
                 "legal_basis": "상법 §462, §368"},
            ],
            "template_text": template_text,
            "legal_basis": "상법 §363·§368·§373·§388·§449·§462",
            "note": (
                "엘비즈 표준 양식(아드폰테스 정기주총 실무 템플릿 기반). "
                "기본 3안건 고정 — 추가·삭제 안건은 대화로 의뢰 시 수기 조정."
            ),
            "disclaimer": DISCLAIMER,
        }

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


# ─── 6) consent-form (주주 전원 기간 단축 동의서, §363⑤) ─────────────────────

CONSENT_BODY_TPL = (
    "본인 등은  주식회사 {company_name} 주주로서 정기 주주총회 기재와 같은 "
    "의사결정을 위한 정기주주총회를 개최함에 있어서 상법 제363조 제5항 규정에 "
    "의거 주주총회 소집통지 없이 정기주주총회를 개최함에 대하여 이의없이 동의합니다."
)


def _parse_shareholders(raw: str) -> list[str]:
    """JSON 배열 또는 콤마 구분 문자열을 주주 이름 리스트로 변환."""
    raw = (raw or "").strip()
    if not raw:
        return ["○○○"]
    if raw.startswith("["):
        try:
            arr = json.loads(raw)
            if isinstance(arr, list) and all(isinstance(x, str) for x in arr):
                return [x.strip() for x in arr if x.strip()] or ["○○○"]
        except json.JSONDecodeError:
            pass
    return [x.strip() for x in raw.split(",") if x.strip()] or ["○○○"]


def consent_form(
    company_name: str,
    consent_date_str: str,
    shareholders_raw: str,
) -> dict:
    """주주 전원 기간 단축(소집통지 생략) 동의서 생성.

    - 자본금 10억 미만 + 주주 전원 동의 → 소집통지 생략(§363⑤, §363④).
    - 복수 주주 지원 (각 주주별 서명란 반복).
    """
    if not company_name:
        company_name = "○○"
    try:
        consent_date = (
            datetime.strptime(consent_date_str, "%Y-%m-%d").date()
            if consent_date_str
            else date.today()
        )
    except ValueError:
        return {"error": "consent-date 형식은 YYYY-MM-DD 이어야 합니다"}

    shareholders = _parse_shareholders(shareholders_raw)
    date_str = _format_korean_date(consent_date).replace(
        f"{consent_date.year}. {consent_date.month}. {consent_date.day:02d}",
        f"{consent_date.year}. {consent_date.month}. {consent_date.day:02d}",
    )
    # 사용자 요청대로 "YYYY. M. DD" 형식 (일은 2자리)
    date_str = f"{consent_date.year}. {consent_date.month}. {consent_date.day:02d}"

    lines: list[str] = []
    lines.append("주 주 전 원 기 간 단 축 동 의 서")
    lines.append("")
    lines.append("")
    lines.append("")
    lines.append(CONSENT_BODY_TPL.format(company_name=company_name))
    lines.append("")
    lines.append("")
    lines.append("")
    lines.append("")
    lines.append(date_str)
    lines.append("")
    lines.append("")
    lines.append("")
    for name in shareholders:
        lines.append(f"주 주    {name}      (인)")
        lines.append("")

    template_text = "\n".join(lines).rstrip() + "\n"

    return {
        "mode": "consent-form",
        "inputs": {
            "company_name": company_name,
            "consent_date": consent_date.isoformat(),
            "shareholders": shareholders,
        },
        "shareholder_count": len(shareholders),
        "template_text": template_text,
        "legal_basis": "상법 §363⑤ (자본금 10억↓ 소집통지 생략 특례) · §363④ (전원 동의 시 절차 생략)",
        "note": (
            "자본금 10억 미만 회사에서 주주 전원이 동의하면 소집통지 없이 "
            "정기주주총회를 개최할 수 있습니다. 본 동의서는 해당 동의 사실의 "
            "서면 증빙으로 사용됩니다."
        ),
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
    # lbiz-standard 전용 파라미터
    p_f.add_argument("--day-of-week", default="", help="[lbiz-standard] 요일 (예: 목)")
    p_f.add_argument("--meeting-time", default="", help="[lbiz-standard] 개회시각 (예: '오후 1시')")
    p_f.add_argument("--end-time", default="", help="[lbiz-standard] 종료시각 (예: '오후 1시 50분')")
    p_f.add_argument("--total-shares", default="", help="[lbiz-standard] 주식총수 (문자열 허용)")
    p_f.add_argument("--total-shareholders", default="", help="[lbiz-standard] 주주총수")
    p_f.add_argument("--present-shareholders", default="", help="[lbiz-standard] 출석주주수")
    p_f.add_argument("--present-shares", default="", help="[lbiz-standard] 출석주식수")
    p_f.add_argument("--chair-name", default="", help="[lbiz-standard] 의장 이름")
    p_f.add_argument("--ceo-name", default="", help="[lbiz-standard] 대표이사 이름(의장과 다를 수 있음)")
    p_f.add_argument("--settlement-year", type=int, default=0,
                     help="[lbiz-standard] 결산연도(기본: 회의연도-1)")
    p_f.add_argument("--total-comp-limit", default="",
                     help="[lbiz-standard] 이사보수지급한도 총액 (예: '5억원')")
    p_f.add_argument("--ceo-comp-limit", default="",
                     help="[lbiz-standard] 대표이사 한도 (예: '3억')")
    p_f.add_argument("--director-comp-limit", default="",
                     help="[lbiz-standard] 이사 한도 (예: '2억5천만원')")
    p_f.add_argument("--dividend-total", default="",
                     help="[lbiz-standard] 배당 총액 (예: '5천만원')")
    p_f.add_argument("--dividend-base-date", default="",
                     help="[lbiz-standard] 배당기준일 YYYY-MM-DD")
    p_f.add_argument("--dividend-payment-date", default="",
                     help="[lbiz-standard] 지급시기 YYYY-MM-DD")

    # consent-form
    p_cf = sub.add_parser("consent-form",
                          help="주주 전원 기간 단축(소집통지 생략) 동의서 생성 (§363⑤)")
    p_cf.add_argument("--company-name", default="○○", help="회사명 (앞에 '주식회사' 자동 붙음)")
    p_cf.add_argument("--consent-date",
                      default=date.today().isoformat(),
                      help="동의 날짜 YYYY-MM-DD (기본: 오늘)")
    p_cf.add_argument("--shareholders", default="",
                      help="주주 목록 — JSON 배열 '[\"홍길동\",\"김철수\"]' 또는 콤마 구분 '홍길동,김철수'")

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
            day_of_week=args.day_of_week,
            meeting_time=args.meeting_time,
            end_time=args.end_time,
            total_shares=args.total_shares,
            total_shareholders=args.total_shareholders,
            present_shareholders=args.present_shareholders,
            present_shares=args.present_shares,
            chair_name=args.chair_name,
            ceo_name=args.ceo_name,
            settlement_year=args.settlement_year,
            total_comp_limit=args.total_comp_limit,
            ceo_comp_limit=args.ceo_comp_limit,
            director_comp_limit=args.director_comp_limit,
            dividend_total=args.dividend_total,
            dividend_base_date_str=args.dividend_base_date,
            dividend_payment_date_str=args.dividend_payment_date,
        )
    elif args.cmd == "consent-form":
        result = consent_form(
            company_name=args.company_name,
            consent_date_str=args.consent_date,
            shareholders_raw=args.shareholders,
        )
    else:
        print(f"Unknown command: {args.cmd}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
