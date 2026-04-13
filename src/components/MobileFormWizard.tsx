"use client";

import React, { useState, useEffect, ReactNode, useCallback } from "react";

interface WizardStep {
  title: string;
  icon: string;
  content: ReactNode;
  /** 이 스텝의 유효성 검증 함수. false 반환 시 다음으로 진행 불가 */
  validate?: () => boolean;
  /** 검증 실패 시 표시할 메시지 */
  validationMessage?: string;
  /** 도움말 텍스트 (토글로 펼침) */
  helpText?: string;
  /** 요약 데이터 (이전 스텝 요약 카드에 표시) */
  summary?: { label: string; value: string }[];
  /** 조건부 표시. false 반환 시 스텝 자동 스킵. 미지정 시 항상 표시 */
  visible?: () => boolean;
}

interface MobileFormWizardProps {
  steps: WizardStep[];
  onComplete?: () => void;
  completeLabel?: string;
}

/**
 * 모바일에서만 단계별 위저드로 표시하는 폼 래퍼.
 * - 데스크톱(md 이상): 모든 섹션 한번에 표시 (기존과 동일)
 * - 모바일: 한 번에 하나의 섹션만 표시 + 이전/다음 버튼
 *
 * 기능:
 * - ① 단계별 유효성 검증 (validate 콜백)
 * - ④ 프로그레스 바
 * - ⑤ 조건 분기 (visible 콜백)
 * - ⑥ 이전 스텝 요약 카드
 * - ⑧ 도움말 토글
 */
