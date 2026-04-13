"use client";

/**
 * 모바일 하단 고정 버튼바
 * 서류 편집 페이지에서 미리보기/인쇄 버튼을 항상 접근 가능하게 함
 */
export default function MobileFixedBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-3 no-print safe-area-bottom">
      <div className="flex gap-2 max-w-lg mx-auto">{children}</div>
    </div>
  );
}
