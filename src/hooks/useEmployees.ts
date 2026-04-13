"use client";

/**
 * Supabase 기반 직원 관리 훅
 * - Supabase가 source of truth
 * - 주민등록번호는 서버사이드 AES-256-GCM 암호화
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { encryptResidentNumber, decryptResidentNumbers } from "@/lib/db";
import type { Employee } from "@/types";
import type { DbEmployee } from "@/types/database";

// DbEmployee → Employee 변환 (주민번호는 별도 복호화 필요)
function dbToLocal(e: DbEmployee, decryptedResidentNumber: string): Employee {
  return {
    id: e.id,
    info: {
      name: e.name,
      residentNumber: decryptedResidentNumber,
      address: e.address || "",
      phone: e.phone || "",
    },
    employmentType: e.employment_type,
    status: e.status,
    hireDate: e.hire_date,
    resignDate: e.resign_date || undefined,
    department: e.department || undefined,
    position: e.position || undefined,
    salary: {
      type: e.salary_type,
      baseSalary: e.base_salary,
      hourlyWage: e.hourly_wage || undefined,
      mealAllowance: e.meal_allowance,
      carAllowance: e.car_allowance,
      childcareAllowance: e.childcare_allowance,
      researchAllowance: e.research_allowance,
      otherAllowances: e.other_allowances || [],
      bonusInfo: e.bonus_info || undefined,
    },
    workCondition: {
      weeklyHours: e.weekly_hours,
      workDays: e.work_days || [],
      workStartTime: e.work_start_time,
      workEndTime: e.work_end_time,
      breakTime: e.break_time,
    },
    insurance: {
      national: e.insurance_national,
      health: e.insurance_health,
      employment: e.insurance_employment,
      industrial: e.insurance_industrial,
    },
    taxDependents: {
      dependents: e.tax_dependents ?? 1,
      childrenUnder20: e.tax_children_under20 ?? 0,
    },
    taxExemptOptions: {
      hasOwnCar: e.has_own_car,
      hasChildUnder6: e.has_child_under6,
      childrenUnder6Count: e.children_under6_count,
      isResearcher: e.is_researcher,
    },
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    contractId: e.contract_id || undefined,
  };
}

// Employee → Supabase insert 형식
function localToDbInsert(
  emp: Omit<Employee, "id" | "createdAt" | "updatedAt">,
  companyId: string,
): Record<string, unknown> {
  return {
    company_id: companyId,
    name: emp.info.name,
    resident_number: emp.info.residentNumber || null,
    address: emp.info.address || null,
    phone: emp.info.phone || null,
    email: null,
    employment_type: emp.employmentType,
    status: emp.status,
    hire_date: emp.hireDate,
    resign_date: emp.resignDate || null,
    department: emp.department || null,
    position: emp.position || null,
    salary_type: emp.salary.type,
    base_salary: emp.salary.baseSalary,
    hourly_wage: emp.salary.hourlyWage || null,
    meal_allowance: emp.salary.mealAllowance,
    car_allowance: emp.salary.carAllowance,
    childcare_allowance: emp.salary.childcareAllowance,
    research_allowance: emp.salary.researchAllowance,
    other_allowances: emp.salary.otherAllowances || [],
    bonus_info: emp.salary.bonusInfo || null,
    weekly_hours: emp.workCondition.weeklyHours,
    work_days: emp.workCondition.workDays,
    work_start_time: emp.workCondition.workStartTime,
    work_end_time: emp.workCondition.workEndTime,
    break_time: emp.workCondition.breakTime,
    insurance_national: emp.insurance.national,
    insurance_health: emp.insurance.health,
    insurance_employment: emp.insurance.employment,
    insurance_industrial: emp.insurance.industrial,
    tax_dependents: emp.taxDependents?.dependents ?? 1,
    tax_children_under20: emp.taxDependents?.childrenUnder20 ?? 0,
    has_own_car: emp.taxExemptOptions.hasOwnCar,
    has_child_under6: emp.taxExemptOptions.hasChildUnder6,
    children_under6_count: emp.taxExemptOptions.childrenUnder6Count || 0,
    is_researcher: emp.taxExemptOptions.isResearcher,
    contract_id: null,
  };
}

const GUEST_EMP_KEY = "nomu_guest_employees";

function loadGuestEmployees(): Employee[] {
  try {
    const stored = localStorage.getItem(GUEST_EMP_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGuestEmployees(employees: Employee[]) {
  localStorage.setItem(GUEST_EMP_KEY, JSON.stringify(employees));
}

export function useEmployees() {
  const { user, company } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Supabase에서 직원 목록 로드
  const loadEmployees = useCallback(async () => {
    if (!user) {
      setEmployees(loadGuestEmployees());
      setLoading(false);
      return;
    }
    if (!company) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("직원 로드 실패:", error);
      setLoading(false);
      return;
    }

    // 주민등록번호 복호화 (평문은 바로 사용, 암호화된 값만 API 호출)
    const residentNumbers = (data || []).map(
      (e: DbEmployee) => e.resident_number || "",
    );
    // 암호화 형식: "iv:authTag:ciphertext" (콜론 3개 구분)
    const isEncryptedValue = (v: string) =>
      v.split(":").length === 3 && v.length > 30;
    const needsDecrypt = residentNumbers.filter(
      (v) => v && isEncryptedValue(v),
    );
    let decryptedNumbers: string[];

    if (needsDecrypt.length > 0) {
      // 암호화된 값만 배치 복호화
      try {
        const decryptedBatch = await decryptResidentNumbers(needsDecrypt);
        const decryptMap = new Map<string, string>();
        needsDecrypt.forEach((v, i) => decryptMap.set(v, decryptedBatch[i]));
        decryptedNumbers = residentNumbers.map((v) => {
          if (!v) return "";
          if (isEncryptedValue(v)) return decryptMap.get(v) || "";
          return v; // 평문은 그대로
        });
      } catch {
        // API 실패 시 평문은 그대로, 암호화된 것만 빈 값
        decryptedNumbers = residentNumbers.map((v) => {
          if (!v) return "";
          if (isEncryptedValue(v)) return "";
          return v;
        });
      }
    } else {
      // 암호화된 값이 없으면 API 호출 없이 평문 그대로 사용
      decryptedNumbers = residentNumbers.map((v) => v || "");
    }

    const localEmps = (data || []).map((e: DbEmployee, i: number) =>
      dbToLocal(e, decryptedNumbers[i]),
    );
    setEmployees(localEmps);

    setLoading(false);
  }, [user, company, supabase]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // 직원 추가
  const addEmployee = useCallback(
    async (emp: Omit<Employee, "id" | "createdAt" | "updatedAt">) => {
      if (!user) {
        const now = new Date().toISOString();
        const newEmp: Employee = {
          ...emp,
          id: "guest_" + Date.now(),
          createdAt: now,
          updatedAt: now,
        };
        setEmployees((prev) => {
          const updated = [newEmp, ...prev];
          saveGuestEmployees(updated);
          return updated;
        });
        return newEmp;
      }
      if (!company) throw new Error("사업장을 먼저 등록해주세요.");

      // 주민등록번호 암호화 (실패 시에도 평문 유지)
      const insertData = localToDbInsert(emp, company.id);
      if (emp.info.residentNumber) {
        try {
          const encryptedRN = await encryptResidentNumber(
            emp.info.residentNumber,
          );
          insertData.resident_number = encryptedRN || emp.info.residentNumber;
        } catch (e) {
          console.warn("주민번호 암호화 실패, 평문으로 저장:", e);
          // 암호화 실패 시 평문으로 저장 (데이터 유실 방지)
          insertData.resident_number = emp.info.residentNumber;
        }
      }

      const { data, error } = await supabase
        .from("employees")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // 원본 평문 주민번호로 로컬 상태 구성
      const newEmp = dbToLocal(data, emp.info.residentNumber);
      setEmployees((prev) => {
        const updated = [newEmp, ...prev];
        return updated;
      });

      return newEmp;
    },
    [company, supabase],
  );

  // 직원 수정
  const updateEmployee = useCallback(
    async (id: string, updates: Partial<Employee>) => {
      if (!user) {
        setEmployees((prev) => {
          const updated = prev.map((e) =>
            e.id === id
              ? { ...e, ...updates, updatedAt: new Date().toISOString() }
              : e,
          );
          saveGuestEmployees(updated);
          return updated;
        });
        return;
      }
      // Partial<Employee> → Supabase 컬럼 매핑
      const dbUpdates: Record<string, unknown> = {};
      let plainResidentNumber: string | undefined;
      if (updates.info) {
        if (updates.info.name !== undefined) dbUpdates.name = updates.info.name;
        if (updates.info.residentNumber !== undefined) {
          plainResidentNumber = updates.info.residentNumber;
          if (updates.info.residentNumber) {
            try {
              const encryptedRN = await encryptResidentNumber(
                updates.info.residentNumber,
              );
              dbUpdates.resident_number =
                encryptedRN || updates.info.residentNumber;
            } catch (e) {
              console.warn("주민번호 암호화 실패, 평문으로 저장:", e);
              dbUpdates.resident_number = updates.info.residentNumber;
            }
          } else {
            dbUpdates.resident_number = null;
          }
        }
        if (updates.info.address !== undefined)
          dbUpdates.address = updates.info.address || null;
        if (updates.info.phone !== undefined)
          dbUpdates.phone = updates.info.phone || null;
      }
      if (updates.employmentType !== undefined)
        dbUpdates.employment_type = updates.employmentType;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.hireDate !== undefined)
        dbUpdates.hire_date = updates.hireDate;
      if (updates.resignDate !== undefined)
        dbUpdates.resign_date = updates.resignDate || null;
      if (updates.department !== undefined)
        dbUpdates.department = updates.department || null;
      if (updates.position !== undefined)
        dbUpdates.position = updates.position || null;
      if (updates.salary) {
        dbUpdates.salary_type = updates.salary.type;
        dbUpdates.base_salary = updates.salary.baseSalary;
        dbUpdates.hourly_wage = updates.salary.hourlyWage || null;
        dbUpdates.meal_allowance = updates.salary.mealAllowance;
        dbUpdates.car_allowance = updates.salary.carAllowance;
        dbUpdates.childcare_allowance = updates.salary.childcareAllowance;
        dbUpdates.research_allowance = updates.salary.researchAllowance;
        dbUpdates.other_allowances = updates.salary.otherAllowances || [];
        dbUpdates.bonus_info = updates.salary.bonusInfo || null;
      }
      if (updates.workCondition) {
        dbUpdates.weekly_hours = updates.workCondition.weeklyHours;
        dbUpdates.work_days = updates.workCondition.workDays;
        dbUpdates.work_start_time = updates.workCondition.workStartTime;
        dbUpdates.work_end_time = updates.workCondition.workEndTime;
        dbUpdates.break_time = updates.workCondition.breakTime;
      }
      if (updates.insurance) {
        dbUpdates.insurance_national = updates.insurance.national;
        dbUpdates.insurance_health = updates.insurance.health;
        dbUpdates.insurance_employment = updates.insurance.employment;
        dbUpdates.insurance_industrial = updates.insurance.industrial;
      }
      if (updates.taxDependents) {
        dbUpdates.tax_dependents = updates.taxDependents.dependents;
        dbUpdates.tax_children_under20 = updates.taxDependents.childrenUnder20;
      }
      if (updates.taxExemptOptions) {
        dbUpdates.has_own_car = updates.taxExemptOptions.hasOwnCar;
        dbUpdates.has_child_under6 = updates.taxExemptOptions.hasChildUnder6;
        dbUpdates.children_under6_count =
          updates.taxExemptOptions.childrenUnder6Count || 0;
        dbUpdates.is_researcher = updates.taxExemptOptions.isResearcher;
      }

      const { data, error } = await supabase
        .from("employees")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // 복호화된 주민번호로 로컬 상태 구성
      const decryptedRN =
        plainResidentNumber !== undefined
          ? plainResidentNumber
          : employees.find((e) => e.id === id)?.info.residentNumber || "";
      const updatedEmp = dbToLocal(data, decryptedRN);
      setEmployees((prev) => {
        const updated = prev.map((e) => (e.id === id ? updatedEmp : e));
        return updated;
      });
    },
    [supabase, employees],
  );

  // 직원 삭제
  const deleteEmployee = useCallback(
    async (id: string) => {
      if (!user) {
        setEmployees((prev) => {
          const updated = prev.filter((e) => e.id !== id);
          saveGuestEmployees(updated);
          return updated;
        });
        return;
      }

      const { error } = await supabase.from("employees").delete().eq("id", id);

      if (error) throw error;

      setEmployees((prev) => {
        const updated = prev.filter((e) => e.id !== id);
        return updated;
      });
    },
    [user, supabase],
  );

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees: loadEmployees,
  };
}