export default function MobileFormWizard({
  steps,
  onComplete,
  completeLabel = "미리보기",
}: MobileFormWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [shakeStep, setShakeStep] = useState(false);

  // ⑤ 조건 분기: visible 필터링된 스텝 목록
  const visibleSteps = steps.filter((s) => !s.visible || s.visible());

  // currentStepIndex가 visibleSteps 범위를 벗어나면 보정
  const safeIndex = Math.min(currentStepIndex, visibleSteps.length - 1);
  useEffect(() => {
    if (safeIndex !== currentStepIndex) {
      setCurrentStepIndex(safeIndex);
    }
  }, [safeIndex, currentStepIndex]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 스텝 변경 시 에러/도움말 초기화
  useEffect(() => {
    setValidationError(null);
    setShowHelp(false);
  }, [currentStepIndex]);

  const tryGoNext = useCallback(() => {
    const step = visibleSteps[safeIndex];
    if (step.validate && !step.validate()) {
      setValidationError(step.validationMessage || "필수 항목을 입력해주세요.");
      setShakeStep(true);
      setTimeout(() => setShakeStep(false), 500);
      return;
    }
    setValidationError(null);
    setCurrentStepIndex(Math.min(visibleSteps.length - 1, safeIndex + 1));
  }, [safeIndex, visibleSteps]);

  const tryComplete = useCallback(() => {
    const step = visibleSteps[safeIndex];
    if (step.validate && !step.validate()) {
      setValidationError(step.validationMessage || "필수 항목을 입력해주세요.");
      setShakeStep(true);
      setTimeout(() => setShakeStep(false), 500);
      return;
    }
    setValidationError(null);
    onComplete?.();
  }, [safeIndex, visibleSteps, onComplete]);

  // 데스크톱: 탭 기반 스텝 UI
  if (!isMobile) {
    const desktopStep = visibleSteps[safeIndex];
    const isDesktopLast = safeIndex === visibleSteps.length - 1;
    const desktopProgress = Math.round(
      ((safeIndex + 1) / visibleSteps.length) * 100,
    );

    return (
      <div className="space-y-4">
        {/* 프로그레스 바 */}
        <div className="w-full h-1.5 bg-[var(--border-light)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--primary)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${desktopProgress}%` }}
          />
        </div>

        {/* 탭 바 */}
        <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto pb-0">
          {visibleSteps.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                if (i <= safeIndex) {
                  setCurrentStepIndex(i);
                } else if (i === safeIndex + 1) {
                  tryGoNext();
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                i === safeIndex
                  ? "border-[var(--primary)] text-[var(--primary)] font-semibold"
                  : i < safeIndex
                    ? "border-transparent text-green-600 hover:text-green-700 hover:bg-green-50"
                    : "border-transparent text-[var(--text-muted)] cursor-default"
              }`}
            >
              <span className="text-base">{i < safeIndex ? "✓" : s.icon}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* 검증 에러 */}
        {validationError && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-2">
            <span className="text-red-500 text-sm">⚠️</span>
            <span className="text-sm text-red-600 font-medium">
              {validationError}
            </span>
          </div>
        )}

        {/* 스텝 콘텐츠 */}
        <div className="min-h-[300px]">{desktopStep.content}</div>

        {/* 하단 네비게이션 */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => setCurrentStepIndex(Math.max(0, safeIndex - 1))}
            disabled={safeIndex === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] font-medium disabled:opacity-30 hover:bg-[var(--bg)] transition-all"
          >
            ← 이전
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            {safeIndex + 1} / {visibleSteps.length}
          </span>
          {isDesktopLast ? (
            <button
              onClick={tryComplete}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold hover:opacity-90 transition-opacity"
            >
              {completeLabel}
            </button>
          ) : (
            <button
              onClick={tryGoNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              다음 →
            </button>
          )}
        </div>
      </div>
    );
  }

  // 모바일: 위저드 모드
  const step = visibleSteps[safeIndex];
  const isLast = safeIndex === visibleSteps.length - 1;
  const progressPercent = Math.round(
    ((safeIndex + 1) / visibleSteps.length) * 100,
  );

  // 이전 스텝들의 요약 데이터 수집
  const previousSummaries: { label: string; value: string }[] = [];
  for (let i = 0; i < safeIndex; i++) {
    if (visibleSteps[i].summary) {
      previousSummaries.push(
        ...visibleSteps[i].summary!.filter((s) => s.value && s.value !== "-"),
      );
    }
  }

  return (
    <div>
      {/* ④ 프로그레스 바 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            진행률
          </span>
          <span className="text-xs font-bold text-[var(--primary)]">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-[var(--border-light)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--primary)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
        {visibleSteps.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              if (i <= safeIndex) {
                setCurrentStepIndex(i);
              } else if (i === safeIndex + 1) {
                tryGoNext();
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              i === safeIndex
                ? "bg-[var(--primary)] text-white font-bold"
                : i < safeIndex
                  ? "bg-green-100 text-green-700"
                  : "bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]"
            }`}
          >
            <span>{i < safeIndex ? "✓" : s.icon}</span>
            <span className={i === safeIndex ? "" : "hidden"}>{s.title}</span>
          </button>
        ))}
      </div>

      {/* 현재 섹션 헤더 + 도움말 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{step.icon}</span>
          <span className="text-sm font-bold text-[var(--text)]">
            {safeIndex + 1}/{visibleSteps.length} {step.title}
          </span>
        </div>
        {step.helpText && (
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            {showHelp ? "닫기" : "도움말"}
          </button>
        )}
      </div>

      {/* ⑧ 도움말 영역 */}
      {showHelp && step.helpText && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-700 leading-relaxed">
          {step.helpText}
        </div>
      )}

      {/* ⑥ 이전 스텝 요약 카드 */}
      {previousSummaries.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs font-medium text-green-700 mb-1">입력 요약</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {previousSummaries.map((item, i) => (
              <span key={i} className="text-xs text-green-600">
                {item.label}: <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ① 검증 에러 메시지 */}
      {validationError && (
        <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-2">
          <span className="text-red-500 text-sm">⚠️</span>
          <span className="text-xs text-red-600 font-medium">
            {validationError}
          </span>
        </div>
      )}

      {/* 섹션 내용 */}
      <div className={`min-h-[40vh] ${shakeStep ? "animate-shake" : ""}`}>
        {step.content}
      </div>

      {/* 이전/다음 버튼 */}
      <div className="flex gap-3 mt-6 sticky bottom-16 bg-[var(--bg-card)] py-3 border-t border-[var(--border)] -mx-4 px-4">
        <button
          onClick={() => setCurrentStepIndex(Math.max(0, safeIndex - 1))}
          disabled={safeIndex === 0}
          className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--text)] font-medium disabled:opacity-30 transition-opacity"
        >
          ← 이전
        </button>
        {isLast ? (
          <button
            onClick={tryComplete}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-bold hover:opacity-90 transition-opacity"
          >
            {completeLabel}
          </button>
        ) : (
          <button
            onClick={tryGoNext}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            다음 →
          </button>
        )}
      </div>

      {/* shake 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-6px);
          }
          40% {
            transform: translateX(6px);
          }
          60% {
            transform: translateX(-4px);
          }
          80% {
            transform: translateX(4px);
          }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export type { WizardStep };
