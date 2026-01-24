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
  } = useFinanceStore();

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

  const handleUseDemo = () => {
    const mockData = generateMockData();
    const name = pendingName || DEFAULT_USER_SETTINGS.userName;
    completeOnboardingWithDemo(name, { ...mockData, categories: DEFAULT_CATEGORIES });
  };

  const handleStartBlank = () => {
    const name = pendingName || DEFAULT_USER_SETTINGS.userName;
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

  if (!hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        hasExistingData={hasExistingData}
        onSaveName={handleSaveName}
        onUseDemo={handleUseDemo}
        onStartBlank={handleStartBlank}
        onComplete={() => {}}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
};

export default App;
