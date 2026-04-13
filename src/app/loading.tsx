export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-3 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-[var(--text-muted)]">로딩 중...</p>
      </div>
    </div>
  );
}
