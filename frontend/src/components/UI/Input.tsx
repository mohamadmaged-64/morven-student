import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode, forwardRef } from 'react';

type InputBaseProps = {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  wrapperClassName?: string;
};

type InputProps = InputBaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { className?: string };

type TextAreaProps = InputBaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string };

type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = InputBaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
    options: SelectOption[];
    placeholder?: string;
    className?: string;
  };

const baseWrapperClasses = 'w-full';

const inputBaseClasses = [
  'w-full bg-white dark:bg-dark-surface',
  'border border-light-border dark:border-dark-border',
  'text-gray-900 dark:text-gray-100',
  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
  'rounded-xl px-4 py-2.5 text-sm',
  'transition-all duration-200',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

const errorClasses =
  'border-red-500 focus:ring-red-500/40 focus:border-red-500';

function InputLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label}
      {required && <span className="text-red-500 ms-0.5">*</span>}
    </label>
  );
}

function ErrorMessage({ error }: { error: string }) {
  return (
    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1" role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {error}
    </p>
  );
}

function HelperText({ text }: { text: string }) {
  return <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{text}</p>;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, iconRight, wrapperClassName = '', className = '', required, ...props }, ref) => {
    return (
      <div className={`${baseWrapperClasses} ${wrapperClassName}`}>
        {label && <InputLabel label={label} required={required} />}
        <div className="relative">
          {icon && (
            <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400 dark:text-gray-500 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`${inputBaseClasses} ${icon ? 'ps-10' : ''} ${iconRight ? 'pe-10' : ''} ${error ? errorClasses : ''} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
            required={required}
            {...props}
          />
          {iconRight && (
            <span className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-400 dark:text-gray-500 pointer-events-none">
              {iconRight}
            </span>
          )}
        </div>
        {error && <ErrorMessage error={error} />}
        {!error && helperText && <HelperText text={helperText} />}
      </div>
    );
  },
);

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, wrapperClassName = '', className = '', required, ...props }, ref) => {
    return (
      <div className={`${baseWrapperClasses} ${wrapperClassName}`}>
        {label && <InputLabel label={label} required={required} />}
        <textarea
          ref={ref}
          className={`${inputBaseClasses} resize-none min-h-[100px] ${error ? errorClasses : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          required={required}
          {...props}
        />
        {error && <ErrorMessage error={error} />}
        {!error && helperText && <HelperText text={helperText} />}
      </div>
    );
  },
);

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, icon, wrapperClassName = '', className = '', required, ...props }, ref) => {
    return (
      <div className={`${baseWrapperClasses} ${wrapperClassName}`}>
        {label && <InputLabel label={label} required={required} />}
        <div className="relative">
          {icon && (
            <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400 dark:text-gray-500 pointer-events-none">
              {icon}
            </span>
          )}
          <select
            ref={ref}
            className={`${inputBaseClasses} ${icon ? 'ps-10' : ''} pe-10 appearance-none ${error ? errorClasses : ''} ${className}`}
            aria-invalid={!!error}
            required={required}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-gray-400 dark:text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
        {error && <ErrorMessage error={error} />}
        {!error && helperText && <HelperText text={helperText} />}
      </div>
    );
  },
);

Input.displayName = 'Input';
TextArea.displayName = 'TextArea';
Select.displayName = 'Select';

export { Input, TextArea, Select };
export type { InputProps, TextAreaProps, SelectProps, SelectOption };
