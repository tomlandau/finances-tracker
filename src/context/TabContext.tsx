import { createContext, useState, useCallback, ReactNode } from 'react';
import type { TabId, TabState } from '@/types/tab.types';
import { DEFAULT_TAB, TAB_CONFIGS } from '@/utils/tabConfigs';

const STORAGE_KEY = 'selected-tab';

export const TabContext = createContext<TabState | undefined>(undefined);

interface TabProviderProps {
  children: ReactNode;
}

export function TabProvider({ children }: TabProviderProps) {
  const [currentTab, setCurrentTab] = useState<TabId>(() => {
    // Try to load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && TAB_CONFIGS.find((t) => t.id === stored)) {
      return stored as TabId;
    }
    return DEFAULT_TAB;
  });

  const setTab = useCallback((tabId: TabId) => {
    setCurrentTab(tabId);
    localStorage.setItem(STORAGE_KEY, tabId);
  }, []);

  return (
    <TabContext.Provider value={{ currentTab, setTab }}>
      {children}
    </TabContext.Provider>
  );
}
