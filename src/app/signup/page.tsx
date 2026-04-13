import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)]">노무원큐</h1>
          <p className="text-[var(--text-muted)] mt-2">
            중소기업 노무관리 솔루션
          </p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-sm border border-[var(--border)] text-center">
          <div className="text-5xl mb-4">🏢</div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-3">
            회원가입 안내
          </h2>
          <p className="text-[var(--text-muted)] mb-6 leading-relaxed">
            노무원큐는{" "}
            <strong className="text-[var(--text)]">엘비즈파트너스</strong>{" "}
            홈페이지에서 회원가입 후 이용하실 수 있습니다.
          </p>

          <a
            href="https://lbiz-partners.com/signup"
            className="inline-block w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            엘비즈파트너스에서 회원가입
          </a>

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="text-[var(--primary)] font-medium hover:underline"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
