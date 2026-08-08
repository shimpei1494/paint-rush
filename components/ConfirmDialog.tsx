"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "キャンセル",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-neutral-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-neutral-400">{description}</p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="no-tap flex-1 rounded-xl bg-neutral-700 py-3 font-bold text-white transition active:scale-95"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="no-tap flex-1 rounded-xl bg-red-500 py-3 font-bold text-white transition active:scale-95"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
