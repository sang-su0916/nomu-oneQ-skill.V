import LicenseCodeInput from "@/components/LicenseCodeInput";

const allFeatures = [
  "직원 50명까지 등록",
  "전체 노무서류 30종+",
  "PDF 다운로드",
  "전자서명",
  "서류 보관함",
  "계약만료 · 연차 알림",
  "2026년 요율 자동 적용",
];

export default function MembershipPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-[var(--text)] mb-3">멤버십</h1>
        <p className="text-[var(--text-muted)]">
          모든 기능을 바로 이용할 수 있습니다
        </p>
      </div>

      <div className="rounded-2xl border-2 border-green-200 bg-[var(--bg-card)] p-8 shadow-sm">
        <div className="text-center mb-6">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-700">
            전체 기능 이용 가능
          </span>
          <p className="text-sm text-[var(--text-muted)] mt-3">
            별도 등급 구분 없이, 가입 즉시 아래 모든 기능을 사용할 수 있습니다.
          </p>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allFeatures.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 text-sm text-[var(--text)] p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
            >
              <span className="text-green-500">✓</span> {f}
            </li>
          ))}
        </ul>
      </div>

      {/* 멤버십 코드 입력 섹션 */}
      <div className="mt-12">
        <LicenseCodeInput />
      </div>

      <div className="mt-12 text-center">
        <p className="text-[var(--text-muted)] text-sm">
          문의:{" "}
          <a
            href="mailto:sangsu0916@gmail.com"
            className="text-[var(--primary)]"
          >
            sangsu0916@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
