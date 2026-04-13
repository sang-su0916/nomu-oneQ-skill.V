"use client";

import { useState } from "react";
import Link from "next/link";
import {
  terminationWorkflows,
  type TerminationType,
  type TerminationTypeInfo,
} from "@/lib/data/termination-workflows";
import Breadcrumb from "@/components/Breadcrumb";

// 각 스텝을 별도 컴포넌트로 분리 (Hooks 규칙 준수)
function StepCard({
  step,
  idx,
  isDone,
  onToggle,
}: {
  step: {
    id: string;
    title: string;
    description: string;
    legalBasis?: string;
    caution?: string;
    documentLink?: string;
    documentLabel?: string;
  };
  idx: number;
  isDone: boolean;
  onToggle: () => void;
}) {
  const [showLegal, setShowLegal] = useState(false);

  return (
    <div className="relative pl-12 pb-8">
      <button
        onClick={onToggle}
        className={`absolute left-0 top-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all z-10 ${
          isDone
            ? "bg-green-500 border-green-500 text-white"
            : "bg-[var(--bg-card)] border-gray-300 text-[var(--text-secondary)] hover:border-indigo-400"
        }`}
      >
        {isDone ? "✓" : idx + 1}
      </button>

      <div
        className={`p-4 rounded-xl border transition-all ${
          isDone
            ? "bg-green-50 border-green-200"
            : "bg-[var(--bg-card)] border-[var(--border-color)]"
        }`}
      >
        <h3
          className={`font-semibold mb-1 ${isDone ? "text-green-700 line-through" : "text-[var(--text-primary)]"}`}
        >
          {step.title}
        </h3>
        <p
          className={`text-sm mb-3 ${isDone ? "text-green-600" : "text-[var(--text-secondary)]"}`}
        >
          {step.description}
        </p>

        {step.legalBasis && (
          <div className="mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLegal(!showLegal);
              }}
              className="text-xs text-indigo-500 hover:text-indigo-700"
            >
              {showLegal ? "▼" : "▶"} 법적 근거
            </button>
            {showLegal && (
              <p className="mt-1 text-xs text-indigo-700 bg-indigo-50 rounded p-2">
                {step.legalBasis}
              </p>
            )}
          </div>
        )}

        {step.caution && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mb-3">
            ⚠️ {step.caution}
          </p>
        )}

        {step.documentLink && (
          <Link
            href={step.documentLink}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg px-3 py-1.5"
          >
            📄 {step.documentLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

function getStorageKey(type: TerminationType) {
  return `nomu_terminate_progress_${type}`;
}

function loadProgress(type: TerminationType): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const saved = localStorage.getItem(getStorageKey(type));
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
}

function saveProgress(type: TerminationType, completed: Set<string>) {
  localStorage.setItem(getStorageKey(type), JSON.stringify([...completed]));
}

export default function TerminateWorkflowPage() {
  const [selectedType, setSelectedType] = useState<TerminationType | null>(
    null,
  );
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const handleSelectType = (type: TerminationType) => {
    setSelectedType(type);
    setCompleted(loadProgress(type));
  };

  const toggleStep = (stepId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      if (selectedType) saveProgress(selectedType, next);
      return next;
    });
  };

  const handleReset = () => {
    if (selectedType) {
      localStorage.removeItem(getStorageKey(selectedType));
      setCompleted(new Set());
    }
  };

  const workflow = selectedType
    ? terminationWorkflows.find((w) => w.type === selectedType)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "퇴직/전환", href: "/terminate" },
          { label: "퇴직 처리 가이드" },
        ]}
      />
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        퇴직 처리 워크플로우
      </h1>
      <p className="text-[var(--text-secondary)] mb-8">
        퇴직 유형을 선택하면 단계별 처리 절차와 필요 서류를 안내합니다.
      </p>

      {!selectedType ? (
        /* 유형 선택 */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {terminationWorkflows.map((w) => (
            <button
              key={w.type}
              onClick={() => handleSelectType(w.type)}
              className="text-left p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <span className="text-3xl mb-3 block">{w.icon}</span>
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                {w.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {w.description}
              </p>
              <p className="text-xs text-indigo-500 mt-3">
                {w.steps.length}단계 →
              </p>
            </button>
          ))}
        </div>
      ) : workflow ? (
        /* 워크플로우 체크리스트 */
        <div>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedType(null)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              ← 다른 유형 선택
            </button>
            <button
              onClick={handleReset}
              className="text-xs text-[var(--text-light)] hover:text-red-500"
            >
              초기화
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{workflow.icon}</span>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {workflow.title}
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {workflow.description}
          </p>

          {/* 진행률 */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500 rounded-full"
                style={{
                  width: `${(completed.size / workflow.steps.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap">
              {completed.size}/{workflow.steps.length}
            </span>
          </div>

          {/* 타임라인 */}
          <div className="relative">
            {/* 수직 라인 */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-0">
              {workflow.steps.map((step, idx) => (
                <StepCard
                  key={step.id}
                  step={step}
                  idx={idx}
                  isDone={completed.has(step.id)}
                  onToggle={() => toggleStep(step.id)}
                />
              ))}
            </div>
          </div>

          {/* 완료 메시지 */}
          {completed.size === workflow.steps.length && (
            <div className="mt-4 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
              <span className="text-3xl mb-2 block">🎉</span>
              <p className="font-semibold text-green-800">
                모든 단계를 완료했습니다!
              </p>
              <p className="text-sm text-green-600 mt-1">
                퇴직 처리가 정상적으로 진행되었습니다.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
