interface FABProps {
  onClick: () => void;
}

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 left-6 md:bottom-6 md:left-6 sm:bottom-4 sm:left-4 z-40 w-14 h-14 sm:w-12 sm:h-12 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
      aria-label="הוסף תנועה חדשה"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>

      {/* Tooltip */}
      <span className="absolute bottom-full mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        הוסף תנועה
      </span>
    </button>
  );
}
