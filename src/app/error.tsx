"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-sm border border-[var(--border)]">
          <div className="text-5xl mb-4">😵</div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">
            오류가 발생했습니다
          </h2>
          <p className="text-[var(--text-muted)] mb-6 text-sm">
            {error.message || "일시적인 오류입니다. 다시 시도해주세요."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90"
            >
              다시 시도
            </button>
            <a
              href="/"
              className="px-6 py-3 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg)]"
            >
              홈으로
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
