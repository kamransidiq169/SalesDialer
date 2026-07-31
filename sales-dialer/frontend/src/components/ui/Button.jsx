import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: `
    relative overflow-hidden
    bg-gradient-primary text-white
    shadow-[0_4px_14px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]
    hover:shadow-[0_6px_24px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]
    hover:brightness-110
    active:scale-[0.97] active:shadow-[0_2px_8px_rgba(99,102,241,0.3)]
    transition-all duration-200
  `,
  secondary: `
    relative bg-white/90 dark:bg-surface-800/90
    text-surface-800 dark:text-surface-100
    border border-surface-200 dark:border-surface-700
    backdrop-blur-md
    shadow-sm hover:shadow-md
    hover:bg-white dark:hover:bg-surface-800
    hover:border-surface-300 dark:hover:border-surface-600
    active:scale-[0.97]
    transition-all duration-200
  `,
  danger: `
    relative overflow-hidden
    bg-gradient-to-r from-red-500 to-rose-600 text-white
    shadow-[0_4px_14px_rgba(239,68,68,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]
    hover:shadow-[0_6px_24px_rgba(239,68,68,0.5)]
    hover:brightness-110
    active:scale-[0.97]
    transition-all duration-200
  `,
  success: `
    relative overflow-hidden
    bg-gradient-to-r from-emerald-500 to-teal-600 text-white
    shadow-[0_4px_14px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]
    hover:shadow-[0_6px_24px_rgba(16,185,129,0.5)]
    hover:brightness-110
    active:scale-[0.97]
    transition-all duration-200
  `,
  ghost: `
    bg-transparent
    text-surface-600 dark:text-surface-400
    hover:bg-surface-100 dark:hover:bg-surface-800/60
    hover:text-surface-900 dark:hover:text-surface-100
    active:scale-[0.97]
    transition-all duration-200
  `,
  outline: `
    relative bg-transparent
    text-brand-600 dark:text-brand-400
    border-2 border-brand-500/40 dark:border-brand-400/40
    hover:bg-brand-50 dark:hover:bg-brand-950/30
    hover:border-brand-500 dark:hover:border-brand-400
    active:scale-[0.97]
    transition-all duration-200
  `,
};

const sizes = {
  sm: 'px-3.5 py-2 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  xl: 'px-8 py-3.5 text-base gap-2.5',
};

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`
        group relative inline-flex items-center justify-center
        font-semibold tracking-tight rounded-xl
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-surface-50 dark:focus-visible:ring-offset-surface-950
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        whitespace-nowrap select-none
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {/* Subtle shine on hover for primary/danger/success */}
      {(variant === 'primary' || variant === 'danger' || variant === 'success') && (
        <span
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s ease-in-out',
          }}
        />
      )}
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
