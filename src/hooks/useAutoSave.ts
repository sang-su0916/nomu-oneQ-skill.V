"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const AUTOSAVE_PREFIX = "nomu_autosave_";

/**
 * 폼 데이터를 localStorage에 자동 저장하고 복원하는 훅.
 * - 1초 디바운스로 저장 (타이핑할 때마다 저장하지 않음)
 * - 저장 성공 시 마지막 저장 시각 기록
 * - clear()로 수동 삭제 (저장 완료 시 호출)
 * - lastSavedAt: 마지막 저장 시각 (AutoSaveStatus 연동)
 */
export function useAutoSave<T>(key: string, data: T, enabled: boolean = true) {
  const storageKey = AUTOSAVE_PREFIX + key;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // 디바운스 저장
  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const now = Date.now();
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            data,
            savedAt: now,
          }),
        );
        setLastSavedAt(now);
      } catch {
        // localStorage 가득 찬 경우 무시
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, enabled, storageKey]);

  // 저장된 데이터 복원
  const restore = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // 24시간 이상 지난 데이터는 무시
      if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(storageKey);
        return null;
      }
      if (parsed.savedAt) setLastSavedAt(parsed.savedAt);
      return parsed.data as T;
    } catch {
      return null;
    }
  }, [storageKey]);

  // 저장 데이터 삭제 (폼 제출 성공 시 호출)
  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    setLastSavedAt(null);
  }, [storageKey]);

  // 저장된 데이터 존재 여부
  const hasSaved = useCallback((): boolean => {
    return restore() !== null;
  }, [restore]);

  return { restore, clear, hasSaved, lastSavedAt };
}
