import { forwardRef, useState } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  prefixIcon,
  suffixIcon,
  className = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      <div className="relative">
        {prefixIcon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 transition-colors duration-200 ${isFocused ? 'text-brand-500' : ''}`}>
            {prefixIcon}
          </div>
        )}
        <input
          ref={ref}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          className={`
            w-full px-4 py-3 rounded-xl
            bg-surface-50 dark:bg-surface-900
            border-2 transition-all duration-200
            ${prefixIcon ? 'pl-11' : ''}
            ${suffixIcon ? 'pr-11' : ''}
            ${error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
              : isFocused
                ? 'border-brand-500/50 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
            }
            text-surface-800 dark:text-surface-100
            placeholder:text-surface-400
            disabled:bg-surface-100 disabled:cursor-not-allowed
            ${className}
          `}
          placeholder={props.placeholder || ' '}
          {...props}
        />
      </div>
      {label && (
        <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1 mt-1">
          {label}
        </label>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-surface-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
