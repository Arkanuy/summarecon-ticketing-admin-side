"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** useConfirm() mengembalikan fungsi async: true kalau admin menekan tombol konfirmasi. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm harus dipakai di dalam <ConfirmProvider>");
  return ctx;
}

type Queue = { options: ConfirmOptions; resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Queue[]>([]);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<Element | null>(null);

  const current = queue[0] ?? null;

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setClosing(false);
      setQueue((prev) => [...prev, { options, resolve }]);
    });
  }, []);

  const settle = useCallback(
    (value: boolean) => {
      setClosing(true);
      const active = current;
      // tunggu animasi keluar selesai sebelum melepas dialog
      window.setTimeout(() => {
        setQueue((prev) => prev.slice(1));
        setClosing(false);
        active?.resolve(value);
      }, 160);
    },
    [current],
  );

  /* Escape menutup, focus dikunci di dalam dialog, focus kembali setelah ditutup. */
  useEffect(() => {
    if (!current) return;
    lastFocus.current = document.activeElement;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        settle(false);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const nodes = dialogRef.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("[data-confirm]")?.focus();
    }, 40);

    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      if (lastFocus.current instanceof HTMLElement) lastFocus.current.focus();
    };
  }, [current, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {current ? (
        <div className={`modal-backdrop${closing ? " is-closing" : ""}`} onClick={() => settle(false)}>
          <div
            ref={dialogRef}
            className={`modal-card${closing ? " is-closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={current.options.description ? "confirm-desc" : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`modal-icon${current.options.tone === "danger" ? " is-danger" : ""}`} aria-hidden="true">
              {current.options.tone === "danger" ? "!" : "?"}
            </div>
            <h2 id="confirm-title" className="modal-title">
              {current.options.title}
            </h2>
            {current.options.description ? (
              <p id="confirm-desc" className="modal-desc">
                {current.options.description}
              </p>
            ) : null}
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => settle(false)}>
                {current.options.cancelLabel ?? "Batal"}
              </button>
              <button
                type="button"
                data-confirm
                className={`button ${current.options.tone === "danger" ? "button-danger" : "button-primary"}`}
                onClick={() => settle(true)}
              >
                {current.options.confirmLabel ?? "Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
