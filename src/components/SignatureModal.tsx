"use client";

import { useState } from "react";
import SignaturePad from "./SignaturePad";
import { DOC_TYPE_LABELS } from "@/hooks/useDocumentSave";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (signatures: { employer?: string; employee?: string }) => void;
  docType: string;
  docTitle: string;
  /** 서명 모드: single(기본) 또는 dual(사업주+근로자) */
  mode?: "single" | "dual";
  /** 서류 요약 정보 */
  summary?: { label: string; value: string }[];
}

export default function SignatureModal({
  isOpen,
  onClose,
  onComplete,
  docType,
  docTitle,
  mode = "single",
  summary = [],
}: SignatureModalProps) {
  const [step, setStep] = useState<"employer" | "employee" | "done">(
    "employer",
  );
  const [employerSig, setEmployerSig] = useState<string | null>(null);
  const [employeeSig, setEmployeeSig] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmployerSign = (dataUrl: string) => {
    setEmployerSig(dataUrl);
    if (mode === "dual") {
      setStep("employee");
    } else {
      // 단일 모드 - 바로 완료
      onComplete({ employer: dataUrl });
      resetAndClose();
    }
  };

  const handleEmployeeSign = (dataUrl: string) => {
    setEmployeeSig(dataUrl);
    onComplete({ employer: employerSig || undefined, employee: dataUrl });
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep("employer");
    setEmployerSig(null);
    setEmployeeSig(null);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) resetAndClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 모달 */}
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[var(--border)]">
        {/* 헤더 */}
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border)] p-5 rounded-t-2xl z-10">
          <button
            onClick={resetAndClose}
            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)] text-xl"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(30,58,95,0.08)] flex items-center justify-center text-lg">
              ✍️
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text)]">전자서명</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {DOC_TYPE_LABELS[docType] || docType}
              </p>
            </div>
          </div>

          {/* 듀얼 모드 스텝 인디케이터 */}
          {mode === "dual" && (
            <div className="flex items-center gap-2 mt-4">
              <div
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  step === "employer" || employerSig
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--border)]"
                }`}
              />
              <div
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  step === "employee" || employeeSig
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--border)]"
                }`}
              />
            </div>
          )}
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-5">
          {/* 서류 요약 */}
          {summary.length > 0 && (
            <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">
                📋 서류 요약
              </p>
              <h4 className="text-sm font-semibold text-[var(--text)] mb-3">
                {docTitle}
              </h4>
              <div className="space-y-1.5">
                {summary.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      {item.label}
                    </span>
                    <span className="text-[var(--text)] font-medium">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 서명 패드 */}
          {step === "employer" && (
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-[var(--text)] mb-3">
                {mode === "dual" ? "👔 사업주 서명" : "✍️ 서명"}
              </p>
              <SignaturePad
                onSave={handleEmployerSign}
                width={Math.min(
                  420,
                  typeof window !== "undefined" ? window.innerWidth - 80 : 420,
                )}
                height={200}
              />
            </div>
          )}

          {step === "employee" && mode === "dual" && (
            <div className="flex flex-col items-center">
              {/* 사업주 서명 완료 표시 */}
              {employerSig && (
                <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span className="text-xs text-green-700 font-medium">
                    사업주 서명 완료
                  </span>
                  <img
                    src={employerSig}
                    alt="사업주 서명"
                    className="ml-auto h-8 opacity-60"
                  />
                </div>
              )}
              <p className="text-sm font-medium text-[var(--text)] mb-3">
                👤 근로자 서명
              </p>
              <SignaturePad
                onSave={handleEmployeeSign}
                width={Math.min(
                  420,
                  typeof window !== "undefined" ? window.innerWidth - 80 : 420,
                )}
                height={200}
              />
            </div>
          )}

          {/* 안내 */}
          <p className="text-[10px] text-[var(--text-muted)] text-center leading-relaxed">
            전자서명은 「전자서명법」에 따라 법적 효력이 있습니다.
            <br />
            서명 완료 시 해당 서류는 수정할 수 없으며, 서명 이미지가 서류에
            포함됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
