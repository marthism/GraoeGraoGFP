import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Category, MonthlyBudget } from '@/types/finance';
import { formatCurrency, parseCurrencyToCents } from '@/lib/finance-utils';
import { PieChart, Target, AlertTriangle, CheckCircle, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface BudgetOverviewProps {
  categories: Category[];
  spending: Record<string, number>;
  budgets: MonthlyBudget[];
  month: string;
  onSetBudget: (categoryId: string, month: string, amount: number) => void;
}

export function BudgetOverview({ categories, spending, budgets, month, onSetBudget }: BudgetOverviewProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [budgetInput, setBudgetInput] = useState('');

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const getBudgetForCategory = (categoryId: string): number => {
    return budgets.find(b => b.categoryId === categoryId && b.month === month)?.budgetAmount || 0;
  };

  const getTotalBudget = () => {
    return expenseCategories.reduce((sum, cat) => sum + getBudgetForCategory(cat.id), 0);
  };

  const getTotalSpending = () => {
    return Object.values(spending).reduce((sum, val) => sum + val, 0);
  };

  const handleEditBudget = (category: Category) => {
    setEditingCategory(category);
    const currentBudget = getBudgetForCategory(category.id);
    setBudgetInput(currentBudget > 0 ? (currentBudget / 100).toFixed(2) : '');
  };

  const handleSaveBudget = () => {
    if (!editingCategory) return;
    const amount = parseCurrencyToCents(budgetInput);
    onSetBudget(editingCategory.id, month, amount);
    setEditingCategory(null);
    setBudgetInput('');
  };

  const totalBudget = getTotalBudget();
  const totalSpending = getTotalSpending();
  const totalPercentage = totalBudget > 0 ? Math.min((totalSpending / totalBudget) * 100, 100) : 0;
  const isOverBudget = totalSpending > totalBudget && totalBudget > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5" />
              Orçamento Mensal
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Gasto / Orçado</p>
              <p className={cn(
                'font-mono font-semibold',
                isOverBudget ? 'text-expense' : 'text-foreground'
              )}>
                {formatCurrency(totalSpending)} / {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>
          {totalBudget > 0 && (
            <div className="mt-3">
              <Progress 
                value={totalPercentage} 
                className={cn(
                  'h-2',
                  isOverBudget && '[&>div]:bg-expense'
                )}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenseCategories.map(category => {
              const spent = spending[category.id] || 0;
              const budget = getBudgetForCategory(category.id);
              const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              const isOver = spent > budget && budget > 0;
              const isNearLimit = percentage >= 80 && percentage < 100;

              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium">{category.name}</span>
                      {isOver && (
                        <AlertTriangle className="h-3.5 w-3.5 text-expense" />
                      )}
                      {!isOver && percentage === 100 && (
                        <CheckCircle className="h-3.5 w-3.5 text-income" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-mono',
                        isOver ? 'text-expense' : 'text-muted-foreground'
                      )}>
                        {formatCurrency(spent)}
                        {budget > 0 && ` / ${formatCurrency(budget)}`}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => handleEditBudget(category)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {budget > 0 && (
                    <Progress 
                      value={percentage}
                      className={cn(
                        'h-1.5',
                        isOver && '[&>div]:bg-expense',
                        isNearLimit && !isOver && '[&>div]:bg-warning'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {totalBudget === 0 && (
            <div className="text-center py-4 mt-4 rounded-lg bg-muted/50">
              <PieChart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Defina orçamentos para cada categoria
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique no ícone de editar ao lado de cada categoria
              </p>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-credit-light border border-credit/20">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <strong>Nota:</strong> Gastos no crédito contam no orçamento pelo mês da compra, mesmo que o pagamento ocorra no futuro.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: editingCategory?.color }}
              />
              <span className="font-medium">{editingCategory?.name}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Valor do Orçamento</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="budget"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="pl-10 font-mono"
                />
              </div>
            </div>
            <Button onClick={handleSaveBudget} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
