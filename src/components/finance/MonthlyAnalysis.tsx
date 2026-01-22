import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, Category, CreditCardInvoice, Installment } from '@/types/finance';
import { formatCurrency } from '@/lib/finance-utils';
import { TrendingUp, TrendingDown, Scale, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlyAnalysisProps {
  transactions: Transaction[];
  categories: Category[];
  invoices: CreditCardInvoice[];
  installments: Installment[];
  month: string;
}

export function MonthlyAnalysis({ transactions, categories, invoices, installments, month }: MonthlyAnalysisProps) {
  // Calculate income
  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.competenceMonth === month)
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate expenses (cash)
  const cashExpenses = transactions
    .filter(t => t.type === 'expense' && t.competenceMonth === month && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate credit expenses for this competence month
  const creditExpenses = transactions
    .filter(t => t.type === 'expense' && t.competenceMonth === month && t.paymentMethod === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = cashExpenses + creditExpenses;
  const balance = totalIncome - totalExpenses;

  // Spending by category
  const spendingByCategory = categories
    .filter(c => c.type === 'expense')
    .map(category => {
      const spent = transactions
        .filter(t => t.type === 'expense' && t.competenceMonth === month && t.category === category.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return { category, spent };
    })
    .filter(item => item.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  // Get invoice for this month
  const monthInvoice = invoices.find(inv => inv.month === month);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-income-light border-income/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-income">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Entradas</span>
            </div>
            <p className="font-mono font-bold text-lg mt-1 text-income">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-expense-light border-expense/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-expense">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">Saídas</span>
            </div>
            <p className="font-mono font-bold text-lg mt-1 text-expense">
              {formatCurrency(totalExpenses)}
            </p>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <p>Caixa/Débito: {formatCurrency(cashExpenses)}</p>
              <p>Crédito: {formatCurrency(creditExpenses)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'border',
          balance >= 0 ? 'bg-income-light border-income/20' : 'bg-expense-light border-expense/20'
        )}>
          <CardContent className="p-4">
            <div className={cn(
              'flex items-center gap-2',
              balance >= 0 ? 'text-income' : 'text-expense'
            )}>
              <Scale className="h-4 w-4" />
              <span className="text-sm font-medium">Resultado</span>
            </div>
            <p className={cn(
              'font-mono font-bold text-lg mt-1',
              balance >= 0 ? 'text-income' : 'text-expense'
            )}>
              {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending by Category */}
      {spendingByCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spendingByCategory.map(({ category, spent }) => {
                const percentage = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0;
                
                return (
                  <div key={category.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="font-mono text-sm font-medium">
                          {formatCurrency(spent)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: category.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice for this month */}
      {monthInvoice && (
        <Card className="bg-credit-light border-credit/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-credit">Fatura do Mês</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {monthInvoice.installmentIds.length} lançamentos
                </p>
              </div>
              <p className="font-mono font-bold text-lg text-expense">
                {formatCurrency(monthInvoice.totalAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
