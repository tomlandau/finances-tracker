import { useContext } from 'react';
import { TabContext } from '@/context/TabContext';

export function useTab() {
  const context = useContext(TabContext);

  if (!context) {
    throw new Error('useTab must be used within a TabProvider');
  }

  return context;
}
