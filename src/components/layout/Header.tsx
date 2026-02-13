import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-2xl mx-auto flex justify-between items-center">
        <Button
          variant="secondary"
          onClick={logout}
          className="flex items-center gap-2"
        >
          <LogOut size={18} />
          <span>התנתק</span>
        </Button>
        <h1 className="text-xl font-bold">ניהול כספים - תום ויעל</h1>
        <Button
          variant="secondary"
          onClick={onMenuClick}
          className="flex items-center gap-2"
          aria-label="פתח תפריט"
        >
          <Menu size={20} />
        </Button>
      </div>
    </header>
  );
}
