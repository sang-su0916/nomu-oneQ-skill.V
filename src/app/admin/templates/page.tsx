"use client";

import Link from "next/link";

const TEMPLATES = [
  {
    category: "근로계약",
    items: [
      {
        name: "정규직 근로계약서",
        path: "/contract/fulltime",
        status: "active",
        version: "1.0",
      },
      {
        name: "파트타임 근로계약서",
        path: "/contract/parttime",
        status: "active",
        version: "1.0",
      },
      {
        name: "프리랜서 계약서",
        path: "/contract/freelancer",
        status: "active",
        version: "1.0",
      },
    ],
  },
  {
    category: "급여/임금",
    items: [
      {
        name: "급여명세서",
        path: "/payslip",
        status: "active",
        version: "2.0",
      },
      {
        name: "임금대장",
        path: "/wage-ledger",
        status: "active",
        version: "1.0",
      },
    ],
  },
  {
    category: "근태/휴가",
    items: [
      {
        name: "출퇴근기록부",
        path: "/documents/attendance",
        status: "active",
        version: "1.0",
      },
      {
        name: "시간외근로합의서",
        path: "/documents/overtime",
        status: "active",
        version: "1.0",
      },
      {
        name: "연차관리대장",
        path: "/documents/annual-leave",
        status: "active",
        version: "1.0",
      },
      {
        name: "연차촉진통보서",
        path: "/documents/annual-leave-notice",
        status: "active",
        version: "1.0",
      },
      {
        name: "근무시간변경합의서",
        path: "/documents/work-hours-change",
        status: "active",
        version: "1.0",
      },
      {
        name: "재택근무신청서",
        path: "/documents/remote-work",
        status: "active",
        version: "1.0",
      },
    ],
  },
  {
    category: "인사/채용",
    items: [
      {
        name: "인사카드",
        path: "/documents/personnel-card",
        status: "active",
        version: "1.0",
      },
      {
        name: "수습평가서",
        path: "/documents/probation-eval",
        status: "active",
        version: "1.0",
      },
      {
        name: "교육훈련확인서",
        path: "/documents/training-record",
        status: "active",
        version: "1.0",
      },
    ],
  },
  {
    category: "퇴사/이동",
    items: [
      {
        name: "사직서",
        path: "/documents/resignation",
        status: "active",
        version: "1.0",
      },
      {
        name: "퇴직금정산서",
        path: "/documents/retirement-pay",
        status: "active",
        version: "1.0",
      },
      {
        name: "업무인수인계서",
        path: "/documents/handover",
        status: "active",
        version: "1.0",
      },
      {
        name: "복직신청서",
        path: "/documents/reinstatement",
        status: "active",
        version: "1.0",
      },
      {
        name: "휴직신청서",
        path: "/documents/leave-application",
        status: "active",
        version: "1.0",
      },
    ],
  },
  {
    category: "증명/서약",
    items: [
      {
        name: "재직증명서",
        path: "/documents/certificate",
        status: "active",
        version: "1.0",
      },
      {
        name: "경력증명서",
        path: "/documents/career-certificate",
        status: "active",
        version: "1.0",
      },
      {
        name: "개인정보동의서",
        path: "/documents/privacy-consent",
        status: "active",
        version: "1.0",
      },
      {
        name: "비밀유지서약서",
        path: "/documents/nda",
        status: "active",
        version: "1.0",
      },
      {
        name: "서약서",
        path: "/documents/pledge",
        status: "active",
        version: "1.0",
      },
    ],
  },
  {
    category: "징계/해고",
    items: [
      {
        name: "경고장",
        path: "/documents/warning-letter",
        status: "active",
        version: "1.0",
      },
      {
        name: "징계통보서",
        path: "/documents/disciplinary-notice",
        status: "active",
        version: "1.0",
      },
      {
        name: "해고통보서",
        path: "/documents/termination-notice",
        status: "active",
        version: "1.0",
      },
    ],
  },
  {
    category: "기타",
    items: [
      {
        name: "취업규칙",
        path: "/work-rules",
        status: "active",
        version: "1.0",
      },
      {
        name: "출장신청서",
        path: "/documents/business-trip",
        status: "active",
        version: "1.0",
      },
      {
        name: "겸업허가신청서",
        path: "/documents/side-job-permit",
        status: "active",
        version: "1.0",
      },
    ],
  },
];

export default function AdminTemplatesPage() {
  const totalTemplates = TEMPLATES.reduce(
    (sum, cat) => sum + cat.items.length,
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            📄 콘텐츠/템플릿 관리
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            전체 {totalTemplates}종 서류 템플릿
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← 관리자 대시보드
        </Link>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] text-center">
          <div className="text-3xl font-bold text-[var(--text)]">
            {totalTemplates}
          </div>
          <div className="text-sm text-[var(--text-muted)]">전체 템플릿</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] text-center">
          <div className="text-3xl font-bold text-green-600">
            {totalTemplates}
          </div>
          <div className="text-sm text-[var(--text-muted)]">활성</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] text-center">
          <div className="text-3xl font-bold text-[var(--text)]">
            {TEMPLATES.length}
          </div>
          <div className="text-sm text-[var(--text-muted)]">카테고리</div>
        </div>
      </div>

      {/* 법령 업데이트 알림 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">⚖️</span>
          <h3 className="font-bold text-blue-900">법령 개정 관리</h3>
        </div>
        <p className="text-sm text-blue-700">
          법령 개정 시 영향받는 템플릿을 일괄 업데이트할 수 있습니다. 현재 모든
          템플릿은 2026년 근로기준법 기준으로 작성되어 있습니다.
        </p>
      </div>

      {/* 카테고리별 템플릿 */}
      <div className="space-y-6">
        {TEMPLATES.map((cat) => (
          <div
            key={cat.category}
            className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)]"
          >
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-bold text-[var(--text)]">{cat.category}</h2>
              <span className="text-xs text-[var(--text-muted)]">
                {cat.items.length}종
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {cat.items.map((t) => (
                <div
                  key={t.path}
                  className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      v{t.version}
                    </span>
                    <span className="text-sm text-[var(--text)]">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      활성
                    </span>
                    <Link
                      href={t.path}
                      className="text-xs text-[var(--primary)] hover:underline"
                    >
                      미리보기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
