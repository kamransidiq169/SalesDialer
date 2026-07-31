import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-surface-950/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          className={`
            relative w-full ${sizeClasses[size]}
            bg-white dark:bg-surface-900
            rounded-2xl shadow-2xl
            border border-surface-200/60 dark:border-surface-800/60
            transform transition-all duration-300 ease-out
            animate-scale-in
            ring-1 ring-white/10 dark:ring-white/5
          `}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Subtle top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-surface-200/60 dark:border-surface-800/60">
            <h3 className="text-lg font-bold tracking-tight text-surface-900 dark:text-surface-50">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-surface-400 hover:text-surface-700 dark:hover:text-surface-200
                hover:bg-surface-100 dark:hover:bg-surface-800
                active:scale-95 transition-all duration-200"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-surface-200/60 dark:border-surface-800/60
              flex flex-wrap justify-end items-center gap-3
              bg-surface-50/60 dark:bg-surface-900/60 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
