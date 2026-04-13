"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo } from "@/types";
import { formatDate, formatCurrency } from "@/lib/storage";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import EmailSendButton from "@/components/EmailSendButton";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import {
  calculateSettlement,
  type SettlementResult,
} from "@/lib/calculations/settlement";
import type { MonthlyWage } from "@/types/severance";
import Breadcrumb from "@/components/Breadcrumb";
import InfoTooltip from "@/components/InfoTooltip";
import HelpGuide from "@/components/HelpGuide";

interface MonthEntry {
  baseSalary: number;
  fixedAllowances: number;
  bonus: number;
  overtimePay: number;
  nonTaxable: number;
}

const emptyMonth: MonthEntry = {
  baseSalary: 0,
  fixedAllowances: 0,
  bonus: 0,
  overtimePay: 0,
  nonTaxable: 0,
};

export default function SettlementPage() {
  const [selId, setSelId] = useState("");
  const [company, setCompany] = useState<CompanyInfo>(defaultCompanyInfo);
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [months, setMonths] = useState<MonthEntry[]>([
    { ...emptyMonth },
    { ...emptyMonth },
    { ...emptyMonth },
  ]);
  const [usedLeave, setUsedLeave] = useState(0);
  const [noticeDays, setNoticeDays] = useState(30);
  const [consolation, setConsolation] = useState(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const employees = allEmployees.filter(
    (e) => e.status === "active" || e.status === "resigned",
  );

  useEffect(() => {
    setCompany(companyInfo);
  }, [companyInfo]);

  const handleSelect = (id: string) => {
    setSelId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setEmployeeName(emp.info.name);
      setDepartment(emp.department || "");
      setPosition(emp.position || "");
      setHireDate(emp.hireDate);
      if (emp.salary) {
        const m: MonthEntry = {
          baseSalary: emp.salary.baseSalary || 0,
          fixedAllowances: Array.isArray(emp.salary.otherAllowances)
            ? emp.salary.otherAllowances.reduce(
                (s, a) => s + (a.taxable ? a.amount : 0),
                0,
              )
            : 0,
          bonus: 0,
          overtimePay: 0,
          nonTaxable:
            (emp.salary.mealAllowance || 0) +
            (emp.salary.carAllowance || 0) +
            (emp.salary.childcareAllowance || 0) +
            (emp.salary.researchAllowance || 0),
        };
        setMonths([{ ...m }, { ...m }, { ...m }]);
      }
    }
  };

  const updateMonth = (idx: number, field: keyof MonthEntry, value: number) => {
    setMonths((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const result: SettlementResult | null = useMemo(() => {
    if (!hireDate || !terminationDate || months.some((m) => m.baseSalary <= 0))
      return null;
    try {
      setError("");
      const wages: MonthlyWage[] = months.map((m) => ({
        baseSalary: m.baseSalary,
        fixedAllowances: m.fixedAllowances,
        bonus: m.bonus,
        overtimePay: m.overtimePay,
        nonTaxable: m.nonTaxable,
      }));
      return calculateSettlement({
        employeeId: selId || "manual",
        hireDate,
        terminationDate,
        lastThreeMonthsWages: wages,
        usedAnnualLeaveDays: usedLeave,
        noticePeriodDays: noticeDays,
        consolationMoney: consolation,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "계산 오류");
      return null;
    }
  }, [
    hireDate,
    terminationDate,
    months,
    usedLeave,
    noticeDays,
    consolation,
    selId,
  ]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `퇴직통합정산서_${employeeName}`,
  });
  const handleSave = async () => {
    await saveDocument({
      docType: "settlement",
      title: `퇴직 통합 정산서 - ${employeeName}`,
      employeeId: selId || undefined,
      data: {
        company,
        employeeName,
        department,
        position,
        hireDate,
        terminationDate,
        months,
        usedLeave,
        noticeDays,
        consolation,
        paymentDate,
        bankName,
        accountNumber,
        result,
      } as unknown as Record<string, unknown>,
    });
  };

  const canPreview =
    employeeName && hireDate && terminationDate && result && !error;

  if (companyLoading || employeesLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-[var(--text-secondary)]">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "퇴직/전환", href: "/terminate" },
          { label: "퇴직 정산서" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">💰</span> 퇴직 통합 정산서
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        퇴직금 + 미사용 연차수당 + 해고예고수당 + 위로금을 한 번에 정산합니다
      </p>
      <HelpGuide
        pageKey="settlement"
        steps={[
          "퇴직 시 급여, 연차수당, 퇴직금 등 모든 정산 내역을 한눈에 정리합니다.",
          "미지급 급여나 초과 지급분이 있는지 꼼꼼히 확인하세요.",
          "정산 완료 후 근로자 확인 서명을 받으세요.",
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6">
          {/* 직원 선택 */}
          <div className="form-section">
            <h3 className="form-section-title">👤 퇴직 직원</h3>
            {employees.length > 0 && (
              <div className="mb-4">
                <select
                  className="input-field"
                  value={selId}
                  onChange={(e) => handleSelect(e.target.value)}
                >
                  <option value="">직접 입력</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.info.name}{" "}
                      {emp.department ? `(${emp.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">성명 *</label>
                <input
                  type="text"
                  className="input-field"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">부서 / 직위</label>
                <input
                  type="text"
                  className="input-field"
                  value={`${department} ${position}`.trim()}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">입사일 *</label>
                <input
                  type="date"
                  className="input-field"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">퇴직일 *</label>
                <input
                  type="date"
                  className="input-field"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 최근 3개월 급여 */}
          <div className="form-section">
            <h3 className="form-section-title">💵 최근 3개월 급여</h3>
            <div className="space-y-4">
              {months.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border-color)]"
                >
                  <p className="text-sm font-medium mb-3">{idx + 1}개월 전</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="input-label text-xs">기본급 *</label>
                      <input
                        type="number"
                        className="input-field"
                        value={m.baseSalary || ""}
                        onChange={(e) =>
                          updateMonth(
                            idx,
                            "baseSalary",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="input-label text-xs">고정수당</label>
                      <input
                        type="number"
                        className="input-field"
                        value={m.fixedAllowances || ""}
                        onChange={(e) =>
                          updateMonth(
                            idx,
                            "fixedAllowances",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="input-label text-xs">상여금</label>
                      <input
                        type="number"
                        className="input-field"
                        value={m.bonus || ""}
                        onChange={(e) =>
                          updateMonth(
                            idx,
                            "bonus",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="input-label text-xs">
                        초과근로수당
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={m.overtimePay || ""}
                        onChange={(e) =>
                          updateMonth(
                            idx,
                            "overtimePay",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="input-label text-xs">비과세 항목</label>
                      <input
                        type="number"
                        className="input-field"
                        value={m.nonTaxable || ""}
                        onChange={(e) =>
                          updateMonth(
                            idx,
                            "nonTaxable",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 추가 정산 항목 */}
          <div className="form-section">
            <h3 className="form-section-title">📋 정산 항목</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">사용한 연차일수</label>
                <input
                  type="number"
                  className="input-field"
                  value={usedLeave || ""}
                  onChange={(e) => setUsedLeave(parseInt(e.target.value) || 0)}
                  min={0}
                />
                {result && (
                  <p className="text-xs text-[var(--text-light)] mt-1">
                    총 연차 {result.totalAnnualLeaveDays}일 중 미사용{" "}
                    {result.unusedLeaveDays}일
                  </p>
                )}
              </div>
              <div>
                <label className="input-label">
                  해고 예고일수{" "}
                  <InfoTooltip
                    simple="30일 전에 해고를 통보하지 않았으면 30일치 통상임금을 지급해야 합니다"
                    legal="근로기준법 제26조"
                  />
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(parseInt(e.target.value) || 0)}
                  min={0}
                  max={90}
                />
                {noticeDays < 30 && (
                  <p className="text-xs text-red-500 mt-1">
                    30일 미만 통보 시 해고예고수당 발생 ({30 - noticeDays}일분)
                  </p>
                )}
              </div>
              <div>
                <label className="input-label">위로금 (합의금)</label>
                <input
                  type="number"
                  className="input-field"
                  value={consolation || ""}
                  onChange={(e) =>
                    setConsolation(parseInt(e.target.value) || 0)
                  }
                  placeholder="권고사직 등 합의 위로금"
                />
              </div>
              <div>
                <label className="input-label">지급 예정일</label>
                <input
                  type="date"
                  className="input-field"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                <p className="text-xs text-[var(--text-light)] mt-1">
                  근로기준법: 퇴직일로부터 14일 이내
                </p>
              </div>
              <div>
                <label className="input-label">은행명</label>
                <input
                  type="text"
                  className="input-field"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">계좌번호</label>
                <input
                  type="text"
                  className="input-field"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 실시간 계산 결과 */}
          {result && (
            <div className="form-section bg-green-50 border-green-200">
              <h3 className="form-section-title text-green-800">
                💰 정산 총액
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>
                    퇴직금{" "}
                    <InfoTooltip
                      simple="1년 이상 근무한 직원에게 30일분 평균임금을 지급합니다"
                      legal="근로자퇴직급여 보장법 제8조"
                    />
                  </span>
                  <span className="font-medium">
                    {result.severance.isEligible
                      ? formatCurrency(result.severance.totalAmount)
                      : "미해당 (1년 미만)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>
                    미사용 연차수당 ({result.unusedLeaveDays}일){" "}
                    <InfoTooltip
                      simple="퇴직 시 사용하지 못한 연차에 대해 통상임금으로 보상합니다"
                      legal="근로기준법 제60조"
                    />
                  </span>
                  <span className="font-medium">
                    {formatCurrency(result.unusedLeavePay)}
                  </span>
                </div>
                {result.terminationNoticePay > 0 && (
                  <div className="flex justify-between">
                    <span>
                      해고예고수당 ({30 - noticeDays}일분){" "}
                      <InfoTooltip
                        simple="30일 전에 해고를 통보하지 않았으면 30일치 통상임금을 지급해야 합니다"
                        legal="근로기준법 제26조"
                      />
                    </span>
                    <span className="font-medium">
                      {formatCurrency(result.terminationNoticePay)}
                    </span>
                  </div>
                )}
                {result.consolationMoney > 0 && (
                  <div className="flex justify-between">
                    <span>위로금</span>
                    <span className="font-medium">
                      {formatCurrency(result.consolationMoney)}
                    </span>
                  </div>
                )}
                <div className="border-t border-green-300 pt-2 flex justify-between text-lg font-bold text-green-800">
                  <span>합계</span>
                  <span>{formatCurrency(result.grandTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
            disabled={!canPreview}
          >
            미리보기
          </button>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-3 mb-6 no-print">
            <button
              onClick={() => setShowPreview(false)}
              className="btn btn-secondary"
            >
              ← 수정
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              🖨️ 인쇄
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-secondary disabled:opacity-50"
            >
              {saving ? "저장 중..." : saved ? "✓ 저장됨" : "🗄️ 보관함에 저장"}
            </button>
            <EmailSendButton
              documentTitle={`퇴직 통합 정산서 — ${employeeName}`}
              documentType="퇴직 통합 정산서"
              recipientName={employeeName}
              className="btn btn-secondary"
              printRef={printRef}
            />
          </div>

          {/* 인쇄 영역 */}
          <div
            ref={printRef}
            className="bg-[var(--bg-card)] p-10 max-w-[210mm] mx-auto shadow-sm border print:shadow-none print:border-none"
            style={{ fontFamily: "'Pretendard', sans-serif" }}
          >
            <h1 className="text-2xl font-bold text-center mb-8 tracking-widest">
              퇴 직 통 합 정 산 서
            </h1>

            {/* 인적사항 */}
            <table className="w-full border-collapse text-sm mb-6">
              <tbody>
                <tr className="border border-[var(--border)]">
                  <td className="bg-gray-50 px-4 py-2 font-medium w-24 border-r">
                    성 명
                  </td>
                  <td className="px-4 py-2 border-r">{employeeName}</td>
                  <td className="bg-gray-50 px-4 py-2 font-medium w-24 border-r">
                    부서/직위
                  </td>
                  <td className="px-4 py-2">
                    {department} {position}
                  </td>
                </tr>
                <tr className="border border-[var(--border)] border-t-0">
                  <td className="bg-gray-50 px-4 py-2 font-medium border-r">
                    입사일
                  </td>
                  <td className="px-4 py-2 border-r">{formatDate(hireDate)}</td>
                  <td className="bg-gray-50 px-4 py-2 font-medium border-r">
                    퇴직일
                  </td>
                  <td className="px-4 py-2">{formatDate(terminationDate)}</td>
                </tr>
              </tbody>
            </table>

            {/* 정산 내역 */}
            {result && (
              <table className="w-full border-collapse text-sm mb-6">
                <thead>
                  <tr className="border border-[var(--border)] bg-gray-50">
                    <th className="px-4 py-2 text-left font-medium border-r">
                      항목
                    </th>
                    <th className="px-4 py-2 text-left font-medium border-r">
                      산출 근거
                    </th>
                    <th className="px-4 py-2 text-right font-medium w-36">
                      금액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="px-4 py-2 border-r font-medium">
                      퇴직금{" "}
                      <InfoTooltip
                        simple="1년 이상 근무한 직원에게 30일분 평균임금을 지급합니다"
                        legal="근로자퇴직급여 보장법 제8조"
                      />
                    </td>
                    <td className="px-4 py-2 border-r text-xs text-gray-600">
                      {result.severance.isEligible
                        ? `일평균임금 ${formatCurrency(result.averageDailyWage)} × 30일 × ${result.severance.serviceYears.toFixed(2)}년`
                        : "1년 미만 근속 — 미해당"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(result.severance.totalAmount)}
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="px-4 py-2 border-r font-medium">
                      미사용 연차수당{" "}
                      <InfoTooltip
                        simple="퇴직 시 사용하지 못한 연차에 대해 통상임금으로 보상합니다"
                        legal="근로기준법 제60조"
                      />
                    </td>
                    <td className="px-4 py-2 border-r text-xs text-gray-600">
                      총 {result.totalAnnualLeaveDays}일 - 사용 {usedLeave}일 ={" "}
                      {result.unusedLeaveDays}일 ×{" "}
                      {formatCurrency(result.averageDailyWage)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(result.unusedLeavePay)}
                    </td>
                  </tr>
                  {result.terminationNoticePay > 0 && (
                    <tr className="border border-[var(--border)] border-t-0">
                      <td className="px-4 py-2 border-r font-medium">
                        해고예고수당{" "}
                        <InfoTooltip
                          simple="30일 전에 해고를 통보하지 않았으면 30일치 통상임금을 지급해야 합니다"
                          legal="근로기준법 제26조"
                        />
                      </td>
                      <td className="px-4 py-2 border-r text-xs text-gray-600">
                        (30일 - {noticeDays}일) ×{" "}
                        {formatCurrency(result.averageDailyWage)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(result.terminationNoticePay)}
                      </td>
                    </tr>
                  )}
                  {result.consolationMoney > 0 && (
                    <tr className="border border-[var(--border)] border-t-0">
                      <td className="px-4 py-2 border-r font-medium">
                        위로금 (합의금)
                      </td>
                      <td className="px-4 py-2 border-r text-xs text-gray-600">
                        권고사직 합의
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(result.consolationMoney)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-2 border-[var(--border)] bg-gray-50">
                    <td className="px-4 py-3 border-r font-bold" colSpan={2}>
                      합 계
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      {formatCurrency(result.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* 지급 정보 */}
            <table className="w-full border-collapse text-sm mb-8">
              <tbody>
                <tr className="border border-[var(--border)]">
                  <td className="bg-gray-50 px-4 py-2 font-medium w-24 border-r">
                    지급예정일
                  </td>
                  <td className="px-4 py-2 border-r">
                    {paymentDate
                      ? formatDate(paymentDate)
                      : "퇴직일로부터 14일 이내"}
                  </td>
                  <td className="bg-gray-50 px-4 py-2 font-medium w-24 border-r">
                    입금계좌
                  </td>
                  <td className="px-4 py-2">
                    {bankName} {accountNumber}
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="text-sm text-center mb-4 leading-relaxed">
              위와 같이 퇴직에 따른 정산 내역을 확인하고, 상호 이의 없이
              정산함을 확인합니다.
            </p>

            <p className="text-center text-sm mb-10">
              {formatDate(terminationDate)}
            </p>

            {/* 서명란 */}
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="text-center">
                <p className="font-bold mb-1">[사업장]</p>
                <p>{company.name}</p>
                <p className="mt-4">대표이사 {company.ceoName} (인)</p>
              </div>
              <div className="text-center">
                <p className="font-bold mb-1">[퇴직자]</p>
                <p>{employeeName}</p>
                <p className="mt-4 border-b border-gray-400 inline-block w-32">
                  &nbsp;
                </p>
                <p className="text-xs text-gray-500 mt-1">(서명 또는 인)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
