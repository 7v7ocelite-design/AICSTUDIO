"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      richColors
      position="top-right"
      toastOptions={{
        style: {
          background: "#1E293B",
          color: "#E2E8F0",
          border: "1px solid rgba(148, 163, 184, 0.25)",
        },
      }}
    />
  );
}
