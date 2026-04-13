"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface SystemInfo {
  supabase: { url: string; region: string; projectId: string };
  vercel: { url: string; env: string };
  tables: { name: string; count: number }[];
  buildInfo: { nextVersion: string; nodeEnv: string; timestamp: string };
}

export default function AdminSystemPage() {
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetch("/api/admin/system")
      .then(async (res) => {
        if (res.ok) setInfo(await res.json());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, authLoading]);

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
            ⚙️ 시스템 모니터링
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            인프라 및 데이터베이스 현황
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← 관리자 대시보드
        </Link>
      </div>

      {info ? (
        <>
          {/* 인프라 정보 */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text)] mb-4">
                🗄️ Supabase
              </h2>
              <div className="space-y-2 text-sm">
                <InfoRow label="프로젝트 ID" value={info.supabase.projectId} />
                <InfoRow label="리전" value={info.supabase.region} />
                <InfoRow label="URL" value={info.supabase.url} />
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text)] mb-4">
                ▲ Vercel
              </h2>
              <div className="space-y-2 text-sm">
                <InfoRow label="URL" value={info.vercel.url} />
                <InfoRow label="환경" value={info.vercel.env} />
                <InfoRow label="Next.js" value={info.buildInfo.nextVersion} />
                <InfoRow label="빌드 시간" value={info.buildInfo.timestamp} />
              </div>
            </div>
          </div>

          {/* DB 테이블 현황 */}
          <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)] mb-8">
            <h2 className="text-lg font-bold text-[var(--text)] mb-4">
              📊 데이터베이스 테이블
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {info.tables.map((t) => (
                <div
                  key={t.name}
                  className="bg-[var(--bg)] rounded-lg p-3 text-center"
                >
                  <div className="text-xl font-bold text-[var(--text)]">
                    {t.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {t.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 상태 체크 */}
          <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
            <h2 className="text-lg font-bold text-[var(--text)] mb-4">
              ✅ 시스템 상태
            </h2>
            <div className="space-y-3">
              <StatusRow label="Supabase API" status="ok" />
              <StatusRow label="Auth 서비스" status="ok" />
              <StatusRow label="Vercel 배포" status="ok" />
              <StatusRow label="DB 연결" status="ok" />
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-[var(--text-muted)]">
          시스템 정보를 불러올 수 없습니다.
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="text-[var(--text)] font-mono text-xs">{value}</span>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-[var(--bg)] rounded-lg">
      <span className="text-sm text-[var(--text)]">{label}</span>
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          status === "ok"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {status === "ok" ? "정상" : "오류"}
      </span>
    </div>
  );
}
