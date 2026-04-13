"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Employee, EmploymentType } from "@/types";
import HelpGuide from "@/components/HelpGuide";
import {
  formatCurrency,
  formatDateShort,
  formatResidentNumber,
  autoFormatResidentNumber,
  autoFormatPhone,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/storage";
import {
  MINIMUM_WAGE,
  optimizeSalary,
  calculateInsurance,
  TAX_EXEMPTION_LIMITS,
} from "@/lib/constants";
import { useEmployees } from "@/hooks/useEmployees";
import { usePlanGate } from "@/hooks/usePlanGate";
import { downloadCSV } from "@/lib/export-csv";
import { useToast } from "@/contexts/ToastContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import EmptyState from "@/components/EmptyState";
import Breadcrumb from "@/components/Breadcrumb";
import EmployeeImportModal from "@/components/EmployeeImportModal";
import MobileFormWizard from "@/components/MobileFormWizard";

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  fulltime: "정규직",
  parttime: "파트타임",
  freelancer: "프리랜서",
};

const STATUS_LABELS: Record<string, string> = {
  active: "재직중",
  on_leave: "휴직",
  resigned: "퇴사",
  pending: "대기",
};

const STATUS_BADGE: Record<string, string> = {
  active: "badge-success",
  on_leave: "badge-warning",
  resigned: "badge-neutral",
  pending: "badge-info",
};

const defaultEmployee: Omit<Employee, "id" | "createdAt" | "updatedAt"> = {
  info: { name: "", residentNumber: "", address: "", phone: "" },
  employmentType: "fulltime",
  status: "active",
  hireDate: new Date().toISOString().split("T")[0],
  department: "",
  position: "",
  salary: {
    type: "monthly",
    baseSalary: 0,
    mealAllowance: 200000,
    carAllowance: 0,
    childcareAllowance: 0,
    researchAllowance: 0,
    otherAllowances: [],
  },
  workCondition: {
    weeklyHours: 40,
    workDays: ["월", "화", "수", "목", "금"],
    workStartTime: "09:00",
    workEndTime: "18:00",
    breakTime: 60,
  },
  insurance: {
    national: true,
    health: true,
    employment: true,
    industrial: true,
  },
  taxDependents: {
    dependents: 1,
    childrenUnder20: 0,
  },
  taxExemptOptions: {
    hasOwnCar: false,
    hasChildUnder6: false,
    isResearcher: false,
  },
};

