"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { PLAN_LIMITS } from "@/types/database";
import { PLAN_COLORS } from "@/hooks/usePlanGate";

const PLAN_LABELS: Record<string, string> = {
  start: "Start",
  pro: "Pro",
  ultra: "Ultra",
};

export default function LicenseCodeInput() {
  const { company, refreshAuth } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !company) return;

    setLoading(true);
    setMessage(null);

    const trimmedCode = code.trim().toUpperCase();

    try {
      // 1. 코드 조회
      const { data: licenseCode, error: fetchError } = await supabase
        .from("license_codes")
        .select("*")
        .eq("code", trimmedCode)
        .single();

      if (fetchError || !licenseCode) {
        setMessage({ type: "error", text: "유효하지 않은 멤버십 코드입니다." });
        setLoading(false);
        return;
      }

      // 2. 이미 사용된 코드
      if (licenseCode.used_by) {
        setMessage({ type: "error", text: "이미 사용된 멤버십 코드입니다." });
        setLoading(false);
        return;
      }

      // 3. 코드 자체 만료 확인
      if (
        licenseCode.expires_at &&
        new Date(licenseCode.expires_at) < new Date()
      ) {
        setMessage({ type: "error", text: "만료된 멤버십 코드입니다." });
        setLoading(false);
        return;
      }

      // DB 호환: 이전 플랜명(starter/business) → 새 등급명(start/pro/ultra) 매핑
      const PLAN_MIGRATION: Record<string, string> = {
        starter: "start",
        business: "pro",
        free: "start",
      };
      const plan = (PLAN_MIGRATION[licenseCode.plan] ||
        licenseCode.plan) as keyof typeof PLAN_LIMITS;
      const durationDays = licenseCode.duration_days;
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + durationDays * 24 * 60 * 60 * 1000,
      );

      // 4. 코드 사용 처리
      const { error: updateCodeError } = await supabase
        .from("license_codes")
        .update({
          used_by: company.id,
          used_at: now.toISOString(),
        })
        .eq("id", licenseCode.id)
        .is("used_by", null);

      if (updateCodeError) {
        setMessage({
          type: "error",
          text: "코드 적용 중 오류가 발생했습니다.",
        });
        setLoading(false);
        return;
      }

      // 5. 회사 등급 업데이트
      const safePlan = plan in PLAN_LIMITS ? plan : "start";
      const maxEmployees =
        PLAN_LIMITS[safePlan as keyof typeof PLAN_LIMITS].maxEmployees;
      const { error: updateCompanyError } = await supabase
        .from("companies")
        .update({
          plan,
          plan_started_at: now.toISOString(),
          plan_expires_at: expiresAt.toISOString(),
          max_employees: maxEmployees === Infinity ? 99999 : maxEmployees,
        })
        .eq("id", company.id);

      if (updateCompanyError) {
        setMessage({
          type: "error",
          text: "등급 업데이트 중 오류가 발생했습니다.",
        });
        setLoading(false);
        return;
      }

      // 6. 성공
      const planLabel = PLAN_LABELS[plan] || plan;
      setMessage({
        type: "success",
        text: `🎉 ${planLabel} 등급이 활성화되었습니다! (${durationDays}일간)`,
      });
      setCode("");

      await refreshAuth();
    } catch {
      setMessage({
        type: "error",
        text: "오류가 발생했습니다. 다시 시도해주세요.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  const currentPlan = company.plan || "start";
  const currentLabel = PLAN_LABELS[currentPlan] || currentPlan;
  const colors = PLAN_COLORS[currentPlan] || PLAN_COLORS.start;

  return (
    <div
      id="membership"
      className="bg-[var(--bg-card)] rounded-2xl border-2 border-dashed border-[var(--border)] p-8 text-center"
    >
      <div className="text-3xl mb-3">🔑</div>
      <h3 className="text-lg font-bold text-[var(--text)] mb-2">
        멤버십 코드 입력
      </h3>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        전달받은 멤버십 코드를 입력하면 등급이 활성화됩니다.
      </p>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <div className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="멤버십 코드 8자리"
            maxLength={8}
            className="flex-1 px-4 py-3 border border-[var(--border)] rounded-lg text-center text-lg font-mono tracking-widest bg-[var(--bg-card)] text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || code.trim().length < 8}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "확인 중..." : "코드 적용"}
          </button>
        </div>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 현재 등급 정보 */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
        현재 등급:
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}
        >
          {currentLabel}
        </span>
        {company.plan_expires_at && (
          <span>
            · 만료:{" "}
            {new Date(company.plan_expires_at).toLocaleDateString("ko-KR")}
          </span>
        )}
      </div>
    </div>
  );
}
