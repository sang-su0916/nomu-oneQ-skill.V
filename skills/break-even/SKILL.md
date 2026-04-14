---
name: break-even
description: 손익분기점(BEP) 분석 — CVP(원가-조업도-이익) 표준 공식. 고정비·단위판매가·단위변동비 입력 → BEP 수량·매출·목표이익 달성 수량·안전한계·영업레버리지 자동 산출. Break-even point analysis.
when_to_use: 손익분기점 계산, BEP 수량·매출 산정, 목표이익 달성 수량, 안전한계(Margin of Safety) 분석, 영업레버리지(DOL) 계산, 창업·신사업 타당성 검토, 가격·원가 시뮬레이션
---

# 손익분기점 계산기 (break-even)

⚠️ **반드시 계산기 CLI를 실행하세요. 직접 계산 금지** — hallucination 방지.

## 법령·기준 근거

| 기준                | 내용                                     | 출처                   |
| ------------------- | ---------------------------------------- | ---------------------- |
| CVP 분석            | 관리회계 원가-조업도-이익 분석 표준 공식 | 한국관리회계학회, CIMA |
| 일반기업회계기준 §7 | 재고자산 — 변동원가 vs 전부원가 구분     | 금융위원회 고시        |

## 핵심 공식

```
단위공헌이익     = 단위판매가 - 단위변동비
공헌이익률       = 단위공헌이익 / 단위판매가
BEP 수량         = 고정비 / 단위공헌이익
BEP 매출         = 고정비 / 공헌이익률
목표이익 달성 수량 = (고정비 + 목표이익) / 단위공헌이익
안전한계율       = (실제매출 - BEP매출) / 실제매출
영업레버리지(DOL) = 공헌이익 / 영업이익
```

## CLI 사용법

### `calculate` — BEP 수량·매출 + 목표이익

```bash
python3 skills/break-even/references/calculator.py calculate \
  --fixed-cost 100000000 \
  --unit-price 10000 \
  --unit-variable-cost 6000
```

목표이익 포함:

```bash
python3 skills/break-even/references/calculator.py calculate \
  --fixed-cost 100000000 \
  --unit-price 10000 \
  --unit-variable-cost 6000 \
  --target-profit 20000000
```

출력 예시:

```json
{
  "fixed_cost": 100000000,
  "unit_price": 10000,
  "unit_variable_cost": 6000,
  "contribution_margin_per_unit": 4000,
  "contribution_margin_ratio": 0.4,
  "bep_units": 25000,
  "bep_revenue": 250000000,
  "target_profit": 20000000,
  "target_units": 30000,
  "target_revenue": 300000000,
  "interpretation": "월간 25,000개 판매(매출 2.5억원) 시 손익분기. 목표이익 2천만원 달성에는 월 30,000개 필요.",
  "disclaimer": "단일제품·선형 비용구조 가정. 다품목은 가중평균 공헌이익률로 별도 계산."
}
```

### `margin-of-safety` — 안전한계

```bash
python3 skills/break-even/references/calculator.py margin-of-safety \
  --actual-revenue 300000000 \
  --bep-revenue 250000000
```

출력 예시:

```json
{
  "actual_revenue": 300000000,
  "bep_revenue": 250000000,
  "margin_of_safety_amount": 50000000,
  "margin_of_safety_ratio": 0.1667,
  "interpretation": "실제매출이 BEP 대비 16.67% (50,000,000원) 여유. 안전한계 수준: 주의 (10~30%).",
  "disclaimer": "..."
}
```

### `operating-leverage` — 영업레버리지(DOL)

```bash
python3 skills/break-even/references/calculator.py operating-leverage \
  --contribution-margin 120000000 \
  --operating-income 20000000
```

출력 예시:

```json
{
  "contribution_margin": 120000000,
  "operating_income": 20000000,
  "dol": 6.0,
  "interpretation": "영업레버리지도(DOL) = 6.00. 매출 1% 변동 시 영업이익 약 6.00% 변동.",
  "disclaimer": "..."
}
```

## 입력 파싱 가이드

| 사용자 입력 예                     | 모드                        | 비고                    |
| ---------------------------------- | --------------------------- | ----------------------- |
| "고정비 1억, 단가 1만, 변동비 6천" | `calculate` 즉시            | BEP 수량·매출 바로 계산 |
| "목표이익 2천만 달성하려면?"       | `calculate --target-profit` | 목표이익 파라미터 추가  |
| "현재 매출 3억인데 안전한계?"      | `margin-of-safety`          | BEP매출 먼저 확인 필요  |
| "레버리지 분석"                    | `operating-leverage`        | 공헌이익·영업이익 필요  |

## 되묻기 규칙 (정보 부족 시)

1. **고정비 미제공**: "월간(또는 연간) 고정비 합계를 알려주세요 (임대료·인건비·감가상각 등)."
2. **단위 구분 불명**: "판매가와 변동비는 단위(개/EA)당 금액인가요, 묶음 단위인가요?"
3. **다품목 구조**: "제품이 여러 종류라면 가중평균 공헌이익률을 별도 계산 후 BEP 매출 기준으로 분석합니다."
4. **기간 기준**: "BEP 계산의 기간 단위가 월인가요, 연인가요? (고정비·목표이익 단위와 일치 필요)"

## 응답 포맷

계산 결과에 다음 항목을 포함하세요.

- 단위공헌이익 + 공헌이익률 (구조 설명)
- BEP 수량 + BEP 매출
- 목표이익 달성 수량·매출 (입력 시)
- 해석 문장
- 면책 문구

**면책**: 단일제품·선형 비용구조 가정. 다품목은 가중평균 공헌이익률로 별도 계산.

## 알려진 한계

1. **단일제품 가정** — 다품목 기업은 제품 믹스(Product Mix)에 따라 가중평균 공헌이익률을 먼저 산출해야 함.
2. **선형 비용구조 가정** — 실제로는 규모의 경제, 학습곡선, 단계적 고정비(Step Cost) 존재.
3. **세금·이자 미반영** — 법인세·이자비용은 별도. 세후 BEP는 `목표이익 = 목표순이익 / (1 - 세율)`로 환산 후 적용.
4. **재고 변동 무시** — 전부원가(Full Costing) vs 변동원가(Variable Costing) 차이는 기말재고 수준에 따라 영업이익이 달라질 수 있음.
5. **현금흐름과 다름** — BEP는 발생기준 이익 기준. 현금 BEP는 감가상각 등 비현금비용 차감 후 별도 계산 필요.

## 관련 스킬

- `financial-ratio` — ROE·ROA·영업이익률 등 수익성 지표 (BEP 분석 후 비교)
- `income-tax` — 세후 목표이익 환산 시 법인세율 적용
- `omsc` — 본 스킬은 OMSC scaffold로 생성된 경영 도메인 스킬

## 검증 기록

| 날짜       | 확인자 | 내용                                                                                              |
| ---------- | ------ | ------------------------------------------------------------------------------------------------- |
| 2026-04-14 | 상수님 | CVP 분석 표준 공식 적용. BE-01~03 검증 시나리오 3건 수계산 일치. 안전한계·영업레버리지 공식 확인. |
