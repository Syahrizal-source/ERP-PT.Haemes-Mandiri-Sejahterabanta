"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle, XCircle } from "lucide-react";

type ToastType = "success" | "error";

interface ToastState {
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: ToastType): void {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white
              ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
