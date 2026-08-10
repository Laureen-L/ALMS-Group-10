// Toasts — transient feedback for actions that would otherwise complete in
// silence (saved, borrowed, reminder sent, session expired).
//
// Usage:  const toast = useToast();
//         toast.success("Book borrowed");
//         toast.error(err.message);
import { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { SESSION_EXPIRED_MESSAGE } from "../services/apiClient.js";

const ToastContext = createContext(null);

const DURATION = { success: 3500, info: 3500, error: 6000 }; // errors linger

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const push = useCallback((tone, message) => {
    if (!message) return;
    // AuthContext already raises its own notice when the session ends. Every
    // in-flight action also rejects with this message, so without the guard a
    // single expiry produces a pile of duplicates.
    if (message === SESSION_EXPIRED_MESSAGE) return;
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => {
      // Don't stack the same message twice — repeated failures are common.
      if (prev.some((t) => t.message === message)) return prev;
      return [...prev, { id, tone, message }];
    });
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION[tone] ?? 4000));
  }, [dismiss]);

  // Clear pending timers if the provider unmounts.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const value = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone] || Info;
          return (
            <div key={t.id} className={`toast toast--${t.tone}`}>
              <Icon size={18} className="toast__icon" />
              <span className="toast__msg">{t.message}</span>
              <button className="toast__close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
