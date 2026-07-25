"use client";

import type { ToastState } from "./useToast";

interface ToastProps {
  toast: ToastState | null;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  const baseStyle =
    "fixed bottom-5 right-5 px-4 py-3 rounded-md shadow-lg text-sm text-white";

  const typeStyle = toast.type === "success" ? "bg-green-600" : "bg-red-600";

  return <div className={`${baseStyle} ${typeStyle}`}>{toast.message}</div>;
}
