export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      {/* 헤더 */}
      <div className="h-8 w-48 bg-[var(--border-light)] rounded mb-6" />

      {/* 통계 카드 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[var(--border-light)] rounded-xl" />
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-[var(--border-light)] rounded-xl h-64" />
    </div>
  );
}
