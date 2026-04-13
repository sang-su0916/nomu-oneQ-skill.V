"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import EmptyState from "@/components/EmptyState";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  status: string;
  created_at: string;
}

export default function AdminSupportPage() {
  const { user, loading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeResult, setNoticeResult] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadInquiries();
  }, [user, authLoading]);

  const loadInquiries = async () => {
    // inquiries 테이블이 있으면 로드 (없으면 빈 배열)
    const { data } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setInquiries((data as Inquiry[]) || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("inquiries").update({ status }).eq("id", id);
    loadInquiries();
  };

  const handleNotice = async () => {
    if (!notice.trim()) return;
    setNoticeLoading(true);
    setNoticeResult(null);
    try {
      const { error } = await supabase.from("notifications").insert({
        type: "notice",
        title: "관리자 공지",
        message: notice.trim(),
        is_global: true,
      });
      if (error) throw error;
      setNoticeResult("공지사항이 등록되었습니다.");
      setNotice("");
    } catch {
      setNoticeResult("공지 등록에 실패했습니다.");
    }
    setNoticeLoading(false);
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { text: string; cls: string }> = {
      pending: { text: "대기", cls: "bg-yellow-100 text-yellow-700" },
      in_progress: { text: "처리중", cls: "bg-blue-100 text-blue-700" },
      resolved: { text: "완료", cls: "bg-green-100 text-green-700" },
    };
    return map[s] || { text: s, cls: "bg-[var(--bg)] text-[var(--text)]" };
  };

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            💬 고객 지원
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            문의 관리 및 공지사항
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← 관리자 대시보드
        </Link>
      </div>

      {/* 공지사항 작성 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)] mb-8">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          📢 공지사항/업데이트 알림
        </h2>
        <textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          placeholder="공지사항 내용을 입력하세요..."
          className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-h-[100px] resize-y"
        />
        <button
          onClick={handleNotice}
          disabled={noticeLoading || !notice.trim()}
          className="mt-3 px-6 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {noticeLoading ? "등록 중..." : "공지 등록"}
        </button>
        {noticeResult && (
          <p
            className={`mt-2 text-sm ${noticeResult.includes("실패") ? "text-red-500" : "text-green-600"}`}
          >
            {noticeResult}
          </p>
        )}
      </div>

      {/* 문의 내역 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          📥 문의 내역
        </h2>
        {inquiries.length === 0 ? (
          <EmptyState icon="📭" title="접수된 문의가 없습니다" />
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => {
              const sl = statusLabel(inq.status);
              return (
                <div
                  key={inq.id}
                  className="p-4 border border-[var(--border)] rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-medium text-[var(--text)]">
                        {inq.name}
                      </span>
                      <span className="text-sm text-[var(--text-muted)] ml-2">
                        {inq.email}
                      </span>
                      {inq.company && (
                        <span className="text-sm text-[var(--text-muted)] ml-2">
                          ({inq.company})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${sl.cls}`}
                      >
                        {sl.text}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(inq.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text)] mb-3">
                    {inq.message}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(inq.id, "in_progress")}
                      className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      처리중
                    </button>
                    <button
                      onClick={() => updateStatus(inq.id, "resolved")}
                      className="text-xs px-3 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      완료
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
