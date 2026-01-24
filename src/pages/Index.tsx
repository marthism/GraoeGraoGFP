import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Header } from '@/components/layout/Header';
import { BalanceCard } from '@/components/finance/BalanceCard';
import { PendingWindow } from '@/components/finance/PendingWindow';
import { TransactionForm } from '@/components/finance/TransactionForm';
import { TransactionList } from '@/components/finance/TransactionList';
import { InvoiceList } from '@/components/finance/InvoiceList';
import { BudgetOverview } from '@/components/finance/BudgetOverview';
import { MonthlyAnalysis } from '@/components/finance/MonthlyAnalysis';
import { CreditCardAnalysis } from '@/components/finance/CreditCardAnalysis';
import { SettingsPage } from '@/components/finance/SettingsPage';
import { MonthSelector } from '@/components/finance/MonthSelector';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { calculateSummary, getCurrentMonth, formatCurrency } from '@/lib/finance-utils';
import { generateMockData } from '@/lib/mock-data';
import { LayoutDashboard, Receipt, CreditCard, Target, BarChart3, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMonthInstallments, setShowMonthInstallments] = useState(false);
  const [highlightTransactionId, setHighlightTransactionId] = useState<string | null>(null);
  const [tabsScrolled, setTabsScrolled] = useState(false);

  const {
    transactions,
    installments,
    invoices,
    categories,
    budgets,
    creditCards,
    userSettings,
    addTransaction,
    updateTransactionStatus,
    deleteTransaction,
    payInvoice,
    setBudget,
    getSpendingByCategory,
    getTransactionsByMonth,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    updateUserSettings,
    loadMockData,
    resetData,
    resetApp,
  } = useFinanceStore();

  const summary = calculateSummary(transactions, installments, invoices);
  const monthTransactions = getTransactionsByMonth(selectedMonth);
  const monthSpending = getSpendingByCategory(selectedMonth);

  const handleLoadMockData = () => {
    const mockData = generateMockData();
    loadMockData(mockData);
    toast.success('Dados de demonstração carregados!');
  };

  const handleClearData = () => {
    resetData();
    toast.success('Todos os dados foram removidos');
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

      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div
            className={cn(
              "sticky top-16 z-20 -mx-4 px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
              "bg-slate-900/75 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10",
              tabsScrolled && "bg-slate-900/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            )}
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Movimentações</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cartões</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Orçamento</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Análise</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </TabsList>

            {activeTab !== 'dashboard' && activeTab !== 'settings' && (
              <MonthSelector 
                currentMonth={selectedMonth} 
                onChange={setSelectedMonth} 
              />
            )}
          </div>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <BalanceCard
                title="Saldo Atual"
                amount={summary.currentBalance}
                type="current"
                subtitle="Apenas movimentações concluídas"
              />
              <BalanceCard
                title="Saldo Projetado"
                amount={summary.projectedBalance}
                type="projected"
                subtitle="Inclui pendentes"
              />
              <BalanceCard
                title="A Receber"
                amount={summary.pendingIncome}
                type="income"
                subtitle="Entradas pendentes"
              />
              <BalanceCard
                title="A Pagar"
                amount={summary.pendingExpenses}
                type="expense"
                subtitle="Inclui faturas"
              />
            </div>

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
              transactions={transactions.slice(-10).reverse()}
              categories={categories}
              readOnly
              onSelect={handleRecentSelect}
              title="Movimentações Recentes"
              emptyMessage="Nenhuma movimentação registrada. Clique em 'Nova Movimentação' para começar."
            />
          </TabsContent>

          <TabsContent value="transactions" className="animate-fade-in">
            <TransactionList transactions={monthTransactions} categories={categories} onUpdateStatus={updateTransactionStatus} onDelete={deleteTransaction} highlightId={highlightTransactionId} title="Movimentações do Mês" emptyMessage="Nenhuma movimentação neste mês" />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6 animate-fade-in">
            {/* Fatura do Mês */}
            {(() => {
              const monthInvoices = invoices.filter(inv => inv.month === selectedMonth);
              const totalInvoiceAmount = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
              const totalInstallments = monthInvoices.reduce((sum, inv) => sum + inv.installmentIds.length, 0);
              const monthInstallments = installments.filter(inst => inst.dueMonth === selectedMonth);
              return totalInvoiceAmount > 0 ? (
                <Collapsible open={showMonthInstallments} onOpenChange={setShowMonthInstallments}>
                  <Card className="bg-credit-light border-credit/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-credit">Fatura do Mês</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {totalInstallments} lançamentos
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-lg text-expense">
                            {formatCurrency(totalInvoiceAmount)}
                          </p>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm">
                              Ver os Lançamentos
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </CardContent>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {monthInstallments.map(installment => {
                            const transaction = transactions.find(t => t.id === installment.transactionId);
                            const category = categories.find(c => c.id === transaction?.category);
                            return (
                              <div key={installment.id} className="flex items-center justify-between py-2 border-t">
                                <div>
                                  <p className="text-sm font-medium">{transaction?.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {category?.name} • {installment.installmentNumber}/{installment.totalInstallments}
                                  </p>
                                </div>
                                <p className="font-mono font-semibold">
                                  {formatCurrency(installment.amount)}
                                </p>
                              </div>
                            );
                          })}
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
            <BudgetOverview categories={categories} spending={monthSpending} budgets={budgets} month={selectedMonth} onSetBudget={setBudget} />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6 animate-fade-in">
            <MonthlyAnalysis transactions={transactions} categories={categories} month={selectedMonth} />
          </TabsContent>

          <TabsContent value="settings" className="animate-fade-in">
            <SettingsPage
              creditCards={creditCards}
              userSettings={userSettings}
              onAddCard={addCreditCard}
              onUpdateCard={updateCreditCard}
              onDeleteCard={deleteCreditCard}
              onUpdateSettings={updateUserSettings}
              onLoadMockData={handleLoadMockData}
              onClearData={handleClearData}
              onResetOnboarding={handleResetAndPresent}
            />
          </TabsContent>
        </Tabs>
      </main>

      <TransactionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={categories}
        creditCards={creditCards}
        installments={installments}
        onSubmit={addTransaction}
      />

    </div>
  );
};

export default Index;
