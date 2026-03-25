import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Category, MonthlyBudget } from '@/types/finance';
import { formatCurrency, parseCurrencyToCents } from '@/lib/finance-utils';
import { PieChart, Target, AlertTriangle, CheckCircle, Settings2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getCurrencySymbol, t } from '@/i18n';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BudgetOverviewProps {
  categories: Category[];
  spending: Record<string, number>;
  budgets: MonthlyBudget[];
  month: string;
  onSetBudget: (categoryId: string, month: string, amount: number) => void;
  onClearBudgets: () => void;
}

export function BudgetOverview({ categories, spending, budgets, month, onSetBudget, onClearBudgets }: BudgetOverviewProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const currencySymbol = getCurrencySymbol();

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
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
          onClick={() => setShowClearConfirm(true)}
        >
          <Trash2 className="h-4 w-4" />
          Limpar Orçamentos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-[1fr_auto] gap-6">
            <CardTitle className="text-base flex items-center gap-2 min-w-0">
              <Target className="h-5 w-5 shrink-0" />
              <span className="truncate">{t('budget.title')}</span>
            </CardTitle>
            
            <div className="grid grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_90px_44px] items-center gap-4">
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Orçado</p>
                <p className="font-mono font-bold tabular-nums whitespace-nowrap text-sm md:text-base">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Realizado</p>
                <p className={cn(
                  'font-mono font-bold tabular-nums whitespace-nowrap text-sm md:text-base',
                  isOverBudget ? 'text-expense' : 'text-foreground'
                )}>
                  {formatCurrency(totalSpending)}
                </p>
              </div>
              <div className="text-center whitespace-nowrap">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Uso %</p>
                <p className="text-xs font-medium">{totalPercentage.toFixed(1)}%</p>
              </div>
              <div className="flex justify-center">
                <div className="w-8" />
              </div>
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

              const usagePercentage = budget > 0 ? ((spent / budget) * 100).toFixed(1) : '0';

              return (
                <div key={category.id} className="space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-6 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium truncate">{category.name}</span>
                      {isOver && (
                        <AlertTriangle className="h-3.5 w-3.5 text-expense shrink-0" />
                      )}
                      {!isOver && percentage === 100 && (
                        <CheckCircle className="h-3.5 w-3.5 text-income shrink-0" />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_90px_44px] items-center gap-4">
                      <div className="text-left font-mono tabular-nums whitespace-nowrap text-sm">
                        {budget > 0 ? formatCurrency(budget) : '-'}
                      </div>
                      
                      <div className={cn(
                        'text-left font-mono tabular-nums whitespace-nowrap text-sm',
                        isOver ? 'text-expense' : 'text-muted-foreground'
                      )}>
                        {formatCurrency(spent)}
                      </div>
                      
                      <div className="text-center whitespace-nowrap">
                        <span className="text-[10px] font-sans uppercase opacity-70">
                          {usagePercentage}%
                        </span>
                      </div>

                      <div className="flex justify-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => handleEditBudget(category)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                {t('budget.emptyTitle')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('budget.emptySubtitle')}
              </p>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-credit-light border border-credit/20">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <strong>{t('budget.noteTitle')}</strong> {t('budget.noteBody')}
            </p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar orçamentos?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá os orçamentos cadastrados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onClearBudgets();
                setShowClearConfirm(false);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('budget.dialogTitle')}</DialogTitle>
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
              <Label htmlFor="budget">{t('budget.dialogLabel')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol || 'R$'}
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
