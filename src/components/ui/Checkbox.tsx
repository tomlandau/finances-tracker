import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="flex items-center gap-2 text-right cursor-pointer">
          <span className="text-sm font-medium text-gray-700">
            {label}
          </span>
          <input
            ref={ref}
            type="checkbox"
            className={`w-5 h-5 rounded border-gray-300 text-primary-600
              focus:ring-2 focus:ring-primary-500 focus:ring-offset-0
              ${error ? 'border-red-500' : ''}
              ${className}`}
            {...props}
          />
        </label>
        {error && (
          <p className="text-sm text-red-500 mt-1 text-right">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
