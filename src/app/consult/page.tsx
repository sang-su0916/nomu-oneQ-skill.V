"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanGate } from "@/hooks/usePlanGate";
import { createClient } from "@/lib/supabase/client";
import Breadcrumb from "@/components/Breadcrumb";

const CATEGORIES = [
  "해고/퇴직",
  "퇴직금 정산",
  "근로계약 변경",
  "4대보험",
  "임금체불",
  "산업재해",
  "기타",
];
const URGENCY_OPTIONS = [
  { value: "normal", label: "일반", desc: "1~2주 내 회신" },
  { value: "urgent", label: "긴급", desc: "2~3일 내 회신" },
  { value: "emergency", label: "매우긴급", desc: "즉시 연락 필요" },
];

export default function ConsultPage() {
  const { user, company } = useAuth();
  const { canUseFeature } = usePlanGate();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [contactPreference, setContactPreference] = useState("email");
  const [contactInfo, setContactInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isUltra = canUseFeature("expert_consult");

  const handleSubmit = async () => {
    if (!category || !description) {
      setError("상담 분류와 상황 설명을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/consult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          category,
          description,
          urgency,
          contactPreference,
          contactInfo,
          companyName: company?.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "요청 실패");
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "요청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl mb-4 block">🔒</span>
        <h1 className="text-xl font-bold mb-2">로그인이 필요합니다</h1>
        <p className="text-[var(--text-secondary)] mb-4">
          노무사 상담은 로그인 후 이용 가능합니다.
        </p>
        <a href="/login" className="btn btn-primary">
          로그인
        </a>
      </div>
    );
  }

  if (!isUltra) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl mb-4 block">⚖️</span>
        <h1 className="text-xl font-bold mb-2">전문가 상담 연결</h1>
        <p className="text-[var(--text-secondary)] mb-4">
          노무사 전문가 상담 연결 기능은 현재 준비 중입니다.
        </p>
        <a href="/dashboard" className="btn btn-primary">
          대시보드로 돌아가기
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl mb-4 block">✅</span>
        <h1 className="text-xl font-bold mb-2">상담 요청이 접수되었습니다</h1>
        <p className="text-[var(--text-secondary)] mb-4">
          담당 노무사가 확인 후 연락드릴 예정입니다.
          {urgency === "emergency"
            ? " (매우긴급 — 가능한 빨리 연락드리겠습니다)"
            : ""}
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setCategory("");
            setDescription("");
          }}
          className="btn btn-secondary"
        >
          추가 상담 요청
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "퇴직/전환", href: "/terminate" },
          { label: "노무사 상담" },
        ]}
      />
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        ⚖️ 노무사 상담 요청
      </h1>
      <p className="text-[var(--text-secondary)] mb-8">
        전문 노무사에게 상담을 요청합니다. 상황을 구체적으로 설명해주시면 더
        정확한 답변을 받으실 수 있습니다.
      </p>

      <div className="space-y-6">
        {/* 분류 */}
        <div className="form-section">
          <h3 className="form-section-title">📋 상담 분류 *</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  category === cat
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 상황 설명 */}
        <div className="form-section">
          <h3 className="form-section-title">📝 상황 설명 *</h3>
          <textarea
            className="input-field min-h-[150px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="현재 상황을 구체적으로 설명해주세요.&#10;&#10;예: AI 도입으로 업무량이 줄어 직원 3명을 감축해야 하는 상황입니다. 권고사직으로 진행하려 하는데, 법적으로 문제가 없는지, 퇴직금 외에 위로금은 어느 정도가 적정한지 알고 싶습니다."
          />
        </div>

        {/* 긴급도 */}
        <div className="form-section">
          <h3 className="form-section-title">🚨 긴급도</h3>
          <div className="grid grid-cols-3 gap-3">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setUrgency(opt.value)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  urgency === opt.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-[var(--bg-card)] border-[var(--border-color)] hover:border-indigo-300"
                }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p
                  className={`text-xs mt-0.5 ${urgency === opt.value ? "text-indigo-200" : "text-[var(--text-light)]"}`}
                >
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 연락처 */}
        <div className="form-section">
          <h3 className="form-section-title">📞 연락 방법</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">선호 연락 방식</label>
              <select
                className="input-field"
                value={contactPreference}
                onChange={(e) => setContactPreference(e.target.value)}
              >
                <option value="email">이메일</option>
                <option value="phone">전화</option>
                <option value="kakao">카카오톡</option>
              </select>
            </div>
            <div>
              <label className="input-label">연락처</label>
              <input
                type="text"
                className="input-field"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder={
                  contactPreference === "phone"
                    ? "010-0000-0000"
                    : contactPreference === "kakao"
                      ? "카카오톡 ID"
                      : user.email || "이메일"
                }
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !category || !description}
          className="btn btn-primary w-full disabled:opacity-50"
        >
          {submitting ? "요청 중..." : "상담 요청 보내기"}
        </button>
      </div>
    </div>
  );
}
