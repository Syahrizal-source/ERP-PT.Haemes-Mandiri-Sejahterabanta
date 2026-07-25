"use client";

import { useState } from "react";

export type ToastType = "success" | "error";

export interface ToastState {
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 1000);
  }

  return {
    toast,
    showToast,
  };
}
