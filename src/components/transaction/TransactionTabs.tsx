import { useTab } from '@/hooks/useTab';
import { TAB_CONFIGS } from '@/utils/tabConfigs';

export function TransactionTabs() {
  const { currentTab, setTab } = useTab();
  const isAnalytics = currentTab === 'analytics' as any;

  return (
    <div className="mb-6">
      {/* Desktop: Single row of tabs */}
      <div className="hidden md:flex gap-2" role="tablist">
        {TAB_CONFIGS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={currentTab === tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors
              ${
                currentTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {tab.label}
          </button>
        ))}
        {/* Analytics Tab */}
        <button
          role="tab"
          aria-selected={isAnalytics}
          onClick={() => setTab('analytics' as any)}
          className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors
            ${
              isAnalytics
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          דוחות
        </button>
      </div>

      {/* Mobile: Three rows - 3 + 3 + 1 */}
      <div className="md:hidden space-y-2" role="tablist">
        <div className="grid grid-cols-3 gap-2">
          {TAB_CONFIGS.slice(0, 3).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={currentTab === tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-2 py-2 rounded-lg font-medium text-xs transition-colors
                ${
                  currentTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TAB_CONFIGS.slice(3).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={currentTab === tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-2 py-2 rounded-lg font-medium text-xs transition-colors
                ${
                  currentTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {/* Analytics Tab */}
          <button
            role="tab"
            aria-selected={isAnalytics}
            onClick={() => setTab('analytics' as any)}
            className={`px-2 py-2 rounded-lg font-medium text-xs transition-colors
              ${
                isAnalytics
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            דוחות
          </button>
        </div>
      </div>
    </div>
  );
}
