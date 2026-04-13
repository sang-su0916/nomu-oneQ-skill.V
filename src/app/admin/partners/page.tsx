"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/contexts/ToastContext";
import EmptyState from "@/components/EmptyState";

interface Partner {
  id: string;
  name: string;
  type: string;
  company: string;
  phone: string;
  email: string;
  referralCode: string;
  referralCount: number;
  status: string;
}

export default function AdminPartnersPage() {
  const [partners] = useState<Partner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "labor",
    company: "",
    phone: "",
    email: "",
  });
  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("파트너 등록 기능은 DB 테이블 생성 후 활성화됩니다.");
    setShowForm(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            🤝 제휴/파트너 관리
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            세무사·노무사 파트너 및 추천 코드 관리
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← 관리자 대시보드
        </Link>
      </div>

      {/* 파트너 등록 */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
        >
          {showForm ? "취소" : "+ 파트너 등록"}
        </button>
      </div>

      {showForm && (
        <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)] mb-8">
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">
            새 파트너 등록
          </h2>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                이름
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                유형
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
              >
                <option value="labor">노무사</option>
                <option value="tax">세무사</option>
                <option value="legal">법무사</option>
                <option value="consulting">컨설턴트</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                소속
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                연락처
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                이메일
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium"
              >
                등록
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 파트너 목록 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          파트너 목록
        </h2>
        {partners.length === 0 ? (
          <EmptyState
            icon="🤝"
            title="아직 등록된 파트너가 없습니다"
            description="세무사, 노무사 등 파트너를 등록하고 추천 코드를 발급해보세요."
            action={{
              label: "파트너 등록하기",
              onClick: () => setShowForm(true),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-2 text-[var(--text-muted)]">
                    이름
                  </th>
                  <th className="text-left px-4 py-2 text-[var(--text-muted)]">
                    유형
                  </th>
                  <th className="text-left px-4 py-2 text-[var(--text-muted)]">
                    소속
                  </th>
                  <th className="text-left px-4 py-2 text-[var(--text-muted)]">
                    추천 코드
                  </th>
                  <th className="text-left px-4 py-2 text-[var(--text-muted)]">
                    전환 수
                  </th>
                  <th className="text-left px-4 py-2 text-[var(--text-muted)]">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)]">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{p.type}</td>
                    <td className="px-4 py-3">{p.company}</td>
                    <td className="px-4 py-3 font-mono">{p.referralCode}</td>
                    <td className="px-4 py-3">{p.referralCount}</td>
                    <td className="px-4 py-3">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
