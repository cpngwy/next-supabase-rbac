"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title?: string;
  message?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(() => {
    return {
      toast: (t) => {
        const id = crypto.randomUUID();
        const nextToast: Toast = { ...t, id };
        setToasts((prev) => [nextToast, ...prev].slice(0, 5));

        window.setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== id));
        }, 4000);
      },
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[320px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto rounded-xl border px-4 py-3 shadow-soft",
              t.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "",
              t.variant === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "",
              t.variant === "info"
                ? "border-primary/20 bg-primary/5 text-slate-800"
                : "",
            ].join(" ")}
          >
            {t.title ? <div className="text-sm font-semibold">{t.title}</div> : null}
            {t.message ? <div className="mt-1 text-sm opacity-90">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

