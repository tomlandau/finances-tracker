import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { LogOut } from 'lucide-react';

export function Header() {
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
      </div>
    </header>
  );
}
