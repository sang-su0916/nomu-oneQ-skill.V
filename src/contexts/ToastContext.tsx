"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

const STYLES: Record<ToastType, { bg: string; border: string; icon: string }> =
  {
    success: {
      bg: "var(--success-bg, #ecfdf5)",
      border: "var(--success, #059669)",
      icon: "var(--success, #059669)",
    },
    error: {
      bg: "var(--error-bg, #fef2f2)",
      border: "var(--error, #dc2626)",
      icon: "var(--error, #dc2626)",
    },
    warning: {
      bg: "var(--warning-bg, #fffbeb)",
      border: "var(--warning, #d97706)",
      icon: "var(--warning, #d97706)",
    },
    info: {
      bg: "var(--info-bg, #eff6ff)",
      border: "var(--info, #2563eb)",
      icon: "var(--info, #2563eb)",
    },
  };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const toast = {
    success: useCallback((msg: string) => addToast(msg, "success"), [addToast]),
    error: useCallback((msg: string) => addToast(msg, "error"), [addToast]),
    warning: useCallback((msg: string) => addToast(msg, "warning"), [addToast]),
    info: useCallback((msg: string) => addToast(msg, "info"), [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container - 우상단 고정 */}
      <div
        style={{
          position: "fixed",
          top: "72px",
          right: "16px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "400px",
          width: "calc(100% - 32px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const s = STYLES[t.type];
          return (
            <div
              key={t.id}
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: "12px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                animation: "toast-slide-in 0.3s ease-out",
                pointerEvents: "auto",
              }}
            >
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: s.icon,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {ICONS[t.type]}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "var(--text, #1e293b)",
                  lineHeight: 1.4,
                }}
              >
                {t.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
