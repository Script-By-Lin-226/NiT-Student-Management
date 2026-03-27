"use client";

import { AlertTriangle, X, Info, ShieldAlert } from "lucide-react";
import clsx from "clsx";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false
}: ConfirmModalProps) {
  if (!open) return null;

  const themes = {
    danger: {
      icon: <ShieldAlert className="w-6 h-6" />,
      style: "bg-rose-50 text-rose-600",
      button: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200",
      border: "border-rose-100",
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6" />,
      style: "bg-amber-50 text-amber-600",
      button: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200",
      border: "border-amber-100",
    },
    info: {
      icon: <Info className="w-6 h-6" />,
      style: "bg-brand-50 text-brand-600",
      button: "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-200",
      border: "border-brand-100",
    }
  };

  const theme = themes[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className={clsx(
        "relative w-full max-w-md bg-white rounded-3xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-200",
        theme.border
      )}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx("p-3 rounded-2xl shrink-0 transition-transform duration-500 animate-pulse", theme.style)}>
              {theme.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 uppercase tracking-tight">{title}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              // In this case, we close after confirm is initiated, but some functions might want to keep it open until finish.
              // For simplicity, we handle closing the modal in the parent if it's long-running.
              if (!isLoading) onClose();
            }}
            disabled={isLoading}
            className={clsx(
              "px-6 py-2.5 rounded-xl font-black shadow-lg transition-all active:scale-95 disabled:opacity-50 text-sm",
              theme.button
            )}
          >
            {isLoading ? "Wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
