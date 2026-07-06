import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Header } from '@/components/layout/Header';
import { BalanceCard } from '@/components/finance/BalanceCard';
import { SmartInsightsWidget } from '@/components/finance/SmartInsightsWidget';
import { CommandPalette } from '@/components/finance/CommandPalette';
import { PendingWindow } from '@/components/finance/PendingWindow';
import { TransactionForm } from '@/components/finance/TransactionForm';
import { TransactionList } from '@/components/finance/TransactionList';
import { InvoiceList } from '@/components/finance/InvoiceList';
import { BudgetOverview } from '@/components/finance/BudgetOverview';
import { MonthlyAnalysis } from '@/components/finance/MonthlyAnalysis';
import { CreditCardAnalysis } from '@/components/finance/CreditCardAnalysis';
import { AddCardDialog } from '@/components/finance/AddCardDialog';
import { SettingsPage } from '@/components/finance/SettingsPage';
import { MonthSelector } from '@/components/finance/MonthSelector';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { calculateSummary, getCurrentMonth, formatCurrency } from '@/lib/finance-utils';
import type { Transaction } from '@/types/finance';
import { generateMockData } from '@/lib/mock-data';
import { LayoutDashboard, Receipt, CreditCard, Target, BarChart3, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMonthInstallments, setShowMonthInstallments] = useState(false);
  const [highlightTransactionId, setHighlightTransactionId] = useState<string | null>(null);
  const [tabsScrolled, setTabsScrolled] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const {
    transactions,
    installments,
    invoices,
    categories,
    budgets,
    creditCards,
    paymentMethods,
    userSettings,
    displayMode,
    resolution,
    locale,
    autostart,
    addTransaction,
    updateTransaction,
    updateTransactionStatus,
    deleteTransaction,
    deleteTransactionGroup,
    postponeInstallment,
    diluteInstallment,
    payInvoice,
    setBudget,
    getSpendingByCategory,
    getTransactionsByMonth,
    addCategory,
    updateCategory,
    deleteCategory,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    updateUserSettings,
    setDisplayMode,
    setResolution,
    setLocale,
    setAutostart,
    loadMockData,
    clearBudgets,
    resetData,
    resetApp,
  } = useFinanceStore();

  const summary = calculateSummary(transactions, installments, invoices);
  const monthTransactions = getTransactionsByMonth(selectedMonth);
  const monthSpending = getSpendingByCategory(selectedMonth);

  const handleLoadMockData = () => {
    const mockData = generateMockData();
    loadMockData(mockData);
    toast.success(t('toast.demoLoaded'));
  };

  const handleClearData = () => {
    resetData();
    toast.success(t('toast.dataCleared'));
  };

  const handleResetAndPresent = () => {
    resetApp();
  };

  const handleRecentSelect = (transaction: { id: string; competenceMonth: string }) => {
    setActiveTab('transactions');
    setSelectedMonth(transaction.competenceMonth);
    setHighlightTransactionId(transaction.id);
  };

  useEffect(() => {
    if (activeTab !== 'transactions' || !highlightTransactionId) return;
    const scrollTimer = window.setTimeout(() => {
      const target = document.getElementById(`transaction-${highlightTransactionId}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

    const clearTimer = window.setTimeout(() => {
      setHighlightTransactionId(null);
    }, 2000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [activeTab, selectedMonth, highlightTransactionId]);

  useEffect(() => {
    const handleScroll = () => {
      setTabsScrolled(window.scrollY > 8);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onAddTransaction={() => setIsFormOpen(true)} userName={userSettings.userName} />
      <CommandPalette onNavigate={setActiveTab} onNewTransaction={() => setIsFormOpen(true)} />

      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div
            className={cn(
              "sticky top-16 z-20 -mx-4 px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
              "bg-slate-900/75 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60",
              tabsScrolled && "bg-slate-900/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            )}
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.dashboard')}</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.transactions')}</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.cards')}</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.budget')}</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.analysis')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.settings')}</span>
              </TabsTrigger>
            </TabsList>

            {activeTab !== 'dashboard' && activeTab !== 'settings' && (
              <div>
                <MonthSelector
                  currentMonth={selectedMonth}
                  onChange={setSelectedMonth}
                />
              </div>
            )}
          </div>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6 animate-fade-in">
            <SmartInsightsWidget
              transactions={transactions}
              installments={installments}
              invoices={invoices}
            />

            {(() => {
              const expenseProgress = summary.currentBalance > 0
                ? Math.min(100, Math.round((summary.pendingExpenses / summary.currentBalance) * 100))
                : summary.pendingExpenses > 0 ? 100 : 0;

              const liquidityProgress = summary.projectedBalance > 0
                ? 100
                : summary.currentBalance > 0
                  ? Math.max(0, 100 - expenseProgress)
                  : 0;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <BalanceCard
                    title={t('dashboard.toPay')}
                    amount={summary.pendingExpenses}
                    type="expense"
                    subtitle={t('dashboard.toPaySubtitle')}
                    progress={expenseProgress}
                  />
                  <BalanceCard
                    title={t('dashboard.toReceive')}
                    amount={summary.pendingIncome}
                    type="income"
                    subtitle={t('dashboard.toReceiveSubtitle')}
                  />
                  <BalanceCard
                    title={t('dashboard.currentBalance')}
                    amount={summary.currentBalance}
                    type="current"
                    subtitle={t('dashboard.currentBalanceSubtitle')}
                    progress={liquidityProgress}
                  />
                  <BalanceCard
                    title={t('dashboard.projectedBalance')}
                    amount={summary.projectedBalance}
                    type="projected"
                    subtitle={t('dashboard.projectedBalanceSubtitle')}
                  />
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <PendingWindow transactions={transactions} installments={installments} invoices={invoices} type="expense" days={7} />
                <PendingWindow transactions={transactions} installments={installments} invoices={invoices} type="expense" days={15} />
              </div>
              <div className="space-y-4">
                <PendingWindow transactions={transactions} installments={installments} invoices={invoices} type="income" days={7} />
                <PendingWindow transactions={transactions} installments={installments} invoices={invoices} type="income" days={15} />
              </div>
            </div>

            <TransactionList
              transactions={transactions.slice().reverse()}
              categories={categories}
              allTransactions={transactions}
              readOnly
              onSelect={handleRecentSelect}
              title={t('dashboard.recentTransactions')}
              emptyMessage={t('dashboard.recentTransactionsEmpty')}
              enableFilter
              scrollHeightClass="max-h-80"
            />
          </TabsContent>

          <TabsContent value="transactions" className="animate-fade-in">
            <TransactionList
              transactions={monthTransactions}
              categories={categories}
              allTransactions={transactions}
              onUpdateStatus={updateTransactionStatus}
              onDelete={deleteTransaction}
              onDeleteGroup={deleteTransactionGroup}
              onPostpone={postponeInstallment}
              onDilute={diluteInstallment}
              onEdit={(tx) => {
                setEditingTransaction(tx);
                setIsFormOpen(true);
              }}
              highlightId={highlightTransactionId}
              title={t('transactions.monthTitle')}
              emptyMessage={t('transactions.emptyMonth')}
              scrollHeightClass="max-h-[calc(100vh-300px)]"
              contextMonth={selectedMonth}
              creditCards={creditCards}
            />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{t('nav.cards')}</h2>
                <p className="text-sm text-muted-foreground">Gerencie seus cartões e faturas.</p>
              </div>
              <AddCardDialog onAddCard={addCreditCard} />
            </div>

            {/* Fatura do Mês */}
            {(() => {
              const monthInvoices = invoices.filter(inv => inv.month === selectedMonth);
              const invoicesByCard = creditCards
                .map(card => {
                  const invoice = monthInvoices.find(inv => inv.creditCardId === card.id);
                  const cardInstallments = installments.filter(
                    inst => inst.dueMonth === selectedMonth && inst.creditCardId === card.id
                  );
                  return {
                    card,
                    invoice,
                    amount: invoice?.totalAmount || 0,
                    installments: cardInstallments,
                  };
                })
                .filter(entry => entry.amount > 0 || entry.installments.length > 0);

              const totalInvoiceAmount = invoicesByCard.reduce((sum, entry) => sum + entry.amount, 0);
              const totalInstallments = invoicesByCard.reduce((sum, entry) => sum + entry.installments.length, 0);

              return totalInvoiceAmount > 0 ? (
                <Collapsible open={showMonthInstallments} onOpenChange={setShowMonthInstallments}>
                  <Card className="bg-credit-light border-credit/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-credit">{t('invoices.monthTitle')}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('invoices.entries', { count: totalInstallments })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-lg text-expense">
                            {formatCurrency(totalInvoiceAmount)}
                          </p>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm">
                              {t('invoices.viewEntries')}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </CardContent>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {invoicesByCard.map(entry => (
                            <div key={entry.card.id} className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.card.color }} />
                                {entry.card.name}
                              </div>
                              <div className="space-y-2">
                                {entry.installments.map(installment => {
                                  const transaction = transactions.find(t => t.id === installment.transactionId);
                                  const category = categories.find(c => c.id === transaction?.category);
                                  return (
                                    <div key={installment.id} className="flex items-center justify-between py-2 border-t">
                                      <div>
                                        <p className="text-sm font-medium">{transaction?.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {category?.name} ? {installment.installmentNumber}/{installment.totalInstallments}
                                        </p>
                                      </div>
                                      <p className="font-mono font-semibold">
                                        {formatCurrency(installment.amount)}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ) : null;
            })()}
            <CreditCardAnalysis transactions={transactions} creditCards={creditCards} invoices={invoices} installments={installments} categories={categories} month={selectedMonth} />
            <InvoiceList invoices={invoices} installments={installments} transactions={transactions} categories={categories} onPayInvoice={payInvoice} selectedMonth={selectedMonth} />
          </TabsContent>

          <TabsContent value="budget" className="animate-fade-in">
            <BudgetOverview
              categories={categories}
              spending={monthSpending}
              budgets={budgets}
              month={selectedMonth}
              onSetBudget={setBudget}
              onClearBudgets={clearBudgets}
            />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6 animate-fade-in">
            <MonthlyAnalysis transactions={transactions} categories={categories} month={selectedMonth} />
          </TabsContent>

          <TabsContent value="settings" className="animate-fade-in">
            <SettingsPage
              transactions={transactions}
              creditCards={creditCards}
              categories={categories}
              paymentMethods={paymentMethods}
              userSettings={userSettings}
              displayMode={displayMode}
              resolution={resolution}
              locale={locale}
              autostart={autostart}
              onAddCard={addCreditCard}
              onUpdateCard={updateCreditCard}
              onDeleteCard={deleteCreditCard}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              onAddPaymentMethod={addPaymentMethod}
              onUpdatePaymentMethod={updatePaymentMethod}
              onDeletePaymentMethod={deletePaymentMethod}
              onUpdateSettings={updateUserSettings}
              onUpdateDisplayMode={setDisplayMode}
              onUpdateResolution={setResolution}
              onUpdateLocale={setLocale}
              onUpdateAutostart={setAutostart}
              onLoadMockData={handleLoadMockData}
              onClearData={handleClearData}
              onResetOnboarding={handleResetAndPresent}
            />
          </TabsContent>
        </Tabs>
      </main>

      <TransactionForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        editingTransaction={editingTransaction}
        categories={categories}
        paymentMethods={paymentMethods}
        creditCards={creditCards}
        installments={installments}
        onSubmit={addTransaction}
        onUpdate={updateTransaction}
        budgets={budgets}
        spending={monthSpending}
        selectedMonth={selectedMonth}
      />

    </div>
  );
};

export default Index;
