import { Button } from '@/components/ui/button';
import type { MouseEvent, PointerEvent } from 'react';
import { useState, useEffect } from 'react';
import { Minus, Plus, Square, X } from 'lucide-react';
import { t } from '@/i18n';
import { isTauri } from '@/desktop/env';

interface HeaderProps {
  onAddTransaction: () => void;
  userName?: string;
}

export function Header({ onAddTransaction, userName }: HeaderProps) {
  const displayName = userName || t('user.defaultName');
  const showWindowControls = isTauri();

  // Detect dark/light mode for icon switching
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    // Watch for class changes on <html> (next-themes adds/removes 'dark' class)
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Also watch system preference
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('light')) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener('change', handler);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', handler);
    };
  }, []);

  const handleMinimize = async () => {
    if (!isTauri()) return;
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.minimize();
  };

  const handleClose = async () => {
    if (!isTauri()) return;
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.close();
  };

  const handleToggleMaximize = async () => {
    if (!isTauri()) return;
    const { appWindow } = await import('@tauri-apps/api/window');
    await appWindow.toggleMaximize();
  };

  const stopDrag = (event: MouseEvent | PointerEvent) => {
    event.stopPropagation();
  };

  return (
    <header
      className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative"
      data-tauri-drag-region
    >
      {showWindowControls && (
        <div
          className="absolute right-2 top-2 z-20 flex items-center gap-1"
          data-tauri-drag-region="false"
          onMouseDown={stopDrag}
          onPointerDown={stopDrag}
        >
          <Button
            data-tauri-drag-region="false"
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-white/10"
            onClick={handleMinimize}
            onMouseDown={stopDrag}
            onPointerDown={stopDrag}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            data-tauri-drag-region="false"
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-white/10"
            onClick={handleToggleMaximize}
            onMouseDown={stopDrag}
            onPointerDown={stopDrag}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
          <Button
            data-tauri-drag-region="false"
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            onClick={handleClose}
            onMouseDown={stopDrag}
            onPointerDown={stopDrag}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div
        className={`container flex h-16 items-center justify-between ${showWindowControls ? 'pr-32' : ''}`}
        data-tauri-drag-region
      >
        <div className="flex items-center gap-3 min-w-0" data-tauri-drag-region>
          <div className="flex-shrink-0 rounded-lg overflow-hidden" data-tauri-drag-region>
            <img
              src={isDark ? '/icon-dark.png' : '/icon-light.png'}
              alt="Grão&Grão"
              className="h-10 w-10 pointer-events-none object-cover"
            />
          </div>
          <div className="min-w-0" data-tauri-drag-region>
            <h1 className="text-lg font-semibold tracking-tight truncate whitespace-nowrap pointer-events-none">{t('app.title')}</h1>
            <p className="text-xs text-muted-foreground truncate whitespace-nowrap pointer-events-none">{t('app.greeting', { name: displayName })}</p>
          </div>
        </div>

        <Button
          onClick={onAddTransaction}
          className="gap-2 bg-card/60 backdrop-blur-md border border-border/50 hover:bg-muted text-foreground shadow-sm transition-all flex-shrink-0"
          data-tauri-drag-region="false"
          onMouseDown={stopDrag}
          onPointerDown={stopDrag}
        >
          <Plus className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">{t('actions.newTransaction')}</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>
    </header>
  );
}
