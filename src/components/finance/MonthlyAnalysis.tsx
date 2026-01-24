import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, Category } from '@/types/finance';
import { formatCurrency } from '@/lib/finance-utils';
import { TrendingUp, TrendingDown, Scale, PieChart, BarChart3, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartContainer } from '@/components/ui/chart';
import { XAxis, YAxis, CartesianGrid, PieChart as RechartsPie, Pie, Cell, Tooltip, Line, ComposedChart, Bar, ResponsiveContainer } from 'recharts';
import { format, parseISO, subMonths, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyAnalysisProps {
  transactions: Transaction[];
  categories: Category[];
  month: string;
}

export function MonthlyAnalysis({ transactions, categories, month }: MonthlyAnalysisProps) {
  const anchorDate = parseISO(`${month}-01`);
  const monthRange = eachMonthOfInterval({
    start: subMonths(anchorDate, 5),
    end: anchorDate,
  });

  const monthlyData = monthRange.map(date => {
    const monthKey = format(date, 'yyyy-MM');
    const incomeCents = transactions
      .filter(t => t.type === 'income' && t.competenceMonth === monthKey)
      .reduce((sum, t) => sum + t.amount, 0);
    const expenseCents = transactions
      .filter(t => t.type === 'expense' && t.competenceMonth === monthKey)
      .reduce((sum, t) => sum + t.amount, 0);
    const balanceCents = incomeCents - expenseCents;

    return {
      monthKey,
      monthLabel: format(date, 'MM/yyyy'),
      monthFull: format(date, 'MM/yyyy', { locale: ptBR }),
      entradasCents: incomeCents,
      saidasCents: expenseCents,
      saldoCents: balanceCents,
      entradas: incomeCents / 100,
      saidas: expenseCents / 100,
      saldo: balanceCents / 100,
    };
  });

  const selectedMonthData = monthlyData[monthlyData.length - 1];
  const totalIncome = selectedMonthData?.entradasCents ?? 0;
  const totalExpenses = selectedMonthData?.saidasCents ?? 0;
  const balance = selectedMonthData?.saldoCents ?? 0;

  // Spending by category (selected month only)
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

  const balanceEvolutionData = monthlyData.map(item => ({
    mes: item.monthLabel,
    month: item.monthLabel,
    monthFull: item.monthFull,
    entradas: item.entradas,
    saidas: item.saidas,
    saldo: item.saldo,
  }));

  // Category pie chart data
  const pieChartData = spendingByCategory.slice(0, 6).map(({ category, spent }) => ({
    name: category.name,
    value: spent / 100,
    color: category.color,
  }));

  const chartConfig = {
    entradas: { label: 'Entradas', color: 'hsl(var(--income))' },
    saidas: { label: 'Saídas', color: 'hsl(var(--expense))' },
    saldo: { label: 'Saldo Final', color: 'hsl(var(--primary))' },
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
    name,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    outerRadius: number;
    percent: number;
    name: string;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#e5e7eb"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
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
            <ComposedChart data={balanceEvolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                      <p className="font-medium">{data.monthFull}</p>
                      <p className="mt-2 text-sm font-medium">
                        Saldo do mês: {formatTooltipValue(data.saldo)}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Income vs Expenses Bar Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Entradas e Saídas (Últimos 6 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={balanceEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium">{data.monthFull}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="text-income">Entradas: {formatTooltipValue(data.entradas)}</p>
                        <p className="text-expense">Saídas: {formatTooltipValue(data.saidas)}</p>
                        <p className="font-medium">Saldo Final: {formatTooltipValue(data.saldo)}</p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="entradas" fill="#22c55e" />
              <Bar dataKey="saidas" fill="#ef4444" />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="#facc15"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={260}>
                <RechartsPie margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    labelLine
                    label={renderCustomizedLabel}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatTooltipValue(value)}
                  />
                </RechartsPie>
              </ResponsiveContainer>
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
                  const percentageLabel = percentage.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  });

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
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatCurrency(spent)} · Uso: {percentageLabel}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: category.color,
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
    </div>
  );
}
