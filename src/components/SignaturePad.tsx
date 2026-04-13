"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  width?: number;
  height?: number;
  label?: string;
  initialValue?: string;
}

/**
 * Canvas 기반 전자서명 패드
 *
 * 법적 참고:
 * - 전자서명법 제3조: 전자서명은 서명자의 의사에 따라 생성된 것으로 추정
 * - 근로기준법 시행령: 근로계약서의 "서명" 요건을 전자서명으로 갈음 가능
 * - 본 서명은 간편 전자서명(비공인)이며, 공인전자서명이 필요한 경우 별도 인증 필요
 */
export default function SignaturePad({
  onSave,
  width = 400,
  height = 150,
  label = "서명",
  initialValue,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(
    initialValue || null,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 고해상도 디스플레이 지원
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 배경 설정
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 서명선 스타일
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 가이드라인
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.strokeStyle = "#d1d5db";
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#1e3a5f";

    // 초기 서명이 있는 경우 복원
    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasSignature(true);
      };
      img.src = initialValue;
    }
  }, [width, height, initialValue]);

  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const pos = getPosition(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
      setHasSignature(true);
      setSavedSignature(null);
    },
    [getPosition],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const pos = getPosition(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isDrawing, getPosition],
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 가이드라인 재그리기
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.strokeStyle = "#d1d5db";
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setHasSignature(false);
    setSavedSignature(null);
  }, [width, height]);

  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSavedSignature(dataUrl);
    onSave(dataUrl);
  }, [hasSignature, onSave]);

  return (
    <div className="inline-block">
      <label className="block text-sm font-medium text-[var(--text)] mb-1">
        {label}
      </label>

      {savedSignature ? (
        <div className="border-2 border-green-300 rounded-lg p-2 bg-green-50">
          <img
            src={savedSignature}
            alt="서명"
            style={{ width, height: height * 0.8 }}
            className="mx-auto"
          />
          <div className="flex gap-2 mt-2 justify-center">
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1 text-xs bg-[var(--bg)] text-[var(--text-muted)] rounded hover:bg-[var(--border-light)]"
            >
              다시 서명
            </button>
          </div>
          <p className="text-xs text-green-600 text-center mt-1">서명 완료</p>
        </div>
      ) : (
        <div className="border-2 border-[var(--border)] rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair touch-none"
          />
          <div className="flex gap-2 p-2 bg-[var(--bg)] border-t">
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1 text-xs bg-[var(--bg)] text-[var(--text-muted)] rounded hover:bg-[var(--border-light)]"
            >
              지우기
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!hasSignature}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              서명 확인
            </button>
          </div>
          <p className="text-xs text-[var(--text-light)] text-center pb-1">
            마우스 또는 터치로 서명하세요
          </p>
        </div>
      )}

      <p className="text-xs text-[var(--text-light)] mt-1">
        ※ 간편 전자서명 (전자서명법 제3조)
      </p>
    </div>
  );
}
