"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">&#128225;</div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          오프라인 상태입니다
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          인터넷 연결을 확인해주세요. 연결이 복구되면 자동으로 페이지가
          새로고침됩니다.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
