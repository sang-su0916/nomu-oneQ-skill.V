"use client";

import Link from "next/link";
import { usePlanGate, PLAN_COLORS } from "@/hooks/usePlanGate";

export default function PlanBanner() {
  const {
    plan,
    planStatus,
    planLabel,
    daysRemaining,
    isExpired,
    isExpiringSoon,
  } = usePlanGate();

  // 등급 제한 없음 — 배너 표시 불필요
  if (planStatus === "active" || plan === "start") return null;

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-red-800 text-sm">
                {planLabel} 등급이 만료되었습니다
              </p>
              <p className="text-red-600 text-xs mt-0.5">
                일부 기능이 제한됩니다. 멤버십 코드를 입력하여 등급을
                갱신해주세요.
              </p>
            </div>
          </div>
          <Link
            href="/membership"
            className="shrink-0 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            갱신하기
          </Link>
        </div>
      </div>
    );
  }

  if (isExpiringSoon) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-bold text-yellow-800 text-sm">
                {planLabel} 등급 만료 {daysRemaining}일 전
              </p>
              <p className="text-yellow-700 text-xs mt-0.5">
                만료 전에 멤버십 코드를 입력하여 등급을 갱신해주세요.
              </p>
            </div>
          </div>
          <Link
            href="/membership"
            className="shrink-0 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
          >
            갱신하기
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
