"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PLAN_LIMITS, START_DOCUMENT_TYPES } from "@/types/database";

export type PlanStatus = "active" | "expired" | "expiring_soon" | "start";

export interface PlanGate {
  // 현재 등급 정보
  plan: "start" | "pro" | "ultra";
  planStatus: PlanStatus;
  planLabel: string;
  isPaid: boolean;

  // 만료 관련
  daysRemaining: number | null;
  expiresAt: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean; // 7일 이내

  // 기능 체크
  canAccessDocument: (docType: string) => boolean;
  canAddEmployee: (currentCount: number) => boolean;
  canUseFeature: (feature: string) => boolean;
  maxEmployees: number;

  // 제한 정보
  limits: (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS];
  startDocTypes: readonly string[];
}

const PLAN_LABELS: Record<string, string> = {
  start: "Start",
  pro: "Pro",
  ultra: "Ultra",
};

// 등급 색상 (뱃지용)
export const PLAN_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  start: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
  },
  pro: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    border: "border-indigo-300",
  },
  ultra: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-300",
  },
};

// 🎉 정식 오픈 전까지 전 기능 무료 체험 (2026년 4월 30일까지)
const BETA_END_DATE = new Date("2026-05-01T00:00:00+09:00");

function isBetaPeriod(): boolean {
  return new Date() < BETA_END_DATE;
}

export function usePlanGate(): PlanGate {
  const { company } = useAuth();

  return useMemo(() => {
    const plan = (company?.plan as "start" | "pro" | "ultra") || "start";
    const expiresAt = company?.plan_expires_at || null;
    const beta = isBetaPeriod();

    // 만료일 계산
    let daysRemaining: number | null = null;
    let isExpired = false;
    let isExpiringSoon = false;

    if (expiresAt && plan !== "start") {
      const now = new Date();
      const expDate = new Date(expiresAt);
      const diffMs = expDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining <= 0;
      isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;
    }

    // 🎉 베타 기간: 베타 종료까지 남은 일수 표시
    if (beta) {
      const betaDaysLeft = Math.ceil(
        (BETA_END_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      daysRemaining = betaDaysLeft;
      isExpired = false;
      isExpiringSoon = betaDaysLeft <= 3;
    }

    // 등급 상태 결정
    let planStatus: PlanStatus = "start";
    if (beta) {
      planStatus = "active";
    } else if (plan !== "start") {
      if (isExpired) planStatus = "expired";
      else if (isExpiringSoon) planStatus = "expiring_soon";
      else planStatus = "active";
    }

    // 모든 등급에서 전 기능 개방 (등급 제한 없음)
    const effectivePlan = plan in PLAN_LIMITS ? plan : "start";
    const limits = PLAN_LIMITS[effectivePlan];
    const isPaid = true;

    const canAccessDocument = (docType: string): boolean => {
      if (isPaid) return true;
      return (START_DOCUMENT_TYPES as readonly string[]).includes(docType);
    };

    const canAddEmployee = (currentCount: number): boolean => {
      return currentCount < limits.maxEmployees;
    };

    const canUseFeature = (feature: string): boolean => {
      return (limits.features as readonly string[]).includes(feature);
    };

    return {
      plan,
      planStatus,
      planLabel: PLAN_LABELS[plan] || plan,
      isPaid,
      daysRemaining,
      expiresAt,
      isExpired,
      isExpiringSoon,
      canAccessDocument,
      canAddEmployee,
      canUseFeature,
      maxEmployees: limits.maxEmployees,
      limits,
      startDocTypes: START_DOCUMENT_TYPES,
    };
  }, [company]);
}
