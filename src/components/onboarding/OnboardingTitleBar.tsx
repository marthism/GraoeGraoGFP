import { Button } from '@/components/ui/button';
import { X, Minus, ArrowLeft } from 'lucide-react';
import { isTauri } from '@/desktop/env';

interface OnboardingTitleBarProps {
  onBack?: () => void;
  showBack?: boolean;
}

export function OnboardingTitleBar({ onBack, showBack }: OnboardingTitleBarProps) {
  const handleMinimize = async () => {
    if (isTauri()) {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.minimize();
    }
  };

  const handleClose = async () => {
    if (isTauri()) {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.close();
    }
  };

  if (!isTauri()) return null;

  return (
    <div 
      data-tauri-drag-region 
      className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-2 z-[10000]"
    >
      <div className="flex items-center">
        {showBack && onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md hover:bg-white/10 text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md hover:bg-white/10 text-muted-foreground flex items-center justify-center"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4 mt-[-2px]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md hover:bg-destructive/20 hover:text-destructive text-muted-foreground flex items-center justify-center"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
