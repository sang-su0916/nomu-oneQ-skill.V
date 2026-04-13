export default function PayslipLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 w-48 bg-[var(--border-light)] rounded mb-2" />
      <div className="h-4 w-72 bg-[var(--border-light)] rounded mb-8" />

      {/* 모드 토글 */}
      <div className="h-14 bg-[var(--border-light)] rounded-xl mb-6" />

      {/* 폼 섹션들 */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 bg-[var(--border-light)] rounded-xl h-32"
          />
        ))}
      </div>
    </div>
  );
}
