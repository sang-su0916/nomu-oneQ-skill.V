export default function InsuranceLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 w-56 bg-[var(--border-light)] rounded mb-2" />
      <div className="h-4 w-80 bg-[var(--border-light)] rounded mb-8" />

      {/* 입력 폼 영역 */}
      <div className="space-y-6">
        <div className="h-16 bg-[var(--border-light)] rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[var(--border-light)] rounded-lg" />
          ))}
        </div>
        <div className="h-16 bg-[var(--border-light)] rounded-xl" />
      </div>

      {/* 결과 영역 */}
      <div className="mt-8 h-48 bg-[var(--border-light)] rounded-xl" />
    </div>
  );
}
