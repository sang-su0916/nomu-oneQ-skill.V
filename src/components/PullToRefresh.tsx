"use client";

import { useRef, useState, useCallback } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({
  onRefresh,
  children,
}: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && delta < 120) {
        setPullDistance(delta);
      }
    },
    [pulling, refreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    setPulling(false);
    if (pullDistance > threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(threshold);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex justify-center overflow-hidden transition-all duration-200 md:hidden"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : "0px" }}
      >
        <div
          className={`flex items-center gap-2 text-sm text-[var(--text-muted)] ${refreshing ? "animate-pulse" : ""}`}
        >
          <div
            className={`w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full ${
              refreshing ? "animate-spin" : ""
            }`}
            style={{
              transform: !refreshing
                ? `rotate(${pullDistance * 3}deg)`
                : undefined,
            }}
          />
          <span>
            {refreshing
              ? "새로고침 중..."
              : pullDistance > threshold
                ? "놓으면 새로고침"
                : "당겨서 새로고침"}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
