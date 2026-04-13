"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  email: string;
  provider: string;
  createdAt: string;
  lastSignIn: string | null;
  companyName: string | null;
  plan: string | null;
  role: string | null;
  banned: boolean;
}

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchUsers = useCallback(async (q = "") => {
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
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
    setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchUsers();
  }, [user, authLoading, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchUsers(search);
  };

  const handleBan = async (userId: string, action: "ban" | "unban") => {
    if (
      !confirm(
        action === "ban"
          ? "이 사용자를 정지하시겠습니까?"
          : "정지를 해제하시겠습니까?",
      )
    )
      return;
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    fetchUsers(search);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const providerLabel = (p: string) => {
    const map: Record<string, string> = {
      kakao: "🟡 카카오",
      google: "🔵 구글",
      email: "✉️ 이메일",
    };
    return map[p] || p;
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
            👤 사용자 관리
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            전체 {users.length}명
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
          placeholder="이메일 또는 사업장명 검색..."
          className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
        >
          검색
        </button>
      </form>

      {/* 테이블 */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
              <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                이메일
              </th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                로그인 방식
              </th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                사업장
              </th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                등급
              </th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                가입일
              </th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                최근 로그인
              </th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                상태
              </th>
              <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)]"
              >
                <td className="px-4 py-3 font-medium text-[var(--text)]">
                  {u.email}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {providerLabel(u.provider)}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {u.companyName || (
                    <span className="text-[var(--text-light)]">미등록</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.plan ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.plan === "start"
                          ? "bg-slate-100 text-slate-700"
                          : u.plan === "pro"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {u.plan}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {formatDate(u.lastSignIn)}
                </td>
                <td className="px-4 py-3">
                  {u.banned ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      정지
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      활성
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.banned ? (
                    <button
                      onClick={() => handleBan(u.id, "unban")}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      해제
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBan(u.id, "ban")}
                      className="text-xs text-red-600 hover:underline"
                    >
                      정지
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
