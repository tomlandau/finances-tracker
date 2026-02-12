import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface MonthSelectorProps {
  selectedMonth: string; // Format: 'yyyy-MM'
  onMonthChange: (month: string) => void;
}

const HEBREW_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthIndex = month - 1; // 0-based index

  const handlePrevMonth = () => {
    const date = new Date(year, monthIndex - 1, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const date = new Date(year, monthIndex + 1, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const displayText = `${HEBREW_MONTHS[monthIndex]} ${year}`;

  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      {/* Next month (right arrow in RTL) */}
      <button
        onClick={handleNextMonth}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="חודש הבא"
      >
        <ChevronRightIcon className="w-5 h-5 text-gray-600" />
      </button>

      {/* Month display */}
      <div className="min-w-[150px] text-center">
        <span className="text-lg font-semibold text-gray-900">{displayText}</span>
      </div>

      {/* Previous month (left arrow in RTL) */}
      <button
        onClick={handlePrevMonth}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="חודש קודם"
      >
        <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
