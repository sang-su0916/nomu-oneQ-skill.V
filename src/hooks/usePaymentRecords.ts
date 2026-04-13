"use client";

/**
 * 급여 지급 기록 관리 훅
 * localStorage addPaymentRecord/getPaymentRecordsByMonth 대체
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import type { PaymentRecord } from "@/types";
import type { DbPaymentRecord } from "@/types/database";

// DbPaymentRecord → PaymentRecord (localStorage 형식) 변환
function dbToLocal(r: DbPaymentRecord): PaymentRecord {
  const earnings = (r.earnings as Record<string, unknown>) || {};
  const deductions = (r.deductions as Record<string, unknown>) || {};
  return {
    id: r.id,
    employeeId: r.employee_id,
    year: r.year,
    month: r.month,
    paymentDate: r.payment_date || "",
    earnings: {
      baseSalary: (earnings.baseSalary as number) || 0,
      overtime: (earnings.overtime as number) || 0,
      nightWork: (earnings.nightWork as number) || 0,
      holidayWork: (earnings.holidayWork as number) || 0,
      bonus: (earnings.bonus as number) || 0,
      mealAllowance: (earnings.mealAllowance as number) || 0,
      carAllowance: (earnings.carAllowance as number) || 0,
      childcareAllowance: (earnings.childcareAllowance as number) || 0,
      researchAllowance: (earnings.researchAllowance as number) || 0,
      otherAllowances:
        (earnings.otherAllowances as {
          name: string;
          amount: number;
          taxable: boolean;
        }[]) || [],
    },
    deductions: {
      nationalPension: (deductions.nationalPension as number) || 0,
      healthInsurance: (deductions.healthInsurance as number) || 0,
      longTermCare: (deductions.longTermCare as number) || 0,
      employmentInsurance: (deductions.employmentInsurance as number) || 0,
      incomeTax: (deductions.incomeTax as number) || 0,
      localTax: (deductions.localTax as number) || 0,
      otherDeductions:
        (deductions.otherDeductions as { name: string; amount: number }[]) ||
        [],
    },
    summary: {
      totalEarnings: r.total_earnings,
      totalTaxable: r.total_taxable,
      totalNonTaxable: r.total_non_taxable,
      totalDeductions: r.total_deductions,
      netPay: r.net_pay,
    },
    status: r.status,
    paidAt: r.paid_at || undefined,
    createdAt: r.created_at,
  };
}

export function usePaymentRecords() {
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // 급여 기록 추가
  const addPaymentRecord = useCallback(
    async (record: PaymentRecord) => {
      if (!company) throw new Error("사업장 정보가 없습니다.");

      setSaving(true);
      try {
        const { error } = await supabase.from("payment_records").insert({
          company_id: company.id,
          employee_id: record.employeeId,
          year: record.year,
          month: record.month,
          payment_date: record.paymentDate || null,
          earnings: record.earnings,
          deductions: record.deductions,
          total_earnings: record.summary.totalEarnings,
          total_taxable: record.summary.totalTaxable,
          total_non_taxable: record.summary.totalNonTaxable,
          total_deductions: record.summary.totalDeductions,
          net_pay: record.summary.netPay,
          status: record.status,
          paid_at: record.paidAt || null,
        });

        if (error) throw error;
      } finally {
        setSaving(false);
      }
    },
    [company, supabase],
  );

  // 월별 급여 기록 조회
  const getPaymentRecordsByMonth = useCallback(
    async (year: number, month: number): Promise<PaymentRecord[]> => {
      if (!company) return [];

      const { data, error } = await supabase
        .from("payment_records")
        .select("*")
        .eq("company_id", company.id)
        .eq("year", year)
        .eq("month", month)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(dbToLocal);
    },
    [company, supabase],
  );

  // 직원별 급여 기록 조회
  const getPaymentRecordsByEmployee = useCallback(
    async (employeeId: string): Promise<PaymentRecord[]> => {
      if (!company) return [];

      const { data, error } = await supabase
        .from("payment_records")
        .select("*")
        .eq("company_id", company.id)
        .eq("employee_id", employeeId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;
      return (data || []).map(dbToLocal);
    },
    [company, supabase],
  );

  return {
    addPaymentRecord,
    getPaymentRecordsByMonth,
    getPaymentRecordsByEmployee,
    saving,
  };
}
