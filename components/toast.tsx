"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  text: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (text: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClass: Record<ToastTone, string> = {
  success: "border-emerald-700 bg-emerald-950/90 text-emerald-200",
  error: "border-rose-700 bg-rose-950/90 text-rose-200",
  info: "border-blue-700 bg-blue-950/90 text-blue-200"
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg border px-3 py-2 text-sm shadow ${toneClass[msg.tone]}`}
          >
            {msg.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: () => {
        // No provider mounted; ignore toasts safely.
      }
    };
  }
  return context;
};
