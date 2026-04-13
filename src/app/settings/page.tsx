"use client";

import { useState, useEffect, useCallback } from "react";
import HelpGuide from "@/components/HelpGuide";
import { CompanyInfo } from "@/types";
import { formatBusinessNumber, formatPhoneNumber } from "@/lib/storage";
import { defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/ToastContext";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  role: string;
  isMe: boolean;
  createdAt: string;
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  invite_code: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function SettingsPage() {
  const { company, membership, refreshAuth, loading: authLoading } = useAuth();
  const supabase = createClient();
  const toast = useToast();

  const [localCompany, setLocalCompany] =
    useState<CompanyInfo>(defaultCompanyInfo);
  const [annualLeaveBase, setAnnualLeaveBase] = useState<
    "hire_date" | "fiscal_year"
  >("hire_date");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // 팀 관리
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [myRole, setMyRole] = useState("viewer");
  const [maxMembers, setMaxMembers] = useState(3);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    type: "success" | "error";
    text: string;
    code?: string;
  } | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setInvites(data.invites || []);
        setMyRole(data.myRole || "viewer");
        setMaxMembers(data.maxMembers || 3);
      }
    } catch {
      /* ignore */
    }
    setTeamLoading(false);
  }, []);

  useEffect(() => {
    if (company) loadTeam();
  }, [company, loadTeam]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteResult({ type: "error", text: data.error });
      } else {
        setInviteResult({
          type: "success",
          text: "초대가 생성되었습니다!",
          code: data.inviteCode,
        });
        setInviteEmail("");
        await loadTeam();
      }
    } catch {
      setInviteResult({ type: "error", text: "오류가 발생했습니다." });
    }
    setInviting(false);
  };

  const handleRemove = async (type: "member" | "invite", id: string) => {
    if (
      !confirm(
        type === "member"
          ? "이 멤버를 제거하시겠습니까?"
          : "초대를 취소하시겠습니까?",
      )
    )
      return;
    try {
      await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      await loadTeam();
    } catch {
      /* ignore */
    }
  };

  // Supabase 회사 정보 → 폼에 로드
  useEffect(() => {
    if (company) {
      setLocalCompany({
        name: company.name,
        ceoName: company.ceo_name,
        businessNumber: company.business_number,
        address: company.address || "",
        phone: company.phone || "",
      });
      setAnnualLeaveBase(company.annual_leave_base || "hire_date");
    }
  }, [company]);

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setLocalCompany((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: localCompany.name,
          ceo_name: localCompany.ceoName,
          business_number: localCompany.businessNumber.replace(/[^0-9]/g, ""),
          address: localCompany.address || null,
          phone: localCompany.phone || null,
          annual_leave_base: annualLeaveBase,
        })
        .eq("id", company.id);

      if (error) throw error;

      await refreshAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(
        "저장에 실패했습니다: " +
          (err instanceof Error ? err.message : "알 수 없는 오류"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessNumberChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 10);
    handleChange("businessNumber", cleaned);
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 11);
    handleChange("phone", cleaned);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">⚙️ 설정</h1>
      <p className="text-[var(--text-muted)] mb-8">
        회사 정보를 입력하면 모든 서류에 자동으로 반영됩니다.
      </p>

      <HelpGuide
        pageKey="settings"
        steps={[
          "여기서 입력한 회사 정보(상호, 대표자, 사업자번호)가 모든 서류에 자동으로 들어갑니다.",
          "처음 한 번만 입력하면 됩니다. 변경 시에만 다시 수정하세요.",
          "연차 기산 방식(입사일/회계연도)도 여기서 설정할 수 있어요.",
        ]}
      />

      <div className="form-section">
        <h2 className="form-section-title">🏢 회사 정보</h2>

        <div className="space-y-4">
          <div>
            <label className="input-label">상호 (회사명)</label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 주식회사 노무원큐"
              value={localCompany.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">대표자명</label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 홍길동"
              value={localCompany.ceoName}
              onChange={(e) => handleChange("ceoName", e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">사업자등록번호</label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 123-45-67890"
              value={formatBusinessNumber(localCompany.businessNumber)}
              onChange={(e) => handleBusinessNumberChange(e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">사업장 주소</label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 서울시 강남구 테헤란로 123, 4층"
              value={localCompany.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">대표 전화번호</label>
            <input
              type="text"
              className="input-field"
              placeholder="예: 02-1234-5678"
              value={formatPhoneNumber(localCompany.phone)}
              onChange={(e) => handlePhoneChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? "저장 중..." : "💾 저장하기"}
        </button>
        {saved && (
          <span className="text-emerald-600 font-medium animate-pulse">
            ✓ 저장되었습니다!
          </span>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-blue-800 text-sm">
          <strong>☁️ 안내:</strong> 데이터는 클라우드에 안전하게 저장됩니다.
          어디서든 로그인하면 동일한 데이터를 이용할 수 있습니다.
        </p>
      </div>

      {/* 연차 기산 기준 */}
      {company && (
        <div className="form-section mt-8">
          <h2 className="form-section-title">🏖️ 연차 기산 기준</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            근로기준법 제60조에 따른 연차유급휴가 산정 기준을 선택합니다.
          </p>
          <div className="space-y-3">
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${annualLeaveBase === "hire_date" ? "border-[var(--primary)] bg-blue-50" : "border-[var(--border)] hover:border-[var(--border)]"}`}
            >
              <input
                type="radio"
                name="annualLeaveBase"
                value="hire_date"
                checked={annualLeaveBase === "hire_date"}
                onChange={() => {
                  setAnnualLeaveBase("hire_date");
                  setSaved(false);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-[var(--text)]">입사일 기준</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  각 근로자의 입사일을 기준으로 1년 단위로 연차를 산정합니다.
                  <br />
                  예: 2024.03.15 입사 → 2024.03.15~2025.03.14 (1년차),
                  2025.03.15~2026.03.14 (2년차)
                </p>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${annualLeaveBase === "fiscal_year" ? "border-[var(--primary)] bg-blue-50" : "border-[var(--border)] hover:border-[var(--border)]"}`}
            >
              <input
                type="radio"
                name="annualLeaveBase"
                value="fiscal_year"
                checked={annualLeaveBase === "fiscal_year"}
                onChange={() => {
                  setAnnualLeaveBase("fiscal_year");
                  setSaved(false);
                }}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-[var(--text)]">
                  회계연도 기준 (1/1~12/31)
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  매년 1월 1일~12월 31일을 기준으로 연차를 산정합니다.
                  <br />
                  입사 첫해는 월할 계산, 2차년도는 비례배분 적용.
                  <br />※ 고용노동부 행정해석: 입사일 기준보다 불리하게 적용
                  불가 (유리한 조건 자동 적용)
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* 현재 멤버십 등급 */}
      {company && (
        <div className="form-section mt-8">
          <h2 className="form-section-title">💎 멤버십 등급</h2>
          <div className="flex items-center justify-between p-4 bg-[var(--bg)] rounded-lg">
            <div>
              <p className="font-medium text-[var(--text)]">
                {company.plan === "start"
                  ? "Start"
                  : company.plan === "pro"
                    ? "Pro"
                    : "Ultra"}{" "}
                등급
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                최대 직원{" "}
                {company.max_employees === 999999 ||
                company.max_employees === 99999
                  ? "무제한"
                  : `${company.max_employees}명`}
              </p>
            </div>
            {company.plan === "start" && (
              <a
                href="/settings#membership"
                className="text-sm text-[var(--primary)] font-medium hover:underline"
              >
                코드 입력 →
              </a>
            )}
          </div>
        </div>
      )}

      {/* 팀 관리 */}
      {company && (
        <div className="form-section mt-8">
          <h2 className="form-section-title">👥 팀 관리</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            사업장 멤버를 초대하고 관리합니다. (최대 {maxMembers}명)
          </p>

          {/* 현재 멤버 목록 */}
          {teamLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">
                      {m.email[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">
                        {m.email}{" "}
                        {m.isMe && (
                          <span className="text-xs text-[var(--text-muted)]">
                            (나)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {m.role === "admin"
                          ? "관리자"
                          : m.role === "manager"
                            ? "담당자"
                            : "열람자"}
                      </p>
                    </div>
                  </div>
                  {myRole === "admin" && !m.isMe && (
                    <button
                      onClick={() => handleRemove("member", m.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                    >
                      제거
                    </button>
                  )}
                </div>
              ))}

              {/* 대기 중인 초대 */}
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"
                >
                  <div>
                    <p className="text-sm text-[var(--text)]">
                      {inv.email}
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        초대 대기
                      </span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      코드:{" "}
                      <span className="font-mono font-bold">
                        {inv.invite_code}
                      </span>
                      {" · "}
                      {inv.role === "manager" ? "담당자" : "열람자"}
                      {" · "}만료:{" "}
                      {new Date(inv.expires_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {myRole === "admin" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inv.invite_code);
                          toast.success("초대 코드가 복사되었습니다!");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                      >
                        복사
                      </button>
                      <button
                        onClick={() => handleRemove("invite", inv.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 초대 폼 (admin만) */}
          {myRole === "admin" &&
            members.length + invites.length < maxMembers && (
              <div className="border border-[var(--border)] rounded-lg p-4">
                <h3 className="text-sm font-medium text-[var(--text)] mb-3">
                  멤버 초대
                </h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="초대할 이메일"
                    className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)]"
                  >
                    <option value="manager">담당자</option>
                    <option value="viewer">열람자</option>
                  </select>
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {inviting ? "..." : "초대"}
                  </button>
                </div>
                {inviteResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-sm ${
                      inviteResult.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {inviteResult.text}
                    {inviteResult.code && (
                      <div className="mt-2">
                        <span className="text-xs">초대 코드: </span>
                        <span className="font-mono font-bold text-base tracking-wider">
                          {inviteResult.code}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inviteResult.code!);
                            toast.success("복사됨!");
                          }}
                          className="ml-2 text-xs underline"
                        >
                          복사
                        </button>
                        <p className="text-xs mt-1">
                          이 코드를 초대받는 분에게 전달해주세요. (7일간 유효)
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {members.length + invites.length}/{maxMembers}명 사용 중
                </p>
              </div>
            )}

          {myRole === "admin" &&
            members.length + invites.length >= maxMembers && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                최대 인원({maxMembers}명)에 도달했습니다.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
