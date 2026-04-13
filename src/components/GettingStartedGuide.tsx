"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GettingStartedProps {
  employeeCount: number;
  documentCount: number;
  hasPayslip?: boolean;
}

const STORAGE_KEY = "nomu_getting_started_dismissed";

export default function GettingStartedGuide({
  employeeCount,
  documentCount,
  hasPayslip,
}: GettingStartedProps) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setDismissed(saved === "true");
  }, []);

  const steps = [
    {
      label: "직원 등록",
      desc: "직원을 등록하면 계약서·급여명세서에 자동 연동됩니다",
      actionDesc: "직원 관리 메뉴에서 이름, 입사일, 급여만 입력하면 됩니다.",
      done: employeeCount > 0,
      href: "/employees",
      icon: "👥",
      btnLabel: "직원 등록하러 가기",
    },
    {
      label: "첫 계약서 작성",
      desc: "정규직·파트타임·프리랜서 계약서를 작성하세요",
      actionDesc: "등록한 직원을 선택하면 정보가 자동으로 채워집니다.",
      done: documentCount > 0,
      href: "/contract/fulltime",
      icon: "📋",
      btnLabel: "계약서 작성하러 가기",
    },
    {
      label: "급여명세서 발급",
      desc: "4대보험·세금이 자동 계산된 급여명세서를 발급하세요",
      actionDesc: "직원 선택 후 기본급만 입력하면 공제 항목이 자동 계산됩니다.",
      done: !!hasPayslip,
      href: "/payslip",
      icon: "💵",
      btnLabel: "급여명세서 만들러 가기",
    },
  ];

  const allDone = steps.every((s) => s.done);
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);

  if (dismissed === null || dismissed) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <h2 className="text-base font-bold text-[var(--text)]">
            노무원큐 시작하기
          </h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {allDone ? "완료!" : `${doneCount}/3`}
          </span>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "true");
            setDismissed(true);
          }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] px-2 py-1"
        >
          닫기
        </button>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full bg-white/60 rounded-full h-2 mb-5">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-indigo-500"}`}
          style={{ width: `${(doneCount / 3) * 100}%` }}
        />
      </div>

      {/* 스텝 목록 */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const isCurrent = !step.done && step === nextStep;
          return (
            <div
              key={i}
              className={`rounded-lg transition-all ${
                step.done
                  ? "bg-white/50 p-3"
                  : isCurrent
                    ? "bg-white border border-indigo-300 shadow-sm p-4"
                    : "bg-white/30 p-3 opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    step.done
                      ? "bg-green-100 text-green-600"
                      : isCurrent
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {step.done ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.done
                        ? "text-green-600 line-through"
                        : isCurrent
                          ? "text-[var(--text)]"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {step.desc}
                  </p>
                </div>
                {step.done && (
                  <span className="text-xs text-green-600 font-medium shrink-0">
                    완료
                  </span>
                )}
              </div>

              {/* 현재 단계만 액션 버튼 표시 */}
              {isCurrent && (
                <div className="mt-3 ml-11">
                  <p className="text-xs text-indigo-600 mb-2">
                    {step.actionDesc}
                  </p>
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    {step.btnLabel}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 사용법 가이드 링크 */}
      <div className="mt-4 flex items-center gap-3">
        <Link
          href="/guide#quickstart"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 border border-indigo-200 rounded-lg text-xs text-indigo-700 hover:bg-white hover:border-indigo-400 transition-colors"
        >
          📖 초보 사장님 사용법 보기
        </Link>
        <Link
          href="/guide"
          className="text-xs text-[var(--text-muted)] hover:text-indigo-600 hover:underline"
        >
          전체 가이드 →
        </Link>
      </div>

      {allDone && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg text-center border border-green-200">
          <p className="text-sm text-green-700 font-medium">
            기본 설정을 모두 완료했습니다!
          </p>
          <p className="text-xs text-green-600 mt-1">
            이제 서류 작성, 계산기 등 모든 기능을 자유롭게 사용하세요.
          </p>
          <button
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "true");
              setDismissed(true);
            }}
            className="mt-2 text-xs text-[var(--text-muted)] hover:underline"
          >
            이 가이드 다시 안 보기
          </button>
        </div>
      )}
    </div>
  );
}
