"use client";

import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function Modal({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        {title && (
          <div className="border-b px-4 py-3 font-semibold text-gray-800">
            {title}
          </div>
        )}

        <div className="px-4 py-4 text-sm text-gray-600">{children}</div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            {cancelText}
          </button>

          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
