"use client";

/**
 * localStorage → Supabase 1회 마이그레이션 훅
 * 기존 localStorage에 저장된 데이터를 Supabase로 이관
 * 이관 완료 시 'nomu_migrated_to_supabase' 플래그를 세팅하여 재실행 방지
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

const MIGRATION_KEY = "nomu_migrated_to_supabase";

export function useLocalStorageMigration() {
  const { company } = useAuth();
  const migrated = useRef(false);

  useEffect(() => {
    if (!company || migrated.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(MIGRATION_KEY)) return;

    migrated.current = true;

    const run = async () => {
      const supabase = createClient();

      try {
        // 1. 급여 기록 마이그레이션
        const paymentRecordsRaw = localStorage.getItem("nomu_payment_records");
        if (paymentRecordsRaw) {
          const records = JSON.parse(paymentRecordsRaw);
          if (Array.isArray(records) && records.length > 0) {
            const inserts = records.map((r: Record<string, unknown>) => ({
              company_id: company.id,
              employee_id: r.employeeId as string,
              year: r.year as number,
              month: r.month as number,
              payment_date: (r.paymentDate as string) || null,
              earnings: r.earnings || {},
              deductions: r.deductions || {},
              total_earnings:
                (r.summary as Record<string, number>)?.totalEarnings || 0,
              total_taxable:
                (r.summary as Record<string, number>)?.totalTaxable || 0,
              total_non_taxable:
                (r.summary as Record<string, number>)?.totalNonTaxable || 0,
              total_deductions:
                (r.summary as Record<string, number>)?.totalDeductions || 0,
              net_pay: (r.summary as Record<string, number>)?.netPay || 0,
              status: (r.status as string) || "paid",
              paid_at: (r.paidAt as string) || null,
            }));

            // upsert to avoid duplicates on employee_id+year+month
            await supabase
              .from("payment_records")
              .upsert(inserts, { onConflict: "employee_id,year,month" });
          }
        }

        // 마이그레이션 완료 플래그
        localStorage.setItem(MIGRATION_KEY, new Date().toISOString());

        // 이관 완료 후 localStorage 정리
        localStorage.removeItem("nomu_company_info");
        localStorage.removeItem("nomu_employees");
        localStorage.removeItem("nomu_payment_records");
        localStorage.removeItem("nomu_contracts");

        console.log("[Migration] localStorage → Supabase 마이그레이션 완료");
      } catch (err) {
        console.error("[Migration] 마이그레이션 실패:", err);
      }
    };

    run();
  }, [company]);
}
