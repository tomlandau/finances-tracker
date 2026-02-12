import type { TabConfig, TabId } from '@/types/tab.types';

export const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'tom-income',
    label: 'הכנסות תום',
    transactionType: 'income',
    filters: { owner: 'תום' },
  },
  {
    id: 'yael-income',
    label: 'הכנסות יעל',
    transactionType: 'income',
    filters: { owner: 'יעל' },
  },
  {
    id: 'tom-business',
    label: 'הוצאות עסק תום',
    transactionType: 'expense',
    filters: { businessHome: 'עסק תום' },
  },
  {
    id: 'yael-business',
    label: 'הוצאות עסק יעל',
    transactionType: 'expense',
    filters: { businessHome: 'עסק יעל' },
  },
  {
    id: 'shared-business',
    label: 'הוצאות עסק משותף',
    transactionType: 'expense',
    filters: { businessHome: 'עסק - משותף' },
  },
  {
    id: 'home',
    label: 'הוצאות בית',
    transactionType: 'expense',
    filters: { businessHome: 'בית' },
  },
];

export const DEFAULT_TAB: TabId = 'home';

export function getTabById(tabId: TabId): TabConfig | undefined {
  return TAB_CONFIGS.find((tab) => tab.id === tabId);
}
