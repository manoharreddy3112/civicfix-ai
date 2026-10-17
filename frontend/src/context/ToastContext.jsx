import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    wrapper: 'border-accent-200 bg-white',
    iconClass: 'text-accent-600',
    bar: 'bg-accent-500',
  },
  error: {
    icon: AlertCircle,
    wrapper: 'border-red-200 bg-white',
    iconClass: 'text-red-600',
    bar: 'bg-red-500',
  },
  info: {
    icon: Info,
    wrapper: 'border-brand-200 bg-white',
    iconClass: 'text-brand-600',
    bar: 'bg-brand-500',
  },
};

let nextId = 0;

/** Lightweight toast/snackbar system for success + error notifications. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message, { title, duration } = {}) => {
      const id = (nextId += 1);
      const ttl = duration ?? (type === 'error' ? 8000 : 4500);

      setToasts((current) => [...current.slice(-3), { id, type, message, title }]);
      if (ttl > 0) window.setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      info: (message, options) => push('info', message, options),
      dismiss,
    }),
    [push, dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Viewport */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-4 sm:inset-x-auto sm:right-4 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map(({ id, type, message, title }) => {
          const variant = VARIANTS[type] || VARIANTS.info;
          const Icon = variant.icon;

          return (
            <div
              key={id}
              role={type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm animate-fade-in-up items-start gap-3 overflow-hidden rounded-xl border shadow-card-hover ${variant.wrapper}`}
            >
              <span className={`w-1 self-stretch ${variant.bar}`} aria-hidden="true" />
              <Icon className={`mt-3.5 h-5 w-5 shrink-0 ${variant.iconClass}`} aria-hidden="true" />
              <div className="min-w-0 flex-1 py-3 pr-1">
                {title && <p className="text-sm font-semibold text-slate-900">{title}</p>}
                <p className="break-words text-sm text-slate-600">{message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(id)}
                className="mr-2 mt-3 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a <ToastProvider>.');
  return context.toast;
}

export default ToastContext;
