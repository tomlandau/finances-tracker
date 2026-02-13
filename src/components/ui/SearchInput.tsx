import { InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput = ({
  value,
  onValueChange,
  placeholder = 'חיפוש...',
  className = '',
  ...props
}: SearchInputProps) => {
  return (
    <div className="relative w-full">
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <Search size={20} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full pr-10 pl-10 py-2 border border-gray-300 rounded-lg text-right
          focus:outline-none focus:ring-2 focus:ring-primary-500
          ${className}`}
        {...props}
      />
      {value && (
        <button
          onClick={() => onValueChange('')}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          type="button"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
};
