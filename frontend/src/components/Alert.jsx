import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const VARIANTS = {
  error: {
    icon: AlertCircle,
    wrapper: 'border-red-200 bg-red-50',
    iconClass: 'text-red-600',
    textClass: 'text-red-800',
  },
  success: {
    icon: CheckCircle2,
    wrapper: 'border-accent-200 bg-accent-50',
    iconClass: 'text-accent-600',
    textClass: 'text-accent-800',
  },
  warning: {
    icon: AlertTriangle,
    wrapper: 'border-amber-200 bg-amber-50',
    iconClass: 'text-amber-600',
    textClass: 'text-amber-800',
  },
  info: {
    icon: Info,
    wrapper: 'border-brand-200 bg-brand-50',
    iconClass: 'text-brand-600',
    textClass: 'text-brand-800',
  },
};

/**
 * Inline alert used for form-level and request errors.
 * Renders backend field errors as a list when present.
 */
export default function Alert({ variant = 'error', title, message, errors, children, className = '' }) {
  const style = VARIANTS[variant] || VARIANTS.info;
  const Icon = style.icon;
  const errorList = Array.isArray(errors) ? errors : [];

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3.5 ${style.wrapper} ${className}`} role="alert">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`} aria-hidden="true" />
      <div className={`min-w-0 flex-1 text-sm ${style.textClass}`}>
        {title && <p className="font-semibold">{title}</p>}
        {message && <p className={title ? 'mt-0.5' : ''}>{message}</p>}

        {errorList.length > 0 && (
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {errorList.map((error, index) => (
              <li key={`${error.field || 'error'}-${index}`}>
                {error.field ? <span className="font-medium">{error.field}: </span> : null}
                {error.message}
              </li>
            ))}
          </ul>
        )}

        {children}
      </div>
    </div>
  );
}
