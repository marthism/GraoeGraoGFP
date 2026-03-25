import { useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { generateMockData } from "@/lib/mock-data";
import { DEFAULT_CATEGORIES, DEFAULT_USER_SETTINGS } from "@/types/finance";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { applyDesktopDisplay } from "@/desktop/window";
import { getAutostartStatus } from "@/desktop/autostart";
import { isTauri } from "@/desktop/env";
import { setLocale, t } from "@/i18n";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => {
  const [pendingName, setPendingName] = useState("");
  const {
    hasCompletedOnboarding,
    completeOnboardingWithDemo,
    completeOnboardingBlank,
    transactions,
    installments,
    invoices,
    budgets,
    creditCards,
    categories,
    userSettings,
    displayMode,
    resolution,
    locale,
    autostart,
    setDisplayMode,
    setAutostart,
    migrateInstallmentGroups,
  } = useFinanceStore();

  setLocale(locale);

  useEffect(() => {
    migrateInstallmentGroups();
  }, [migrateInstallmentGroups]);

  const hasExistingData = useMemo(() => {
    const total =
      transactions.length +
      installments.length +
      invoices.length +
      budgets.length +
      creditCards.length +
      categories.length;
    return total > 0;
  }, [transactions, installments, invoices, budgets, creditCards, categories]);

  const handleSaveName = (name: string) => {
    setPendingName(name);
  };

  const ensureMainWindowSize = async () => {
    if (!isTauri()) return;

    try {
      const { appWindow, LogicalSize, currentMonitor } = await import('@tauri-apps/api/window');
      const monitor = await currentMonitor();
      if (!monitor) return;

      const PAD_W = 40;
      const PAD_H = 80;
      const PREF_W = 1600;
      const PREF_H = 900;
      const MIN_W = 1100;
      const MIN_H = 700;

      // In Tauri v1, workarea might be lowercase or accessed differently
      const workArea = (monitor as any).workarea || (monitor as any).workArea || monitor;
      const { width: workW, height: workH } = workArea.size || monitor.size;

      let w, h;
      if (workW - PAD_W >= PREF_W && workH - PAD_H >= PREF_H) {
        w = PREF_W;
        h = PREF_H;
      } else {
        w = Math.floor((workW - PAD_W) * 0.9);
        h = Math.floor((workH - PAD_H) * 0.9);
      }

      // Apply limits
      w = Math.max(MIN_W, Math.min(w, workW - PAD_W));
      h = Math.max(MIN_H, Math.min(h, workH - PAD_H));

      await appWindow.setSize(new LogicalSize(w, h));
      await appWindow.center();
    } catch (error) {
      console.error("Failed to resize window:", error);
    }
  };

  const handleUseDemo = async () => {
    const mockData = generateMockData();
    const name = pendingName || DEFAULT_USER_SETTINGS.userName;

    await ensureMainWindowSize();
    completeOnboardingWithDemo(name, { ...mockData, categories: DEFAULT_CATEGORIES });
  };

  const handleStartBlank = async () => {
    const name = pendingName || DEFAULT_USER_SETTINGS.userName;

    await ensureMainWindowSize();
    completeOnboardingBlank(name);
  };

  useEffect(() => {
    const theme = userSettings.theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [userSettings.theme]);

  useEffect(() => {
    if (isTauri()) {
      // Se ainda não completou o onboarding, mantém a janela pequena inicial
      if (!hasCompletedOnboarding) return;

      void (async () => {
        const { appWindow, LogicalSize, LogicalPosition, currentMonitor } = await import('@tauri-apps/api/window');

        // Manter janela sem barra nativa (usar apenas controles customizados)
        await appWindow.setDecorations(false);

        try {
          await appWindow.maximize();
          return;
        } catch {
          // continua para fallback
        }

        const monitor = await currentMonitor();
        if (monitor) {
          const workArea = (monitor as any).workarea || (monitor as any).workArea || monitor;
          const { width: workW, height: workH } = workArea.size || monitor.size;
          await appWindow.setSize(new LogicalSize(workW, workH));
          await appWindow.setPosition(new LogicalPosition(0, 0));
          return;
        }

        // Fallback: usa resolução salva ou 1600x900
        if (resolution === 'auto') {
          await appWindow.setSize(new LogicalSize(1600, 900));
          await appWindow.center();
        } else {
          const result = await applyDesktopDisplay(displayMode, resolution);
          if (!result.ok) {
            toast.error(t("toast.displayApplyError"));
          }
        }
      })();
      return;
    }

    const applyWebDisplay = async () => {
      if (displayMode === "fullscreen") {
        try {
          await document.documentElement.requestFullscreen();
        } catch (error) {
          toast.error(t("toast.fullscreenBlocked"));
          setDisplayMode("window");
        }
        return;
      }

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (error) {
          toast.error(t("toast.fullscreenExitFailed"));
        }
      }
    };

    void applyWebDisplay();
  }, [displayMode, resolution, setDisplayMode]);

  useEffect(() => {
    if (isTauri()) return;
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setDisplayMode(isFullscreen ? "fullscreen" : "window");
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [setDisplayMode]);

  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    void (async () => {
      const status = await getAutostartStatus();
      if (!active) return;
      if (!status.ok) {
        toast.error(t("toast.autostartSyncFailed"));
        return;
      }
      if (status.enabled !== autostart) {
        setAutostart(status.enabled);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        hasExistingData={hasExistingData}
        onSaveName={handleSaveName}
        onUseDemo={handleUseDemo}
        onStartBlank={handleStartBlank}
        onComplete={() => { }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
