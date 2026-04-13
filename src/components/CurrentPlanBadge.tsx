"use client";

import { useAuth } from "@/contexts/AuthContext";
import { PLAN_COLORS } from "@/hooks/usePlanGate";

const PLAN_LABELS: Record<string, string> = {
  start: "Start",
  pro: "Pro",
  ultra: "Ultra",
};

export default function CurrentPlanBadge({ planId }: { planId: string }) {
  const { company } = useAuth();
  if (company?.plan === planId) {
    return (
      <div className="w-full py-3 text-center text-sm font-medium text-[var(--text-muted)] border border-[var(--border)] rounded-lg">
        현재 등급
      </div>
    );
  }
  return null;
}

/** 네비게이션/대시보드에서 사용하는 등급 뱃지 */
export function MembershipBadge() {
  const { company } = useAuth();
  const plan = company?.plan || "start";
  const label = PLAN_LABELS[plan] || plan;
  const colors = PLAN_COLORS[plan] || PLAN_COLORS.start;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border}`}
    >
      {label}
    </span>
  );
}
