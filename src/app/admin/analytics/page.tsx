"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const DOC_TYPE_LABELS: Record<string, string> = {
  "contract-fulltime": "정규직 근로계약서",
  "contract-parttime": "파트타임 계약서",
  "contract-freelancer": "프리랜서 계약서",
  payslip: "급여명세서",
  "wage-ledger": "임금대장",
  attendance: "출퇴근기록부",
  certificate: "재직증명서",
  "career-certificate": "경력증명서",
  resignation: "사직서",
  "retirement-pay": "퇴직금정산서",
  nda: "비밀유지서약서",
  "privacy-consent": "개인정보동의서",
  "personnel-card": "인사카드",
  "annual-leave": "연차관리대장",
  overtime: "시간외근로합의서",
  "warning-letter": "경고장",
  "work-rules": "취업규칙",
  "probation-eval": "수습평가서",
};

interface AnalyticsData {
  topDocuments: { type: string; count: number }[];
  sizeDistribution: {
    under5: number;
    "5to10": number;
    "10to30": number;
    over30: number;
  };
  dailyDocs: { date: string; count: number }[];
  weeklyActive: { date: string; count: number }[];
  totalDocuments: number;
  totalEmployees: number;
}

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetch("/api/admin/analytics")
      .then(async (res) => {
        if (res.status === 403) {
          setError("권한 없음");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError("데이터 로딩 실패");
          setLoading(false);
          return;
        }
        setData(await res.json());
        setLoading(false);
      })
      .catch(() => {
        setError("서버 연결 실패");
        setLoading(false);
      });
  }, [user, authLoading]);

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  if (error || !data)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-[var(--text)]">{error}</h2>
      </div>
    );

  const maxDocCount = Math.max(
    ...(data.topDocuments.map((d) => d.count) || [1]),
    1,
  );
  const maxDaily = Math.max(...data.dailyDocs.map((d) => d.count), 1);
  const maxWeekly = Math.max(...data.weeklyActive.map((d) => d.count), 1);
  const totalSize =
    data.sizeDistribution.under5 +
    data.sizeDistribution["5to10"] +
    data.sizeDistribution["10to30"] +
    data.sizeDistribution.over30;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            📊 사용 패턴 분석
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            서류 {data.totalDocuments}건 · 직원 {data.totalEmployees}명
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← 관리자 대시보드
        </Link>
      </div>

      {/* 일별 활성 사용자 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)] mb-8">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          일별 활성 사용자 (최근 7일)
        </h2>
        <div className="flex items-end gap-3 h-32">
          {data.weeklyActive.map((d) => (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs font-bold text-[var(--text)]">
                {d.count}
              </span>
              <div
                className="w-full bg-green-500 rounded-t-md"
                style={{
                  height: `${(d.count / maxWeekly) * 100}%`,
                  minHeight: d.count > 0 ? "8px" : "2px",
                }}
              />
              <span className="text-xs text-[var(--text-muted)]">
                {d.date.slice(8)}일
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* 인기 서류 TOP 10 */}
        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">
            🔥 인기 서류 TOP 10
          </h2>
          {data.topDocuments.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">
              아직 생성된 서류가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {data.topDocuments.map((d, i) => (
                <div key={d.type} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[var(--text-muted)] w-6">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text)]">
                        {DOC_TYPE_LABELS[d.type] || d.type}
                      </span>
                      <span className="font-medium text-[var(--text)]">
                        {d.count}건
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg)] rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[var(--primary)]"
                        style={{ width: `${(d.count / maxDocCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 사업장 규모별 분포 */}
        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">
            🏢 사업장 규모별 분포
          </h2>
          {totalSize === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">
              직원이 등록된 사업장이 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {[
                {
                  label: "5인 미만",
                  value: data.sizeDistribution.under5,
                  color: "bg-blue-500",
                },
                {
                  label: "5~10인",
                  value: data.sizeDistribution["5to10"],
                  color: "bg-green-500",
                },
                {
                  label: "10~30인",
                  value: data.sizeDistribution["10to30"],
                  color: "bg-purple-500",
                },
                {
                  label: "30인 이상",
                  value: data.sizeDistribution.over30,
                  color: "bg-orange-500",
                },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text)]">{s.label}</span>
                    <span className="text-[var(--text-muted)]">
                      {s.value}개 (
                      {totalSize > 0
                        ? Math.round((s.value / totalSize) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg)] rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${s.color}`}
                      style={{
                        width: `${totalSize > 0 ? (s.value / totalSize) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 일별 서류 생성 추이 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          📈 일별 서류 생성 (최근 30일)
        </h2>
        <div className="flex items-end gap-[2px] h-24 overflow-hidden">
          {data.dailyDocs.map((d) => (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center"
              title={`${d.date}: ${d.count}건`}
            >
              <div
                className="w-full bg-[var(--primary)] rounded-t-sm opacity-80"
                style={{
                  height: `${(d.count / maxDaily) * 100}%`,
                  minHeight: d.count > 0 ? "4px" : "1px",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)]">
          <span>{data.dailyDocs[0]?.date.slice(5)}</span>
          <span>
            {data.dailyDocs[data.dailyDocs.length - 1]?.date.slice(5)}
          </span>
        </div>
      </div>
    </div>
  );
}
