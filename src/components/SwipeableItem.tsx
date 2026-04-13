"use client";

import { useRef, useState } from "react";

interface SwipeableItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
}

export default function SwipeableItem({
  children,
  onDelete,
  disabled,
}: SwipeableItemProps) {
  const startX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping || disabled) return;
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) {
      setOffsetX(Math.max(delta, -100));
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offsetX < -70) {
      setOffsetX(-100);
    } else {
      setOffsetX(0);
    }
  };

  const resetSwipe = () => setOffsetX(0);

  return (
    <div className="relative overflow-hidden rounded-xl md:overflow-visible">
      {/* Delete action behind */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[100px] bg-red-500 flex items-center justify-center text-white font-medium text-sm rounded-r-xl md:hidden"
        onClick={() => {
          onDelete();
          resetSwipe();
        }}
      >
        삭제
      </div>
      {/* Main content */}
      <div
        className="relative bg-[var(--bg-card)] transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
