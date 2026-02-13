import { useTab } from '@/hooks/useTab';
import { TAB_CONFIGS } from '@/utils/tabConfigs';
import { X } from 'lucide-react';
import type { TabId } from '@/types/tab.types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { currentTab, setTab } = useTab();
  const isAnalytics = currentTab === 'analytics' as any;

  const handleTabClick = (tabId: TabId | 'analytics') => {
    setTab(tabId as any);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">תפריט</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-4">
          <div className="space-y-2">
            {/* Transaction Tabs */}
            {TAB_CONFIGS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full text-right px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
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
              onClick={() => handleTabClick('analytics')}
              className={`w-full text-right px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                isAnalytics
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              דוחות
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}
