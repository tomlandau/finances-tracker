import { InputHTMLAttributes, forwardRef } from 'react';

interface ComboboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'list'> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  ({ label, error, options, id, className = '', ...props }, ref) => {
    const listId = id ? `${id}-list` : 'combobox-list';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1 text-right">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          list={listId}
          className={`w-full px-3 py-2 border rounded-lg text-right
            ${error ? 'border-red-500' : 'border-gray-300'}
            focus:outline-none focus:ring-2 focus:ring-primary-500
            ${className}`}
          {...props}
        />
        <datalist id={listId}>
          {options.map(opt => (
            <option key={opt.value} value={opt.label} data-value={opt.value} />
          ))}
        </datalist>
        {error && (
          <p className="text-sm text-red-500 mt-1 text-right">{error}</p>
        )}
      </div>
    );
  }
);

Combobox.displayName = 'Combobox';
