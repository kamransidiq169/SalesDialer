const statusVariants = {
  new: {
    bg: 'bg-slate-100/80 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200/60 dark:border-slate-700/60',
    dot: 'bg-slate-400',
    glow: '',
  },
  contacted: {
    bg: 'bg-blue-50/80 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/60 dark:border-blue-800/60',
    dot: 'bg-blue-500',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]',
  },
  interested: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/60 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  },
  not_interested: {
    bg: 'bg-red-50/80 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200/60 dark:border-red-800/60',
    dot: 'bg-red-500',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
  },
  initiated: {
    bg: 'bg-slate-100/80 dark:bg-slate-800/60',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-200/60 dark:border-slate-700/60',
    dot: 'bg-slate-400',
    glow: '',
  },
  calling: {
    bg: 'bg-amber-50/80 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200/60 dark:border-amber-800/60',
    dot: 'bg-amber-500',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  },
  connected: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/60 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]',
  },
  ended: {
    bg: 'bg-violet-50/80 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200/60 dark:border-violet-800/60',
    dot: 'bg-violet-500',
    glow: 'shadow-[0_0_12px_rgba(139,92,246,0.25)]',
  },
  missed: {
    bg: 'bg-red-50/80 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200/60 dark:border-red-800/60',
    dot: 'bg-red-500',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
  },
};

const statusLabels = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  not_interested: 'Not Interested',
  initiated: 'Initiated',
  calling: 'Calling',
  connected: 'Connected',
  ended: 'Ended',
  missed: 'Missed',
};

const Badge = ({ status, children, className = '' }) => {
  const variant = statusVariants[status] || statusVariants.new;
  const label = children || statusLabels[status] || status;
  const isLive = status === 'calling' || status === 'connected';

  return (
    <span
      className={`
        inline-flex items-center gap-2
        px-3 py-1 rounded-full
        text-[11px] font-semibold tracking-wide
        backdrop-blur-sm
        border ${variant.border}
        ${variant.bg}
        ${variant.text}
        ${variant.glow}
        transition-all duration-200
        ${className}
      `}
    >
      {/* Animated status dot with pulse for live states */}
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${variant.dot} opacity-75 animate-ping`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${variant.dot}`} />
      </span>
      {label}
    </span>
  );
};

export default Badge;