export default function EmployeesPage() {
  const {
    employees,
    loading: empLoading,
    addEmployee: addEmp,
    updateEmployee: updateEmp,
    deleteEmployee: deleteEmp,
  } = useEmployees();
  const planGate = usePlanGate();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultEmployee);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [totalSalaryInput, setTotalSalaryInput] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 자동저장 (새 직원 등록 시만, 편집 시에는 비활성)
  const {
    restore,
    clear: clearAutoSave,
    hasSaved,
  } = useAutoSave("employee_form", formData, showForm && !editingId);

  // 폼 열 때 자동저장 데이터 존재하면 복원 배너 표시
  useEffect(() => {
    if (showForm && !editingId && hasSaved()) {
      setShowRestoreBanner(true);
    }
  }, [showForm, editingId, hasSaved]);

  const handleRestore = () => {
    const saved = restore();
    if (saved) setFormData(saved);
    setShowRestoreBanner(false);
  };

  const handleDismissRestore = () => {
    clearAutoSave();
    setShowRestoreBanner(false);
  };

  const handleSave = async () => {
    // 인라인 에러 검증
    const errors: Record<string, string> = {};
    if (!formData.info.name.trim()) errors.name = "직원 이름을 입력해주세요.";
    if (
      formData.employmentType === "parttime" &&
      (!formData.salary.hourlyWage || formData.salary.hourlyWage <= 0)
    ) {
      errors.hourlyWage = "시급을 입력해주세요.";
    }
    if (
      formData.employmentType !== "parttime" &&
      formData.salary.baseSalary <= 0
    ) {
      errors.baseSalary = "기본급을 입력해주세요.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (editingId) {
        await updateEmp(editingId, formData);
      } else {
        if (!planGate.canAddEmployee(employees.length)) {
          toast.warning(
            `현재 등급(${planGate.planLabel})에서는 최대 ${planGate.maxEmployees}명까지 등록 가능합니다.`,
          );
          setSaving(false);
          return;
        }
        await addEmp(formData);
      }
      clearAutoSave();
      toast.success(
        editingId ? "직원 정보가 수정되었습니다." : "직원이 등록되었습니다.",
      );
      resetForm();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setFormData(employee);
    setEditingId(employee.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      try {
        await deleteEmp(id);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "삭제에 실패했습니다.";
        toast.error(message);
      }
    }
  };

  const resetForm = () => {
    setFormData(defaultEmployee);
    setEditingId(null);
    setShowForm(false);
    setShowOptimizer(false);
    setFieldErrors({});
    setShowRestoreBanner(false);
  };

  // 일괄 가져오기
  const handleBulkImport = async (
    list: Omit<Employee, "id" | "createdAt" | "updatedAt">[],
  ) => {
    let success = 0;
    let fail = 0;
    for (const emp of list) {
      try {
        await addEmp(emp);
        success++;
      } catch {
        fail++;
      }
    }
    toast.success(
      `${success}명 등록 완료${fail > 0 ? `, ${fail}명 실패` : ""}`,
    );
  };

  // 급여 최적화 적용
  const applyOptimization = () => {
    if (totalSalaryInput <= 0) {
      toast.warning("총 급여를 입력해주세요.");
      return;
    }

    const result = optimizeSalary(totalSalaryInput, {
      hasOwnCar: formData.taxExemptOptions.hasOwnCar,
      hasChildUnder6: formData.taxExemptOptions.hasChildUnder6,
    });

    setFormData((prev) => ({
      ...prev,
      salary: {
        ...prev.salary,
        baseSalary: result.baseSalary,
        mealAllowance: result.mealAllowance,
        carAllowance: result.carAllowance,
        childcareAllowance: result.childcareAllowance,
      },
    }));

    if (result.warnings.length > 0) {
      toast.info(result.warnings.join(" / "));
    }
  };

  // 상태 즉시 변경 (테이블에서 버튼 클릭)
  const handleStatusChange = async (id: string, newStatus: string) => {
    const updates: Partial<Employee> = {
      status: newStatus as Employee["status"],
    };
    if (newStatus === "resigned") {
      updates.resignDate = new Date().toISOString().split("T")[0];
    }
    try {
      await updateEmp(id, updates);
      toast.success(`상태가 "${STATUS_LABELS[newStatus]}"으로 변경되었습니다.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "변경에 실패했습니다.");
    }
  };

  // 현재 급여의 4대보험 계산
  const currentInsurance = calculateInsurance(formData.salary.baseSalary);
  const totalGross =
    formData.salary.baseSalary +
    formData.salary.mealAllowance +
    formData.salary.carAllowance +
    formData.salary.childcareAllowance +
    formData.salary.researchAllowance;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <Breadcrumb
        items={[{ label: "홈", href: "/dashboard" }, { label: "직원 관리" }]}
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="heading-lg flex items-center gap-2">
            <span className="icon-box icon-box-primary">👥</span>
            직원 관리
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            직원 등록 및 계약/급여 연동
          </p>
        </div>
        <div className="flex gap-2">
          {!showForm && (
            <button
              onClick={() => setShowImport(true)}
              className="btn btn-secondary"
            >
              📂 파일에서 가져오기
            </button>
          )}
          {employees.length > 0 && !showForm && (
            <button
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                const headers = [
                  "이름",
                  "고용형태",
                  "부서",
                  "직위",
                  "입사일",
                  "상태",
                  "기본급",
                  "식대",
                  "총급여",
                ];
                const rows = employees.map((emp) => {
                  const totalSalary =
                    emp.salary.type === "monthly"
                      ? emp.salary.baseSalary +
                        emp.salary.mealAllowance +
                        emp.salary.carAllowance +
                        emp.salary.childcareAllowance +
                        (emp.salary.researchAllowance || 0)
                      : emp.salary.hourlyWage || 0;
                  return [
                    emp.info.name,
                    EMPLOYMENT_TYPE_LABELS[emp.employmentType],
                    emp.department || "",
                    emp.position || "",
                    emp.hireDate,
                    emp.status === "active"
                      ? "재직중"
                      : emp.status === "resigned"
                        ? "퇴사"
                        : "대기",
                    emp.salary.baseSalary,
                    emp.salary.mealAllowance,
                    totalSalary,
                  ] as (string | number)[];
                });
                downloadCSV(`직원목록_${today}.csv`, headers, rows);
              }}
              className="btn btn-secondary"
            >
              엑셀 내보내기
            </button>
          )}
          <button
            onClick={() => {
              if (!planGate.canAddEmployee(employees.length)) {
                toast.warning(
                  `현재 등급(${planGate.planLabel})에서는 최대 ${planGate.maxEmployees}명까지 등록 가능합니다.`,
                );
                return;
              }
              setShowForm(true);
            }}
            className="btn btn-primary"
          >
            + 직원 등록
          </button>
        </div>
      </div>

      <HelpGuide
        pageKey="employees"
        steps={[
          '"+ 직원 등록" 또는 "엑셀/CSV로 한번에 등록"으로 직원 정보를 입력하세요. 여러 명이면 엑셀이 편해요!',
          "한번 등록하면 계약서, 급여명세서, 4대보험 서류에 이 직원 정보가 자동으로 들어갑니다.",
          '직원이 퇴사하면 "퇴사처리" 버튼만 누르면 됩니다. 삭제하지 마세요 — 퇴직금 계산에 필요해요.',
        ]}
      />

      {/* 로딩 */}
      {empLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
        </div>
      )}

      {/* 직원 목록 */}
      {!empLoading && !showForm && (
        <>
          {employees.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: "all", label: "전체" },
                { key: "active", label: "재직중" },
                { key: "on_leave", label: "휴직" },
                { key: "resigned", label: "퇴사" },
              ].map((tab) => {
                const count =
                  tab.key === "all"
                    ? employees.length
                    : employees.filter((e) => e.status === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      statusFilter === tab.key
                        ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                        : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)]"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                        statusFilter === tab.key
                          ? "bg-white/20 text-white"
                          : "bg-[var(--bg)] text-[var(--text-muted)]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="table-container">
            {employees.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="text-5xl mb-4">👤</div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                  등록된 직원이 없습니다
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm mx-auto">
                  직원을 등록하면 계약서·급여명세서에 자동으로 연동됩니다
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    직원 1명씩 등록하기
                  </button>
                  <button
                    onClick={() => setShowImport(true)}
                    className="px-6 py-2.5 bg-[var(--bg-card)] text-[var(--primary)] border border-[var(--primary)] rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    📂 엑셀/CSV로 한번에 등록
                  </button>
                </div>
                <p className="text-xs text-[var(--text-light)] mt-4">
                  직원이 여러 명이라면? 샘플 파일을 다운받아 작성 후
                  업로드하세요
                </p>
              </div>
            ) : (
              (() => {
                const filtered =
                  statusFilter === "all"
                    ? employees
                    : employees.filter((e) => e.status === statusFilter);
                return filtered.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)]">
                    해당 상태의 직원이 없습니다.
                  </div>
                ) : (
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>이름</th>
                        <th>고용형태</th>
                        <th>부서/직위</th>
                        <th>입사일</th>
                        <th className="text-right">월 급여</th>
                        <th className="text-center">재직상태</th>
                        <th className="text-center">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((emp) => (
                        <tr
                          key={emp.id}
                          className={
                            emp.status === "resigned" ? "opacity-60" : ""
                          }
                        >
                          <td data-label="이름">
                            <div className="font-medium">{emp.info.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {formatResidentNumber(emp.info.residentNumber)}
                            </div>
                            {emp.status === "resigned" && emp.resignDate && (
                              <div className="text-xs text-[var(--text-muted)]">
                                퇴사: {formatDateShort(emp.resignDate)}
                              </div>
                            )}
                          </td>
                          <td data-label="고용형태">
                            <span
                              className={`badge ${
                                emp.employmentType === "fulltime"
                                  ? "badge-primary"
                                  : emp.employmentType === "parttime"
                                    ? "badge-info"
                                    : "badge-warning"
                              }`}
                            >
                              {EMPLOYMENT_TYPE_LABELS[emp.employmentType]}
                            </span>
                          </td>
                          <td
                            data-label="부서/직위"
                            className="text-[var(--text-muted)]"
                          >
                            {emp.department || "-"} / {emp.position || "-"}
                          </td>
                          <td
                            data-label="입사일"
                            className="text-[var(--text-muted)]"
                          >
                            {formatDateShort(emp.hireDate)}
                          </td>
                          <td
                            data-label="월 급여"
                            className="text-right font-medium"
                          >
                            {emp.salary.type === "monthly"
                              ? formatCurrency(
                                  emp.salary.baseSalary +
                                    emp.salary.mealAllowance +
                                    emp.salary.carAllowance +
                                    emp.salary.childcareAllowance +
                                    (emp.salary.researchAllowance || 0),
                                )
                              : `시급 ${formatCurrency(emp.salary.hourlyWage || 0)}`}
                          </td>
                          <td data-label="재직상태" className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`badge ${STATUS_BADGE[emp.status] || "badge-neutral"}`}
                              >
                                {STATUS_LABELS[emp.status] || emp.status}
                              </span>
                              {/* 빠른 상태 변경 버튼 */}
                              {emp.status === "active" && (
                                <div className="flex gap-1 mt-0.5">
                                  <button
                                    onClick={() =>
                                      handleStatusChange(emp.id, "on_leave")
                                    }
                                    className="text-xs text-amber-600 hover:underline"
                                  >
                                    휴직처리
                                  </button>
                                  <span className="text-[var(--text-muted)] text-xs">
                                    ·
                                  </span>
                                  <button
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `${emp.info.name} 직원을 퇴사 처리하시겠습니까?`,
                                        )
                                      )
                                        handleStatusChange(emp.id, "resigned");
                                    }}
                                    className="text-xs text-red-500 hover:underline"
                                  >
                                    퇴사처리
                                  </button>
                                </div>
                              )}
                              {emp.status === "on_leave" && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(emp.id, "active")
                                  }
                                  className="text-xs text-green-600 hover:underline mt-0.5"
                                >
                                  복직처리
                                </button>
                              )}
                              {emp.status === "resigned" && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(emp.id, "active")
                                  }
                                  className="text-xs text-blue-500 hover:underline mt-0.5"
                                >
                                  재입사
                                </button>
                              )}
                            </div>
                          </td>
                          <td data-label="관리" className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(emp)}
                                className="btn btn-ghost btn-sm"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(emp.id)}
                                className="btn btn-ghost btn-sm text-[var(--danger)]"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()
            )}
          </div>
        </>
      )}

      {/* 직원 등록/수정 폼 */}
      {showForm && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--text)]">
              {editingId ? "✏️ 직원 정보 수정" : "➕ 새 직원 등록"}
            </h2>
            <button
              onClick={resetForm}
              className="text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              ✕ 닫기
            </button>
          </div>

          {/* 자동저장 복원 배너 */}
          {showRestoreBanner && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
              <span className="text-blue-800">
                이전에 작성하던 내용이 있습니다.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleRestore}
                  className="px-3 py-1 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:opacity-90"
                >
                  복원하기
                </button>
                <button
                  onClick={handleDismissRestore}
                  className="px-3 py-1 text-blue-600 hover:text-blue-800 text-xs"
                >
                  삭제
                </button>
              </div>
            </div>
          )}

          <MobileFormWizard
            completeLabel="저장"
            onComplete={handleSave}
            steps={[
              {
                title: "기본 정보",
                icon: "👤",
                validate: () => formData.info.name.trim() !== "",
                validationMessage: "직원 이름을 입력해주세요.",
                helpText:
                  "직원의 기본 인적 사항을 입력합니다. 이름은 필수입니다.",
                summary: [
                  { label: "이름", value: formData.info.name || "-" },
                  {
                    label: "고용형태",
                    value: EMPLOYMENT_TYPE_LABELS[formData.employmentType],
                  },
                  {
                    label: "입사일",
                    value: formData.hireDate
                      ? formatDateShort(formData.hireDate)
                      : "-",
                  },
                ],
                content: (
                  <div className="form-section">
                    <h3 className="form-section-title">👤 기본 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">성명 *</label>
                        <input
                          type="text"
                          className={`input-field ${fieldErrors.name ? "input-error" : ""}`}
                          value={formData.info.name}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              info: { ...prev.info, name: e.target.value },
                            }));
                            if (fieldErrors.name)
                              setFieldErrors((prev) => {
                                const { name, ...rest } = prev;
                                return rest;
                              });
                          }}
                        />
                        {fieldErrors.name && (
                          <p className="input-error-msg">{fieldErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">주민등록번호</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="990101-1234567"
                          value={formData.info.residentNumber}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              info: {
                                ...prev.info,
                                residentNumber: autoFormatResidentNumber(
                                  e.target.value,
                                ),
                              },
                            }))
                          }
                          maxLength={14}
                        />
                      </div>
                      <div>
                        <label className="input-label">연락처</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="010-1234-5678"
                          value={formData.info.phone}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              info: {
                                ...prev.info,
                                phone: autoFormatPhone(e.target.value),
                              },
                            }))
                          }
                          maxLength={13}
                        />
                      </div>
                      <div>
                        <label className="input-label">고용형태</label>
                        <select
                          className="input-field"
                          value={formData.employmentType}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              employmentType: e.target.value as EmploymentType,
                              salary: {
                                ...prev.salary,
                                type:
                                  e.target.value === "parttime"
                                    ? "hourly"
                                    : "monthly",
                              },
                            }))
                          }
                        >
                          <option value="fulltime">정규직</option>
                          <option value="parttime">파트타임</option>
                          <option value="freelancer">프리랜서</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">부서</label>
                        <input
                          type="text"
                          className="input-field"
                          value={formData.department}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              department: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">직위</label>
                        <input
                          type="text"
                          className="input-field"
                          value={formData.position}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              position: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">입사일</label>
                        <input
                          type="date"
                          className="input-field"
                          value={formData.hireDate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              hireDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      {editingId && (
                        <div>
                          <label className="input-label">재직상태</label>
                          <select
                            className="input-field"
                            value={formData.status}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                status: e.target.value as Employee["status"],
                                resignDate:
                                  e.target.value === "resigned"
                                    ? prev.resignDate ||
                                      new Date().toISOString().split("T")[0]
                                    : prev.resignDate,
                              }))
                            }
                          >
                            <option value="active">재직중</option>
                            <option value="on_leave">휴직</option>
                            <option value="resigned">퇴사</option>
                          </select>
                        </div>
                      )}
                      {editingId && formData.status === "resigned" && (
                        <div>
                          <label className="input-label">퇴사일</label>
                          <input
                            type="date"
                            className="input-field"
                            value={formData.resignDate || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                resignDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                      {editingId && formData.status === "on_leave" && (
                        <div className="md:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          💡 휴직 상태입니다. 복직 시 재직상태를
                          &quot;재직중&quot;으로 변경해주세요.
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="input-label">주소</label>
                        <input
                          type="text"
                          className="input-field"
                          value={formData.info.address}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              info: { ...prev.info, address: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                title: "급여 설정",
                icon: "💰",
                validate: () => {
                  if (formData.employmentType === "parttime") {
                    return (formData.salary.hourlyWage || 0) > 0;
                  }
                  return formData.salary.baseSalary > 0;
                },
                validationMessage:
                  formData.employmentType === "parttime"
                    ? "시급을 입력해주세요."
                    : "기본급(총 급여)을 입력해주세요.",
                helpText:
                  "비과세 항목을 먼저 설정하면, 총 급여 입력 시 자동으로 절세 최적화가 적용됩니다.",
                summary: [
                  {
                    label: "총 급여",
                    value:
                      formData.employmentType === "parttime"
                        ? `시급 ${formatCurrency(formData.salary.hourlyWage || 0)}`
                        : totalGross > 0
                          ? formatCurrency(totalGross)
                          : "-",
                  },
                  {
                    label: "부양가족",
                    value: `${formData.taxDependents.dependents}명`,
                  },
                ],
                content: (
                  <div className="space-y-6">
                    {/* 비과세 옵션 */}
                    <div className="form-section">
                      <h3 className="form-section-title">
                        🎁 비과세 항목 적용 조건
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex items-center gap-3 p-4 bg-[var(--bg)] rounded-lg cursor-pointer hover:bg-[var(--bg)]">
                          <input
                            type="checkbox"
                            className="w-5 h-5 text-blue-600 rounded"
                            checked={formData.taxExemptOptions.hasOwnCar}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => {
                                const newOpts = {
                                  ...prev.taxExemptOptions,
                                  hasOwnCar: checked,
                                };
                                const currentTotal =
                                  prev.salary.baseSalary +
                                  prev.salary.mealAllowance +
                                  prev.salary.carAllowance +
                                  prev.salary.childcareAllowance +
                                  prev.salary.researchAllowance;
                                if (currentTotal > 0) {
                                  const result = optimizeSalary(currentTotal, {
                                    hasOwnCar: checked,
                                    hasChildUnder6: newOpts.hasChildUnder6,
                                    childrenUnder6:
                                      newOpts.childrenUnder6Count ||
                                      (newOpts.hasChildUnder6 ? 1 : 0),
                                    isResearcher: newOpts.isResearcher,
                                  });
                                  return {
                                    ...prev,
                                    taxExemptOptions: newOpts,
                                    salary: {
                                      ...prev.salary,
                                      baseSalary: result.baseSalary,
                                      mealAllowance: result.mealAllowance,
                                      carAllowance: result.carAllowance,
                                      childcareAllowance:
                                        result.childcareAllowance,
                                      researchAllowance:
                                        result.researchAllowance,
                                    },
                                  };
                                }
                                return { ...prev, taxExemptOptions: newOpts };
                              });
                            }}
                          />
                          <div>
                            <span className="font-medium">
                              🚗 본인 차량 보유
                            </span>
                            <p className="text-xs text-[var(--text-muted)]">
                              자가운전보조금 월 20만원 비과세
                            </p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-4 bg-[var(--bg)] rounded-lg cursor-pointer hover:bg-[var(--bg)]">
                          <input
                            type="checkbox"
                            className="w-5 h-5 text-blue-600 rounded"
                            checked={formData.taxExemptOptions.hasChildUnder6}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => {
                                const newOpts = {
                                  ...prev.taxExemptOptions,
                                  hasChildUnder6: checked,
                                };
                                const currentTotal =
                                  prev.salary.baseSalary +
                                  prev.salary.mealAllowance +
                                  prev.salary.carAllowance +
                                  prev.salary.childcareAllowance +
                                  prev.salary.researchAllowance;
                                if (currentTotal > 0) {
                                  const result = optimizeSalary(currentTotal, {
                                    hasOwnCar: newOpts.hasOwnCar,
                                    hasChildUnder6: checked,
                                    childrenUnder6:
                                      newOpts.childrenUnder6Count ||
                                      (checked ? 1 : 0),
                                    isResearcher: newOpts.isResearcher,
                                  });
                                  return {
                                    ...prev,
                                    taxExemptOptions: newOpts,
                                    salary: {
                                      ...prev.salary,
                                      baseSalary: result.baseSalary,
                                      mealAllowance: result.mealAllowance,
                                      carAllowance: result.carAllowance,
                                      childcareAllowance:
                                        result.childcareAllowance,
                                      researchAllowance:
                                        result.researchAllowance,
                                    },
                                  };
                                }
                                return { ...prev, taxExemptOptions: newOpts };
                              });
                            }}
                          />
                          <div>
                            <span className="font-medium">
                              👶 6세 이하 자녀
                            </span>
                            <p className="text-xs text-[var(--text-muted)]">
                              보육수당 월 20만원 비과세
                            </p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-4 bg-[var(--bg)] rounded-lg cursor-pointer hover:bg-[var(--bg)]">
                          <input
                            type="checkbox"
                            className="w-5 h-5 text-blue-600 rounded"
                            checked={formData.taxExemptOptions.isResearcher}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => {
                                const newOpts = {
                                  ...prev.taxExemptOptions,
                                  isResearcher: checked,
                                };
                                const currentTotal =
                                  prev.salary.baseSalary +
                                  prev.salary.mealAllowance +
                                  prev.salary.carAllowance +
                                  prev.salary.childcareAllowance +
                                  prev.salary.researchAllowance;
                                if (currentTotal > 0) {
                                  const result = optimizeSalary(currentTotal, {
                                    hasOwnCar: newOpts.hasOwnCar,
                                    hasChildUnder6: newOpts.hasChildUnder6,
                                    childrenUnder6:
                                      newOpts.childrenUnder6Count ||
                                      (newOpts.hasChildUnder6 ? 1 : 0),
                                    isResearcher: checked,
                                  });
                                  return {
                                    ...prev,
                                    taxExemptOptions: newOpts,
                                    salary: {
                                      ...prev.salary,
                                      baseSalary: result.baseSalary,
                                      mealAllowance: result.mealAllowance,
                                      carAllowance: result.carAllowance,
                                      childcareAllowance:
                                        result.childcareAllowance,
                                      researchAllowance:
                                        result.researchAllowance,
                                    },
                                  };
                                }
                                return { ...prev, taxExemptOptions: newOpts };
                              });
                            }}
                          />
                          <div>
                            <span className="font-medium">🔬 연구원</span>
                            <p className="text-xs text-[var(--text-muted)]">
                              연구활동비 월 20만원 비과세
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* 급여 정보 */}
                    <div className="form-section">
                      <h3 className="form-section-title">💰 급여 정보</h3>

                      {formData.employmentType === "parttime" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">시급 (원) *</label>
                            <input
                              type="number"
                              className={`input-field ${fieldErrors.hourlyWage ? "input-error" : ""}`}
                              value={formData.salary.hourlyWage || ""}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  salary: {
                                    ...prev.salary,
                                    hourlyWage: parseInt(e.target.value) || 0,
                                  },
                                }));
                                if (fieldErrors.hourlyWage)
                                  setFieldErrors((prev) => {
                                    const { hourlyWage, ...rest } = prev;
                                    return rest;
                                  });
                              }}
                            />
                            {fieldErrors.hourlyWage && (
                              <p className="input-error-msg">
                                {fieldErrors.hourlyWage}
                              </p>
                            )}
                            <p className="text-xs text-[var(--text-light)] mt-1">
                              2026년 최저시급:{" "}
                              {formatCurrency(MINIMUM_WAGE.hourly)}
                              {(formData.salary.hourlyWage || 0) <
                                MINIMUM_WAGE.hourly &&
                                (formData.salary.hourlyWage || 0) > 0 && (
                                  <span className="text-red-500 ml-2">
                                    ⚠️ 최저임금 미달!
                                  </span>
                                )}
                            </p>
                          </div>
                          <div>
                            <label className="input-label">
                              주 소정근로시간
                            </label>
                            <input
                              type="number"
                              className="input-field"
                              value={formData.workCondition.weeklyHours}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  workCondition: {
                                    ...prev.workCondition,
                                    weeklyHours: parseInt(e.target.value) || 0,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="input-label">
                              총 급여 (월) *
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              className={`input-field text-lg font-semibold ${fieldErrors.baseSalary ? "input-error" : ""}`}
                              placeholder="2,600,000"
                              value={
                                totalGross
                                  ? formatNumberInput(String(totalGross))
                                  : ""
                              }
                              onChange={(e) => {
                                const total = parseNumberInput(e.target.value);
                                const result = optimizeSalary(total, {
                                  hasOwnCar:
                                    formData.taxExemptOptions.hasOwnCar,
                                  hasChildUnder6:
                                    formData.taxExemptOptions.hasChildUnder6,
                                  childrenUnder6:
                                    formData.taxExemptOptions
                                      .childrenUnder6Count ||
                                    (formData.taxExemptOptions.hasChildUnder6
                                      ? 1
                                      : 0),
                                  isResearcher:
                                    formData.taxExemptOptions.isResearcher,
                                });
                                setFormData((prev) => ({
                                  ...prev,
                                  salary: {
                                    ...prev.salary,
                                    baseSalary: result.baseSalary,
                                    mealAllowance: result.mealAllowance,
                                    carAllowance: result.carAllowance,
                                    childcareAllowance:
                                      result.childcareAllowance,
                                    researchAllowance: result.researchAllowance,
                                  },
                                }));
                                if (fieldErrors.baseSalary)
                                  setFieldErrors((prev) => {
                                    const { baseSalary, ...rest } = prev;
                                    return rest;
                                  });
                              }}
                            />
                            {fieldErrors.baseSalary && (
                              <p className="input-error-msg">
                                {fieldErrors.baseSalary}
                              </p>
                            )}
                            <p className="text-xs text-[var(--text-light)] mt-1">
                              총 급여를 입력하면 비과세 항목이 자동 분배됩니다
                            </p>
                          </div>

                          {totalGross > 0 && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm font-medium text-blue-800 mb-3">
                                자동 분배 결과
                              </p>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-[var(--text-muted)]">
                                    기본급 (과세)
                                  </span>
                                  <span className="font-medium">
                                    {formatCurrency(formData.salary.baseSalary)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[var(--text-muted)]">
                                    식대 (비과세)
                                  </span>
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(
                                      formData.salary.mealAllowance,
                                    )}
                                  </span>
                                </div>
                                {formData.taxExemptOptions.hasOwnCar &&
                                  formData.salary.carAllowance > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-[var(--text-muted)]">
                                        자가운전보조금
                                      </span>
                                      <span className="font-medium text-green-600">
                                        {formatCurrency(
                                          formData.salary.carAllowance,
                                        )}
                                      </span>
                                    </div>
                                  )}
                                {formData.taxExemptOptions.hasChildUnder6 &&
                                  formData.salary.childcareAllowance > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-[var(--text-muted)]">
                                        보육수당
                                      </span>
                                      <span className="font-medium text-green-600">
                                        {formatCurrency(
                                          formData.salary.childcareAllowance,
                                        )}
                                      </span>
                                    </div>
                                  )}
                                {formData.taxExemptOptions.isResearcher &&
                                  formData.salary.researchAllowance > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-[var(--text-muted)]">
                                        연구보조비
                                      </span>
                                      <span className="font-medium text-green-600">
                                        {formatCurrency(
                                          formData.salary.researchAllowance,
                                        )}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 부양가족 정보 */}
                    <div className="form-section">
                      <h3 className="form-section-title">
                        👨‍👩‍👧 부양가족 정보 (소득세 간이세액표)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="input-label">
                            공제대상 부양가족 수 (본인 포함)
                          </label>
                          <select
                            className="input-field"
                            value={formData.taxDependents.dependents}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                taxDependents: {
                                  ...prev.taxDependents,
                                  dependents: parseInt(e.target.value),
                                },
                              }))
                            }
                          >
                            {Array.from({ length: 11 }, (_, i) => i + 1).map(
                              (n) => (
                                <option key={n} value={n}>
                                  {n}명{n === 1 ? " (본인만)" : ""}
                                </option>
                              ),
                            )}
                          </select>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            배우자, 직계존비속 등 기본공제대상자 포함
                          </p>
                        </div>
                        <div>
                          <label className="input-label">
                            20세 이하 자녀 수 (자녀세액공제)
                          </label>
                          <select
                            className="input-field"
                            value={formData.taxDependents.childrenUnder20}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                taxDependents: {
                                  ...prev.taxDependents,
                                  childrenUnder20: parseInt(e.target.value),
                                },
                              }))
                            }
                          >
                            {Array.from({ length: 8 }, (_, i) => i).map((n) => (
                              <option key={n} value={n}>
                                {n}명{n === 0 ? " (해당 없음)" : ""}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            1명 12,500원 / 2명 29,160원 / 3명+ 추가 25,000원
                            공제
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                title: "4대보험",
                icon: "🏥",
                helpText:
                  "4대보험 가입 여부를 설정합니다. 정규직은 4대보험 의무가입 대상입니다.",
                summary: [
                  {
                    label: "4대보험",
                    value:
                      [
                        formData.insurance.national ? "국민연금" : "",
                        formData.insurance.health ? "건강보험" : "",
                        formData.insurance.employment ? "고용보험" : "",
                        formData.insurance.industrial ? "산재보험" : "",
                      ]
                        .filter(Boolean)
                        .join(", ") || "미가입",
                  },
                ],
                content: (
                  <div className="space-y-6">
                    {/* 4대보험 */}
                    <div className="form-section">
                      <h3 className="form-section-title">🏥 4대보험 가입</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { key: "national", label: "국민연금", rate: "4.75%" },
                          { key: "health", label: "건강보험", rate: "3.595%" },
                          {
                            key: "employment",
                            label: "고용보험",
                            rate: "0.9%",
                          },
                          {
                            key: "industrial",
                            label: "산재보험",
                            rate: "사업주 전액",
                          },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center gap-2 p-3 bg-[var(--bg)] rounded-lg cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="w-5 h-5 text-blue-600 rounded"
                              checked={
                                formData.insurance[
                                  item.key as keyof typeof formData.insurance
                                ]
                              }
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  insurance: {
                                    ...prev.insurance,
                                    [item.key]: e.target.checked,
                                  },
                                }))
                              }
                            />
                            <div>
                              <span className="font-medium text-[var(--text)]">
                                {item.label}
                              </span>
                              <p className="text-xs text-[var(--text-light)]">
                                {item.rate}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 급여 요약 */}
                    {formData.employmentType !== "parttime" &&
                      formData.salary.baseSalary > 0 && (
                        <div className="p-4 bg-[var(--bg)] rounded-lg">
                          <h4 className="font-medium text-[var(--text)] mb-3">
                            📊 급여 요약
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[var(--text-muted)]">
                                총 급여
                              </p>
                              <p className="font-bold text-lg">
                                {formatCurrency(totalGross)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--text-muted)]">
                                과세 소득
                              </p>
                              <p className="font-bold text-lg">
                                {formatCurrency(formData.salary.baseSalary)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--text-muted)]">
                                비과세 소득
                              </p>
                              <p className="font-bold text-lg text-green-600">
                                {formatCurrency(
                                  totalGross - formData.salary.baseSalary,
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[var(--text-muted)]">
                                4대보험 (근로자)
                              </p>
                              <p className="font-bold text-lg text-red-600">
                                -
                                {formatCurrency(currentInsurance.totalEmployee)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">예상 실수령액</span>
                              <span className="font-bold text-xl text-blue-600">
                                {formatCurrency(
                                  totalGross - currentInsurance.totalEmployee,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                ),
              },
            ]}
          />

          {/* 저장/취소 버튼 (위저드 외부) */}
          <div className="flex gap-3 justify-end mt-6">
            <button onClick={resetForm} className="btn btn-secondary">
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary disabled:opacity-50"
            >
              {saving ? "저장 중..." : editingId ? "수정 완료" : "직원 등록"}
            </button>
          </div>
        </div>
      )}

      {/* 파일 가져오기 모달 */}
      <EmployeeImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleBulkImport}
        currentCount={employees.length}
        maxCount={planGate.maxEmployees}
      />

      {/* 연동 기능 안내 */}
      {!showForm && employees.length > 0 && (
        <div className="mt-6 alert alert-info">
          <span className="text-lg">🔗</span>
          <div>
            <p className="font-medium text-sm mb-2">문서 연동 기능</p>
            <p className="text-sm opacity-80 mb-3">
              등록된 직원 정보로 근로계약서, 급여명세서, 임금대장을 자동으로
              작성할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contract/fulltime"
                className="btn btn-sm btn-secondary"
              >
                📋 근로계약서
              </Link>
              <Link href="/payslip" className="btn btn-sm btn-secondary">
                💵 급여명세서
              </Link>
              <Link href="/wage-ledger" className="btn btn-sm btn-secondary">
                📊 임금대장
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
