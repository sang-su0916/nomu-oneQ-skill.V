export default function EmployeesLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-40 bg-[var(--border-light)] rounded" />
        <div className="h-10 w-32 bg-[var(--border-light)] rounded-lg" />
      </div>

      {/* 직원 카드 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 bg-[var(--border-light)] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
