import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, Category, CreditCardInvoice, Installment } from '@/types/finance';
import { formatCurrency } from '@/lib/finance-utils';
import { TrendingUp, TrendingDown, Scale, PieChart, BarChart3, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, Legend, Tooltip } from 'recharts';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  // Generate last 6 months for evolution chart
  const currentDate = parseISO(`${month}-01`);
  const last6Months = eachMonthOfInterval({
    start: subMonths(currentDate, 5),
    end: currentDate
  });

  // Calculate balance evolution data
  const balanceEvolutionData = last6Months.map(date => {
    const monthStr = format(date, 'yyyy-MM');
    const monthLabel = format(date, 'MMM', { locale: ptBR });
    
    const income = transactions
      .filter(t => t.type === 'income' && t.competenceMonth === monthStr)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense' && t.competenceMonth === monthStr)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      month: monthLabel,
      monthFull: format(date, 'MMMM yyyy', { locale: ptBR }),
      entradas: income / 100,
      saidas: expenses / 100,
      saldo: (income - expenses) / 100,
    };
  });

  // Calculate cumulative balance
  let cumulativeBalance = 0;
  const cumulativeData = balanceEvolutionData.map(item => {
    cumulativeBalance += item.saldo;
    return {
      ...item,
      saldoAcumulado: cumulativeBalance,
    };
  });

  // Category pie chart data
  const pieChartData = spendingByCategory.slice(0, 6).map(({ category, spent }) => ({
    name: category.name,
    value: spent / 100,
    color: category.color,
  }));

  // Chart config
  const chartConfig = {
    entradas: { label: 'Entradas', color: 'hsl(var(--income))' },
    saidas: { label: 'Saídas', color: 'hsl(var(--expense))' },
    saldo: { label: 'Saldo', color: 'hsl(var(--primary))' },
    saldoAcumulado: { label: 'Saldo Acumulado', color: 'hsl(var(--credit))' },
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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

      {/* Balance Evolution Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Evolução do Saldo (Últimos 6 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={cumulativeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium capitalize">{data.monthFull}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-income">Entradas: {formatTooltipValue(data.entradas)}</p>
                        <p className="text-expense">Saídas: {formatTooltipValue(data.saidas)}</p>
                        <p className="font-medium">Saldo Mês: {formatTooltipValue(data.saldo)}</p>
                        <p className="text-primary font-bold">Acumulado: {formatTooltipValue(data.saldoAcumulado)}</p>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorSaldo)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Income vs Expenses Bar Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Entradas vs Saídas (Últimos 6 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={balanceEvolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium capitalize">{data.monthFull}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-income">Entradas: {formatTooltipValue(data.entradas)}</p>
                        <p className="text-expense">Saídas: {formatTooltipValue(data.saidas)}</p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="entradas" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Spending by Category with Pie Chart */}
      {spendingByCategory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Distribuição por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <RechartsPie width={350} height={250}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatTooltipValue(value)}
                  />
                </RechartsPie>
              </div>
            </CardContent>
          </Card>

          {/* Category List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gastos por Categoria</CardTitle>
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
        </div>
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