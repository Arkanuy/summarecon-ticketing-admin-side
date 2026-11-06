"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; tone: "ok" | "bad" | "info" };
type Push = (message: string, tone?: Toast["tone"]) => void;

const ToastContext = createContext<Push | null>(null);

export function useToast(): Push {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback<Push>((message, tone = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const timer = window.setTimeout(() => setItems((prev) => prev.slice(1)), 3800);
    return () => window.clearTimeout(timer);
  }, [items]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.tone}`}>
            <span className="toast-dot" aria-hidden="true" />
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
