"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const PLAN_NAMES: Record<string, string> = {};

function ContactContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "";
  const planName = PLAN_NAMES[plan] || "서비스";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">📞</div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          멤버십 문의
        </h1>
        {plan && (
          <div className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-white rounded-full text-sm font-medium mb-3">
            서비스 문의
          </div>
        )}
        <p className="text-[var(--text-muted)] text-sm">
          아래 연락처로 문의주시면 빠르게 안내해 드리겠습니다.
        </p>
      </div>

      <div className="space-y-4">
        {/* 전화 */}
        <a
          href="tel:010-3709-5785"
          className="flex items-center gap-4 p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)] transition-colors"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
            📱
          </div>
          <div>
            <p className="font-semibold text-[var(--text)]">전화 문의</p>
            <p className="text-[var(--primary)] font-bold text-lg">
              010-3709-5785
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              평일 09:00 ~ 18:00
            </p>
          </div>
        </a>

        {/* 이메일 */}
        <a
          href={`mailto:sangsu0916@gmail.com?subject=[노무원큐] ${planName} 문의`}
          className="flex items-center gap-4 p-5 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)] transition-colors"
        >
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
            ✉️
          </div>
          <div>
            <p className="font-semibold text-[var(--text)]">이메일 문의</p>
            <p className="text-[var(--primary)] font-bold">
              sangsu0916@gmail.com
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              24시간 접수, 1영업일 이내 답변
            </p>
          </div>
        </a>

        {/* 멤버십 코드 */}
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl">
          <p className="font-semibold text-blue-800 mb-1">
            🔑 이미 멤버십 코드가 있으신가요?
          </p>
          <p className="text-sm text-blue-700 mb-3">
            멤버십 페이지에서 바로 입력하고 즉시 활성화하세요.
          </p>
          <Link
            href="/membership#membership"
            className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            멤버십 코드 입력하기 →
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/membership"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)]"
        >
          ← 멤버십으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ContactContent />
    </Suspense>
  );
}
