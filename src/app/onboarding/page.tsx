"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEmployees } from "@/hooks/useEmployees";

// 단계: 0=사업장등록, 1=첫 직원 등록, 2=완료
type Step = 0 | 1 | 2;

const STEP_LABELS = ["사업장 등록", "첫 직원 등록", "완료"];

export default function OnboardingPage() {
  const { user, refreshAuth } = useAuth();
  const router = useRouter();
  const { addEmployee } = useEmployees();

  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ──── Step 0: 사업장 정보 ────
  const [companyForm, setCompanyForm] = useState({
    name: "",
    ceoName: "",
    businessNumber: "",
    address: "",
    phone: "",
  });

  // ──── Step 1: 첫 직원 간편 등록 ────
  const [empForm, setEmpForm] = useState({
    name: "",
    hireDate: new Date().toISOString().split("T")[0],
    employmentType: "fulltime" as "fulltime" | "parttime",
    baseSalary: "",
  });

  // 사업자번호 자동 포맷
  const formatBizNum = (val: string) => {
    const nums = val.replace(/[^0-9]/g, "").slice(0, 10);
    if (nums.length <= 3) return nums;
    if (nums.length <= 5) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 5)}-${nums.slice(5)}`;
  };

  // 필드 변경 시 해당 에러 클리어
  const updateField = (field: string, value: string) => {
    setCompanyForm((f) => ({ ...f, [field]: value }));
    if (fieldErrors[field])
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
  };

  // Step 0 제출: 사업장 등록
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const errors: Record<string, string> = {};
    if (!companyForm.name.trim()) errors.name = "상호명을 입력해주세요.";
    if (!companyForm.ceoName.trim())
      errors.ceoName = "대표자명을 입력해주세요.";
    const bizNum = companyForm.businessNumber.replace(/[^0-9]/g, "");
    if (bizNum.length !== 10)
      errors.businessNumber = "사업자등록번호 10자리를 정확히 입력해주세요.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyForm.name,
          ceoName: companyForm.ceoName,
          businessNumber: bizNum,
          address: companyForm.address || null,
          phone: companyForm.phone || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "등록에 실패했습니다.");
        setLoading(false);
        return;
      }

      await refreshAuth();
      setStep(1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`오류: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 1 제출: 첫 직원 간편 등록
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!empForm.name.trim()) errors.empName = "직원 이름을 입력해주세요.";
    if (!empForm.hireDate) errors.hireDate = "입사일을 입력해주세요.";
    const salary = parseInt(empForm.baseSalary.replace(/[^0-9]/g, "")) || 0;
    if (salary <= 0) errors.baseSalary = "급여를 입력해주세요.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setError("");
    setLoading(true);

    try {
      await addEmployee({
        info: {
          name: empForm.name,
          residentNumber: "",
          address: "",
          phone: "",
        },
        employmentType: empForm.employmentType,
        status: "active",
        hireDate: empForm.hireDate,
        salary: {
          type: empForm.employmentType === "parttime" ? "hourly" : "monthly",
          baseSalary: empForm.employmentType === "parttime" ? 0 : salary,
          hourlyWage:
            empForm.employmentType === "parttime" ? salary : undefined,
          mealAllowance: 200000,
          carAllowance: 0,
          childcareAllowance: 0,
          researchAllowance: 0,
          otherAllowances: [],
        },
        workCondition: {
          weeklyHours: empForm.employmentType === "parttime" ? 20 : 40,
          workDays:
            empForm.employmentType === "parttime"
              ? ["월", "화", "수"]
              : ["월", "화", "수", "목", "금"],
          workStartTime: "09:00",
          workEndTime:
            empForm.employmentType === "parttime" ? "14:00" : "18:00",
          breakTime: 60,
        },
        insurance: {
          national: true,
          health: true,
          employment: true,
          industrial: true,
        },
        taxDependents: { dependents: 1, childrenUnder20: 0 },
        taxExemptOptions: {
          hasOwnCar: false,
          hasChildUnder6: false,
          isResearcher: false,
        },
      });

      setStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`오류: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // 급여 포맷 (1,000 단위 쉼표)
  const formatSalary = (val: string) => {
    const nums = val.replace(/[^0-9]/g, "");
    if (!nums) return "";
    return parseInt(nums).toLocaleString("ko-KR");
  };

  // 데모 데이터 채우기
  const fillDemoData = () => {
    setCompanyForm({
      name: "(주)샘플컴퍼니",
      ceoName: "홍길동",
      businessNumber: "123-45-67890",
      address: "서울시 강남구 테헤란로 123",
      phone: "02-1234-5678",
    });
  };

  // 단계 표시 컴포넌트
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const isActive = i === step;
        const isDone = i < step;
        return (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-[var(--primary)]"
                    : isDone
                      ? "text-green-500"
                      : "text-[var(--text-muted)]"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`w-8 h-px mx-2 ${isDone ? "bg-green-500" : "bg-[var(--border)]"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const inputClass = (field?: string) =>
    `w-full px-4 py-3 rounded-lg border bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
      field && fieldErrors[field]
        ? "border-[var(--danger)]"
        : "border-[var(--border)]"
    }`;

  // ──────────────────────────────
  // STEP 0: 사업장 등록
  if (step === 0)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🏢</div>
            <h1 className="text-2xl font-bold text-[var(--text)]">
              사업장 등록
            </h1>
            <p className="text-[var(--text-muted)] mt-2">
              사업장 정보만 입력하면 바로 시작할 수 있습니다.
            </p>
          </div>

          <StepIndicator />

          <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-sm border border-[var(--border)]">
            <button
              type="button"
              onClick={fillDemoData}
              className="w-full py-2.5 mb-5 border-2 border-dashed border-[var(--primary)] text-[var(--primary)] rounded-lg text-sm font-medium hover:bg-[var(--primary)] hover:text-white transition-colors"
            >
              ⚡ 데모 데이터로 빠르게 시작
            </button>

            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  상호명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClass("name")}
                  placeholder="(주)우리회사"
                />
                {fieldErrors.name && (
                  <p className="input-error-msg">{fieldErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  대표자명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyForm.ceoName}
                  onChange={(e) => updateField("ceoName", e.target.value)}
                  className={inputClass("ceoName")}
                  placeholder="홍길동"
                />
                {fieldErrors.ceoName && (
                  <p className="input-error-msg">{fieldErrors.ceoName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  사업자등록번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyForm.businessNumber}
                  onChange={(e) => {
                    setCompanyForm((f) => ({
                      ...f,
                      businessNumber: formatBizNum(e.target.value),
                    }));
                    if (fieldErrors.businessNumber)
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.businessNumber;
                        return next;
                      });
                  }}
                  className={inputClass("businessNumber")}
                  placeholder="000-00-00000"
                />
                {fieldErrors.businessNumber && (
                  <p className="input-error-msg">
                    {fieldErrors.businessNumber}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  주소
                </label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, address: e.target.value }))
                  }
                  className={inputClass()}
                  placeholder="서울시 강남구..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) =>
                    setCompanyForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className={inputClass()}
                  placeholder="02-1234-5678"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
              >
                {loading ? "등록 중..." : "다음: 첫 직원 등록 →"}
              </button>
            </form>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors mt-2"
            >
              나중에 등록하기 →
            </button>
          </div>

          <div className="text-center mt-4">
            <Link
              href="/payslip"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)]"
            >
              또는 로그인 없이 서류 먼저 작성해보기 →
            </Link>
          </div>
        </div>
      </div>
    );

  // ──────────────────────────────
  // STEP 1: 첫 직원 간편 등록
  if (step === 1)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">👤</div>
            <h1 className="text-2xl font-bold text-[var(--text)]">
              첫 직원 등록
            </h1>
            <p className="text-[var(--text-muted)] mt-2">
              기본 정보만 입력하세요. 나머지는 나중에 추가할 수 있습니다.
            </p>
          </div>

          <StepIndicator />

          <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-sm border border-[var(--border)]">
            {/* 간편 등록의 장점 안내 */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 mb-5">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                직원을 등록하면 계약서·급여명세서에 자동으로 연동되어,
                이름·입사일·급여를 매번 입력하지 않아도 됩니다.
              </p>
            </div>

            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  직원 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={empForm.name}
                  onChange={(e) => {
                    setEmpForm((f) => ({ ...f, name: e.target.value }));
                    if (fieldErrors.empName)
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.empName;
                        return next;
                      });
                  }}
                  className={inputClass("empName")}
                  placeholder="김철수"
                  autoFocus
                />
                {fieldErrors.empName && (
                  <p className="input-error-msg">{fieldErrors.empName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  입사일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={empForm.hireDate}
                  onChange={(e) =>
                    setEmpForm((f) => ({ ...f, hireDate: e.target.value }))
                  }
                  className={inputClass("hireDate")}
                />
                {fieldErrors.hireDate && (
                  <p className="input-error-msg">{fieldErrors.hireDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  고용 유형
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "fulltime", label: "정규직 (월급)", icon: "💼" },
                      {
                        value: "parttime",
                        label: "파트타임 (시급)",
                        icon: "⏰",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setEmpForm((f) => ({ ...f, employmentType: opt.value }))
                      }
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        empForm.employmentType === opt.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]"
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  {empForm.employmentType === "parttime" ? "시급" : "월 기본급"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={empForm.baseSalary}
                    onChange={(e) => {
                      setEmpForm((f) => ({
                        ...f,
                        baseSalary: formatSalary(e.target.value),
                      }));
                      if (fieldErrors.baseSalary)
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.baseSalary;
                          return next;
                        });
                    }}
                    className={inputClass("baseSalary")}
                    placeholder={
                      empForm.employmentType === "parttime"
                        ? "10,320"
                        : "2,500,000"
                    }
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                    원
                  </span>
                </div>
                {fieldErrors.baseSalary && (
                  <p className="input-error-msg">{fieldErrors.baseSalary}</p>
                )}
                {empForm.employmentType === "parttime" && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    2026년 최저시급: 10,320원
                  </p>
                )}
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
              >
                {loading ? "등록 중..." : "직원 등록하고 완료 →"}
              </button>
            </form>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors mt-2"
            >
              건너뛰기 — 나중에 등록할게요 →
            </button>
          </div>
        </div>
      </div>
    );

  // ──────────────────────────────
  // STEP 2: 완료 + 다음 안내
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-lg">
        <StepIndicator />

        <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-sm border border-[var(--border)] text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
            준비 완료!
          </h1>
          <p className="text-[var(--text-muted)] mb-2">
            <span className="font-semibold text-[var(--text)]">
              {companyForm.name}
            </span>{" "}
            사업장이 등록되었습니다.
          </p>
          {empForm.name && (
            <p className="text-[var(--text-muted)] text-sm mb-2">
              첫 직원{" "}
              <span className="font-semibold text-[var(--text)]">
                {empForm.name}
              </span>
              님도 등록되었습니다.
            </p>
          )}
          <p className="text-[var(--text-muted)] text-sm mb-8">
            이제 근로계약서를 작성해 보세요.{" "}
            {empForm.name
              ? `${empForm.name}님의 정보가 자동으로 채워집니다.`
              : ""}
          </p>

          <div className="space-y-3">
            <a
              href="/contract/fulltime"
              className="block w-full py-3.5 bg-[var(--primary)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              📝 근로계약서 바로 작성하기
            </a>

            <a
              href="/employees"
              className="block w-full py-3 bg-[var(--bg)] border-2 border-[var(--primary)] text-[var(--primary)] rounded-xl font-medium hover:bg-[var(--primary)] hover:text-white transition-colors"
            >
              👤 직원 추가 등록하기
            </a>

            <div className="grid grid-cols-3 gap-2">
              <a
                href="/payslip"
                className="block py-3 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium hover:border-[var(--primary)] transition-colors"
              >
                💰 급여명세서
              </a>
              <a
                href="/documents/privacy-consent"
                className="block py-3 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium hover:border-[var(--primary)] transition-colors"
              >
                🔒 동의서
              </a>
              <a
                href="/documents/certificate"
                className="block py-3 bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] rounded-xl text-sm font-medium hover:border-[var(--primary)] transition-colors"
              >
                📜 증명서
              </a>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 text-[var(--text-muted)] text-sm hover:text-[var(--text)] transition-colors"
            >
              대시보드로 이동 →
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
          직원 정보는 직원 관리 메뉴에서 언제든 수정할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
