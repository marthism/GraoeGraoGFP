import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { calculateSummary, getCurrentMonth } from '@/lib/finance-utils';
import { generateMockData } from '@/lib/mock-data';
import { LayoutDashboard, Receipt, CreditCard, Target, BarChart3, Settings } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [activeTab, setActiveTab] = useState('dashboard');

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
    clearAllData,
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
    clearAllData();
    toast.success('Todos os dados foram removidos');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onAddTransaction={() => setIsFormOpen(true)} userName={userSettings.userName} />

      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                <span className="hidden sm:inline">Faturas</span>
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
              onUpdateStatus={updateTransactionStatus}
              onDelete={deleteTransaction}
              title="Movimentações Recentes"
              emptyMessage="Nenhuma movimentação registrada. Clique em 'Nova Movimentação' para começar."
            />
          </TabsContent>

          <TabsContent value="transactions" className="animate-fade-in">
            <TransactionList transactions={monthTransactions} categories={categories} onUpdateStatus={updateTransactionStatus} onDelete={deleteTransaction} title="Movimentações do Mês" emptyMessage="Nenhuma movimentação neste mês" />
          </TabsContent>

          <TabsContent value="invoices" className="animate-fade-in">
            <InvoiceList invoices={invoices} installments={installments} transactions={transactions} categories={categories} onPayInvoice={payInvoice} creditCards={creditCards} />
          </TabsContent>

          <TabsContent value="budget" className="animate-fade-in">
            <BudgetOverview categories={categories} spending={monthSpending} budgets={budgets} month={selectedMonth} onSetBudget={setBudget} />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6 animate-fade-in">
            <MonthlyAnalysis transactions={transactions} categories={categories} invoices={invoices} installments={installments} month={selectedMonth} />
            <CreditCardAnalysis transactions={transactions} creditCards={creditCards} invoices={invoices} installments={installments} categories={categories} month={selectedMonth} />
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
            />
          </TabsContent>
        </Tabs>
      </main>

      <TransactionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={categories}
        creditCards={creditCards}
        onSubmit={addTransaction}
      />
    </div>
  );
};

export default Index;