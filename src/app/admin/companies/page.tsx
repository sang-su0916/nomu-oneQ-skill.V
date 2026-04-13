"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface AdminCompany {
  id: string;
  name: string;
  ceoName: string;
  businessNumber: string;
  plan: string;
  planExpiresAt: string | null;
  memberCount: number;
  employeeCount: number;
  totalEmployees: number;
  documentCount: number;
  createdAt: string;
}

export default function AdminCompaniesPage() {
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("start");
  const router = useRouter();

  const fetchCompanies = useCallback(async (q = "") => {
    const res = await fetch(
      `/api/admin/companies?search=${encodeURIComponent(q)}`,
    );
    if (res.status === 403) {
      setError("관리자 권한이 필요합니다.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("데이터 로딩 실패");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCompanies(data.companies);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchCompanies();
  }, [user, authLoading, fetchCompanies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchCompanies(search);
  };

  const handlePlanChange = async (companyId: string) => {
    await fetch("/api/admin/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, plan: editPlan }),
    });
    setEditingId(null);
    fetchCompanies(search);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatBizNum = (n: string) => {
    if (!n || n.length !== 10) return n;
    return `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}`;
  };

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  if (error)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-[var(--text)]">{error}</h2>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            🏢 사업장 관리
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            전체 {companies.length}개
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← 관리자 대시보드
        </Link>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="상호명, 대표자명, 사업자번호 검색..."
          className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
        >
          검색
        </button>
      </form>

      {/* 카드 리스트 */}
      <div className="space-y-4">
        {companies.map((c) => (
          <div
            key={c.id}
            className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-[var(--text)]">
                    {c.name}
                  </h3>
                  {editingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg)]"
                      >
                        <option value="start">Start</option>
                        <option value="pro">Pro</option>
                        <option value="ultra">Ultra</option>
                      </select>
                      <button
                        onClick={() => handlePlanChange(c.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-[var(--text-muted)] hover:underline"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditPlan(c.plan);
                      }}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${
                        c.plan === "start"
                          ? "bg-slate-100 text-slate-700"
                          : c.plan === "pro"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.plan} ✏️
                    </button>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  대표: {c.ceoName} · 사업자번호:{" "}
                  {formatBizNum(c.businessNumber)}
                </p>
              </div>
              <div className="text-right text-xs text-[var(--text-muted)]">
                <div>등록: {formatDate(c.createdAt)}</div>
                {c.planExpiresAt && (
                  <div>만료: {formatDate(c.planExpiresAt)}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="text-center bg-[var(--bg)] rounded-lg p-2">
                <div className="text-lg font-bold text-[var(--text)]">
                  {c.memberCount}
                </div>
                <div className="text-xs text-[var(--text-muted)]">관리자</div>
              </div>
              <div className="text-center bg-[var(--bg)] rounded-lg p-2">
                <div className="text-lg font-bold text-[var(--text)]">
                  {c.employeeCount}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  재직 직원
                </div>
              </div>
              <div className="text-center bg-[var(--bg)] rounded-lg p-2">
                <div className="text-lg font-bold text-[var(--text)]">
                  {c.totalEmployees}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  전체 직원
                </div>
              </div>
              <div className="text-center bg-[var(--bg)] rounded-lg p-2">
                <div className="text-lg font-bold text-[var(--text)]">
                  {c.documentCount}
                </div>
                <div className="text-xs text-[var(--text-muted)]">서류</div>
              </div>
            </div>
          </div>
        ))}

        {companies.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            등록된 사업장이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
