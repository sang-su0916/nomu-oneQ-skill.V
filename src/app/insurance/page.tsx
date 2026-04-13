"use client";

import { useState, useMemo } from "react";
import { INSURANCE_RATES, getNationalPensionBase } from "@/lib/constants";
import { formatNumberInput, parseNumberInput } from "@/lib/storage";
import Breadcrumb from "@/components/Breadcrumb";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import HelpGuide from "@/components/HelpGuide";

function formatWon(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

const INDUSTRY_RATES: { label: string; rate: number }[] = [
  { label: "일반 사무직·서비스업 (평균 1.47%)", rate: 0.0147 },
  { label: "도소매·음식·숙박업 (0.9%)", rate: 0.009 },
  { label: "제조업 (1.3%)", rate: 0.013 },
  { label: "건설업 (3.6%)", rate: 0.036 },
  { label: "운수·창고업 (1.8%)", rate: 0.018 },
  { label: "농림어업 (2.2%)", rate: 0.022 },
  { label: "직접 입력", rate: 0 },
];

const EMPLOYER_SIZE_OPTIONS = [
  {
    label: "150인 미만 (우선지원대상기업 포함) — 1.15%",
    rate: INSURANCE_RATES.employmentInsurance.employer.under150,
  },
  {
    label: "150인 이상 우선지원대상기업 — 1.35%",
    rate: INSURANCE_RATES.employmentInsurance.employer.over150preferred,
  },
  {
    label: "150~999인 대규모기업 — 1.55%",
    rate: INSURANCE_RATES.employmentInsurance.employer.over150,
  },
  {
    label: "1,000인 이상 / 국가·지자체 — 1.75%",
    rate: INSURANCE_RATES.employmentInsurance.employer.over1000,
  },
];

export default function InsurancePage() {
  const [salary, setSalary] = useState(3000000);
  const [mealAllowance, setMealAllowance] = useState(200000);
  const [industryIdx, setIndustryIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [customIndustrialRate, setCustomIndustrialRate] = useState(1.47);

  const isCustomIndustry = industryIdx === INDUSTRY_RATES.length - 1;

  const result = useMemo(() => {
    const taxable = Math.max(0, salary - mealAllowance);
    const industrialRate = isCustomIndustry
      ? customIndustrialRate / 100
      : INDUSTRY_RATES[industryIdx].rate;
    const employerEmpRate = EMPLOYER_SIZE_OPTIONS[sizeIdx].rate;

    // 국민연금 기준소득월액 (7월 자동 전환)
    const { maxBase, minBase } = getNationalPensionBase(new Date());
    const pensionBase = Math.min(Math.max(taxable, minBase), maxBase);

    // 근로자 부담
    const emp = {
      pension: Math.round(
        pensionBase * INSURANCE_RATES.nationalPension.employee,
      ),
      health: Math.round(taxable * INSURANCE_RATES.healthInsurance.employee),
      longTerm: 0,
      employment: Math.round(
        taxable * INSURANCE_RATES.employmentInsurance.employee,
      ),
    };
    emp.longTerm = Math.round(emp.health * INSURANCE_RATES.longTermCare.rate);

    // 사업주 부담
    const er = {
      pension: Math.round(
        pensionBase * INSURANCE_RATES.nationalPension.employer,
      ),
      health: Math.round(taxable * INSURANCE_RATES.healthInsurance.employer),
      longTerm: 0,
      employment: Math.round(taxable * employerEmpRate),
      industrial: Math.round(taxable * industrialRate),
    };
    er.longTerm = Math.round(er.health * INSURANCE_RATES.longTermCare.rate);

    const empTotal = emp.pension + emp.health + emp.longTerm + emp.employment;
    const erTotal =
      er.pension + er.health + er.longTerm + er.employment + er.industrial;

    return { emp, er, empTotal, erTotal, taxable };
  }, [
    salary,
    mealAllowance,
    industryIdx,
    sizeIdx,
    isCustomIndustry,
    customIndustrialRate,
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "4대보험 계산기" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          4대보험 계산기
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          2026년 요율 기준 · 근로자·사업주 부담금 동시 계산
        </p>
      </div>

      <HelpGuide
        pageKey="insurance"
        steps={[
          "월 급여(세전)를 입력하면 국민연금, 건강보험, 고용보험, 산재보험료가 자동 계산됩니다.",
          "근로자 부담분과 사업주 부담분이 따로 표시되니, 급여에서 공제할 금액을 바로 확인하세요.",
          "계산 결과는 2026년 보험료율 기준이며, 실제 고지 금액과 소액 차이가 있을 수 있습니다.",
        ]}
      />

      {/* 입력 */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 mb-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">
            월 기본급
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={salary ? formatNumberInput(String(salary)) : ""}
              onChange={(e) => setSalary(parseNumberInput(e.target.value))}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="3,000,000"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
              원
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">
            식대 (비과세)
            <span className="ml-2 text-xs text-[var(--text-muted)] font-normal">
              월 20만원까지 비과세 처리
            </span>
          </label>
          <div className="flex gap-2">
            {[0, 100000, 200000].map((v) => (
              <button
                key={v}
                onClick={() => setMealAllowance(v)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  mealAllowance === v
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--bg)] text-[var(--text)] border-[var(--border)] hover:border-[var(--primary)]"
                }`}
              >
                {v === 0 ? "없음" : `${(v / 10000).toFixed(0)}만원`}
              </button>
            ))}
          </div>
          <div className="relative mt-2">
            <input
              type="number"
              value={mealAllowance || ""}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMealAllowance(Math.min(Math.max(v, 0), 200000));
              }}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="직접 입력 (최대 200,000)"
              min={0}
              max={200000}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">
              원
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">
            사업장 규모 (고용보험 사업주 요율)
          </label>
          <select
            value={sizeIdx}
            onChange={(e) => setSizeIdx(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {EMPLOYER_SIZE_OPTIONS.map((o, i) => (
              <option key={i} value={i}>
                {o.label} ({(o.rate * 100).toFixed(2)}%)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">
            업종 (산재보험 요율)
          </label>
          <select
            value={industryIdx}
            onChange={(e) => setIndustryIdx(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {INDUSTRY_RATES.map((r, i) => (
              <option key={i} value={i}>
                {r.label}
              </option>
            ))}
          </select>
          {isCustomIndustry && (
            <div className="mt-2">
              <div className="relative">
                <input
                  type="number"
                  value={customIndustrialRate || ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setCustomIndustrialRate(
                      Number.isFinite(v) ? Math.min(Math.max(v, 0.1), 34) : 0,
                    );
                  }}
                  step="0.01"
                  min="0.1"
                  max="34"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="산재보험 요율 직접 입력 (0.1~34%)"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">
                  %
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                사업장 실제 산재보험 요율을 입력하세요. 근로복지공단 고지서 또는{" "}
                <a
                  href="https://total.comwel.or.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  고용산재 토탈서비스
                </a>
                에서 확인 가능합니다.
              </p>
            </div>
          )}
          {!isCustomIndustry && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              ※ 위 요율은 업종 평균입니다. 사업장 재해율에 따라
              개별실적요율(±40%)이 적용될 수 있습니다.
            </p>
          )}
        </div>

        <div className="text-xs text-[var(--text-muted)] bg-[var(--bg)] rounded-lg px-3 py-2">
          과세 기준소득: {formatWon(result.taxable)} (기본급 {formatWon(salary)}{" "}
          − 식대 {formatWon(mealAllowance)})
        </div>
      </div>

      {/* 4대보험 신고 제출 가이드 */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <summary className="font-semibold text-blue-800 cursor-pointer">
          4대보험 EDI 제출 가이드
        </summary>
        <div className="mt-4 space-y-4 text-sm text-[var(--text)]">
          <div>
            <h4 className="font-semibold text-blue-700 mb-1">
              1. 4대사회보험정보연계센터 (EDI)
            </h4>
            <p>
              URL:{" "}
              <a
                href="https://www.4insure.or.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                www.4insure.or.kr
              </a>
            </p>
            <p>
              다운로드한 CSV 파일을 EDI 시스템에서 &quot;일괄신고&quot; 메뉴로
              업로드할 수 있습니다.
            </p>
            <ol className="list-decimal list-inside ml-2 mt-1">
              <li>EDI 로그인 → 해당 보험 선택 → 일괄신고</li>
              <li>CSV 파일 업로드 → 자동 파싱</li>
              <li>내용 확인 → 전자서명 → 접수번호 발급</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700 mb-1">
              2. 신고 기한 (중요!)
            </h4>
            <table className="w-full border-collapse text-xs mt-1">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border p-2 text-left">신고 유형</th>
                  <th className="border p-2 text-left">기한</th>
                  <th className="border p-2 text-left">과태료</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">자격취득 (입사)</td>
                  <td className="border p-2">
                    입사일로부터 <strong>14일 이내</strong>
                  </td>
                  <td className="border p-2">미신고 시 과태료 최대 300만원</td>
                </tr>
                <tr>
                  <td className="border p-2">자격상실 (퇴사)</td>
                  <td className="border p-2">
                    퇴사일 다음달 <strong>15일까지</strong>
                  </td>
                  <td className="border p-2">미신고 시 과태료</td>
                </tr>
                <tr>
                  <td className="border p-2">보수월액 변경</td>
                  <td className="border p-2">
                    변경사유 발생 <strong>14일 이내</strong>
                  </td>
                  <td className="border p-2">-</td>
                </tr>
                <tr>
                  <td className="border p-2">보수총액 신고 (연 1회)</td>
                  <td className="border p-2">
                    매년 <strong>3월 10일까지</strong>
                  </td>
                  <td className="border p-2">미신고 시 과태료</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700 mb-1">
              3. CSV 파일 사용 시 주의사항
            </h4>
            <ul className="list-disc list-inside ml-2">
              <li>
                CSV 인코딩: <strong>EUC-KR</strong>로 저장 필요 (정부 시스템
                호환)
              </li>
              <li>사업장관리번호가 EDI 등록 번호와 일치하는지 확인</li>
              <li>주민등록번호 형식: 하이픈(-) 없이 13자리 연속 숫자</li>
              <li>
                업로드 후 반드시 &quot;미리보기&quot;에서 데이터 정합성 확인
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-blue-700 mb-1">
              4. 보험별 개별 사이트
            </h4>
            <ul className="list-disc list-inside ml-2">
              <li>
                국민연금:{" "}
                <a
                  href="https://www.nps.or.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  www.nps.or.kr
                </a>{" "}
                (사업장 가입자 관리)
              </li>
              <li>
                건강보험:{" "}
                <a
                  href="https://www.nhis.or.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  www.nhis.or.kr
                </a>{" "}
                (사업장 민원)
              </li>
              <li>
                고용·산재:{" "}
                <a
                  href="https://total.comwel.or.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  total.comwel.or.kr
                </a>{" "}
                (고용산재 토탈서비스)
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="font-semibold text-yellow-800">주의</p>
            <p>
              본 시스템에서 생성된 CSV는 참고용 초안입니다. EDI 제출 전 반드시
              내용을 확인하시고, 공인인증서(또는 금융인증서)로 전자서명 후
              제출하세요.
            </p>
          </div>
        </div>
      </details>

      {/* 결과 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* 근로자 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-1.5">
            <span className="text-base">👤</span> 근로자 부담
          </h2>
          <div className="space-y-2.5">
            {[
              {
                label: "국민연금",
                val: result.emp.pension,
                rate: `${(INSURANCE_RATES.nationalPension.employee * 100).toFixed(2)}%`,
              },
              {
                label: "건강보험",
                val: result.emp.health,
                rate: `${(INSURANCE_RATES.healthInsurance.employee * 100).toFixed(3)}%`,
              },
              {
                label: "장기요양",
                val: result.emp.longTerm,
                rate: `건강보험료의 ${(INSURANCE_RATES.longTermCare.rate * 100).toFixed(2)}%`,
              },
              {
                label: "고용보험",
                val: result.emp.employment,
                rate: `${(INSURANCE_RATES.employmentInsurance.employee * 100).toFixed(1)}%`,
              },
            ].map(({ label, val, rate }) => (
              <div
                key={label}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="text-[var(--text)]">{label}</span>
                  <span className="text-[var(--text-muted)] text-xs ml-1.5">
                    {rate}
                  </span>
                </div>
                <span className="font-semibold text-[var(--text)]">
                  {formatWon(val)}
                </span>
              </div>
            ))}
            <div className="border-t border-[var(--border)] pt-2.5 flex items-center justify-between">
              <span className="font-bold text-[var(--text)]">합계</span>
              <span className="font-bold text-[var(--primary)] text-lg">
                {formatWon(result.empTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* 사업주 */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-1.5">
            <span className="text-base">🏢</span> 사업주 부담
          </h2>
          <div className="space-y-2.5">
            {[
              {
                label: "국민연금",
                val: result.er.pension,
                rate: `${(INSURANCE_RATES.nationalPension.employer * 100).toFixed(2)}%`,
              },
              {
                label: "건강보험",
                val: result.er.health,
                rate: `${(INSURANCE_RATES.healthInsurance.employer * 100).toFixed(3)}%`,
              },
              {
                label: "장기요양",
                val: result.er.longTerm,
                rate: `건강보험료의 ${(INSURANCE_RATES.longTermCare.rate * 100).toFixed(2)}%`,
              },
              {
                label: "고용보험",
                val: result.er.employment,
                rate: `${(EMPLOYER_SIZE_OPTIONS[sizeIdx].rate * 100).toFixed(2)}%`,
              },
              {
                label: "산재보험",
                val: result.er.industrial,
                rate: `${(INDUSTRY_RATES[industryIdx].rate * 100).toFixed(1)}%`,
              },
            ].map(({ label, val, rate }) => (
              <div
                key={label}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="text-[var(--text)]">{label}</span>
                  <span className="text-[var(--text-muted)] text-xs ml-1.5">
                    {rate}
                  </span>
                </div>
                <span className="font-semibold text-[var(--text)]">
                  {formatWon(val)}
                </span>
              </div>
            ))}
            <div className="border-t border-[var(--border)] pt-2.5 flex items-center justify-between">
              <span className="font-bold text-[var(--text)]">합계</span>
              <span className="font-bold text-orange-500 text-lg">
                {formatWon(result.erTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 총합 요약 */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="grid grid-cols-3 divide-x divide-[var(--border)] text-center">
          <div className="pr-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">
              근로자 실수령 공제액
            </p>
            <p className="text-lg font-bold text-[var(--primary)]">
              {formatWon(result.empTotal)}
            </p>
          </div>
          <div className="px-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">
              사업주 추가 부담
            </p>
            <p className="text-lg font-bold text-orange-500">
              {formatWon(result.erTotal)}
            </p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">
              총 인건비 (월)
            </p>
            <p className="text-lg font-bold text-[var(--text)]">
              {formatWon(salary + result.erTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* 산재 발생 시 대응 안내 */}
      <details className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
        <summary className="font-semibold text-orange-800 cursor-pointer">
          산업재해 발생 시 사업주 대응 가이드
        </summary>
        <div className="mt-4 space-y-4 text-sm text-[var(--text)]">
          <div>
            <h4 className="font-semibold text-orange-700 mb-1">1. 즉시 조치</h4>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>부상 근로자 응급처치 및 병원 이송</li>
              <li>산재 발생 현장 보존 (사진 촬영)</li>
              <li>목격자 진술 확보</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-orange-700 mb-1">
              2. 산재 신고 (산안법 제57조)
            </h4>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>
                <strong>사망·3일 이상 휴업:</strong> 1개월 이내 관할
                지방고용노동관서에 산재 발생 보고
              </li>
              <li>
                <strong>중대재해:</strong> 즉시 보고 (사망, 3개월 이상 치료,
                동시 2명 이상 부상)
              </li>
              <li>미보고 시 과태료 최대 1,500만원</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-orange-700 mb-1">
              3. 산재보험 급여 종류
            </h4>
            <table className="w-full border-collapse text-xs mt-1">
              <thead>
                <tr className="bg-orange-100">
                  <th className="border p-2 text-left">급여 종류</th>
                  <th className="border p-2 text-left">내용</th>
                  <th className="border p-2 text-left">지급 기준</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2 font-medium">요양급여</td>
                  <td className="border p-2">치료비 전액</td>
                  <td className="border p-2">산재 인정 시 전액 지급</td>
                </tr>
                <tr>
                  <td className="border p-2 font-medium">휴업급여</td>
                  <td className="border p-2">치료 중 임금 보전</td>
                  <td className="border p-2">
                    <strong>평균임금의 70%</strong> (취업 불능 4일 이상)
                  </td>
                </tr>
                <tr>
                  <td className="border p-2 font-medium">장해급여</td>
                  <td className="border p-2">장해 등급별 보상</td>
                  <td className="border p-2">1~14급, 연금 또는 일시금</td>
                </tr>
                <tr>
                  <td className="border p-2 font-medium">유족급여</td>
                  <td className="border p-2">사망 시 유족 보상</td>
                  <td className="border p-2">평균임금의 1,300일분</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-orange-100 rounded">
            <p className="font-semibold text-orange-800 mb-1">
              휴업급여 예상 계산
            </p>
            <p>현재 입력된 월급 {formatWon(salary)} 기준:</p>
            <p className="font-medium mt-1">
              1일 휴업급여 = {formatWon(Math.round((salary / 30) * 0.7))}{" "}
              (평균임금 {formatWon(Math.round(salary / 30))}의 70%)
            </p>
            <p className="text-xs text-orange-600 mt-1">
              ※ 휴업급여는 근로복지공단에서 직접 근로자에게 지급합니다. 사업주가
              별도 부담하지 않습니다.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-orange-700 mb-1">
              4. 산재 신청 절차
            </h4>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>산재지정 의료기관에서 치료</li>
              <li>근로복지공단에 요양급여 신청서 제출</li>
              <li>공단 심사 (통상 7~14일)</li>
              <li>승인 시 요양급여 + 휴업급여 지급 개시</li>
            </ol>
            <p className="mt-2">
              <a
                href="https://total.comwel.or.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                근로복지공단 고용산재 토탈서비스
              </a>
              에서 온라인 신청 가능
            </p>
          </div>
        </div>
      </details>

      <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
        2026년 요율 기준 · 산재보험은 업종·사업장별 실제 요율 적용 · 참고용
        계산입니다
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
        ※ CSV 파일은 UTF-8로 저장됩니다. EDI 제출 시 EUC-KR 변환이 필요할 수
        있습니다.
      </p>

      <LegalDisclaimer compact />
    </div>
  );
}
