import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-3 shadow-md"
      dir="rtl"
    >
      <div className="flex items-center justify-center gap-2 text-yellow-800">
        <WifiOff size={20} />
        <p className="text-sm font-medium">
          אתה במצב אופליין - שינויים יישמרו מקומית ויסונכרנו כשתחזור אונליין
        </p>
      </div>
    </div>
  );
}
