export type TabId =
  | 'tom-income'
  | 'yael-income'
  | 'shared-income'
  | 'tom-business'
  | 'yael-business'
  | 'shared-business'
  | 'home';

export interface TabConfig {
  id: TabId;
  label: string;
  transactionType: 'income' | 'expense';
  filters: {
    owner?: 'תום' | 'יעל' | 'משותף'; // For income categories
    businessHome?: string;         // For expense categories
  };
}

export interface TabState {
  currentTab: TabId;
  setTab: (tabId: TabId) => void;
}
