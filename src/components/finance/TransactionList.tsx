import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Transaction, Category, TransactionStatus } from '@/types/finance';
import { formatCurrency, isOverdue } from '@/lib/finance-utils';
import { ArrowDownLeft, ArrowUpRight, CreditCard, CheckCircle, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onUpdateStatus?: (id: string, status: TransactionStatus) => void;
  onDelete?: (id: string) => void;
  title?: string;
  emptyMessage?: string;
  readOnly?: boolean;
  onSelect?: (transaction: Transaction) => void;
  highlightId?: string | null;
}

export function TransactionList({ 
  transactions, 
  categories, 
  onUpdateStatus, 
  onDelete,
  title = "Movimentações",
  emptyMessage = "Nenhuma movimentação encontrada",
  readOnly = false,
  onSelect,
  highlightId,
}: TransactionListProps) {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'pay' | 'delete';
    transaction: Transaction;
  } | null>(null);

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.color || 'hsl(0, 0%, 50%)';
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, transaction } = confirmAction;

    if (type === 'pay') {
      if (transaction.status !== 'paid') {
        onUpdateStatus?.(transaction.id, 'paid');
      }
    } else {
      onDelete?.(transaction.id);
    }

    setConfirmAction(null);
  };

  const formatCompetence = (competenceMonth?: string) => {
    if (!competenceMonth) return null;
    const [year, month] = competenceMonth.split('-');
    if (!year || !month) return competenceMonth;
    return `${month}/${year}`;
  };

  const dialogCompetence = formatCompetence(confirmAction?.transaction?.competenceMonth);

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group transactions by date
  const groupedByDate = transactions.reduce((groups, tx) => {
    const date = tx.transactionDate;
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sortedDates.map(date => (
          <div key={date}>
            <div className="px-6 py-2 bg-muted/50 border-y">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div className="divide-y">
              {groupedByDate[date].map(tx => {
                const isIncome = tx.type === 'income';
                const isPending = tx.status === 'pending';
                const overdue = isPending && isOverdue(tx.transactionDate);
                const highlight = tx.id === highlightId;

                return (
                  <div 
                    key={tx.id}
                    id={`transaction-${tx.id}`}
                    className={cn(
                      'px-6 py-4 flex items-center justify-between transition-colors animate-fade-in',
                      readOnly && onSelect && 'cursor-pointer hover:bg-muted/30',
                      !readOnly && 'hover:bg-muted/30',
                      overdue && 'bg-expense-light/50',
                      highlight && 'ring-2 ring-primary/40 bg-primary/5'
                    )}
                    role={readOnly && onSelect ? 'button' : undefined}
                    tabIndex={readOnly && onSelect ? 0 : undefined}
                    onClick={() => {
                      if (readOnly && onSelect) {
                        onSelect(tx);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!readOnly || !onSelect) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(tx);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'p-2 rounded-lg',
                        isIncome ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense'
                      )}>
                        {isIncome ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span 
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: getCategoryColor(tx.category) }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {getCategoryName(tx.category)}
                          </span>
                          {tx.paymentMethod === 'credit' && (
                            <Badge variant="outline" className="text-xs gap-1 bg-credit-light text-credit border-credit/30">
                              <CreditCard className="h-3 w-3" />
                              Crédito
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn(
                          'font-mono font-semibold',
                          isIncome ? 'text-income' : 'text-expense'
                        )}>
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs mt-1',
                            tx.status === 'paid' && 'badge-paid',
                            tx.status === 'pending' && !overdue && 'badge-pending',
                            tx.status === 'pending' && overdue && 'badge-overdue'
                          )}
                        >
                          {tx.status === 'paid' 
                            ? (isIncome ? 'Recebido' : 'Pago')
                            : overdue ? 'Vencido' : 'Pendente'
                          }
                        </Badge>
                      </div>

                      {!readOnly && (
                        <TooltipProvider delayDuration={0}>
                          <div className="flex items-center gap-1">
                            {isPending && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-500 hover:text-emerald-500"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setConfirmAction({ type: 'pay', transaction: tx });
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Marcar como pago</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setConfirmAction({ type: 'delete', transaction: tx });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'pay' ? 'Confirmar pagamento?' : 'Excluir movimentação?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'pay'
                ? 'Deseja marcar esta movimentação como paga?'
                : 'Essa ação não pode ser desfeita. Deseja continuar?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction?.transaction && (
            <div className="rounded-md border px-4 py-3 text-sm">
              <p className="font-medium">{confirmAction.transaction.description}</p>
              <p className="text-muted-foreground mt-1">
                {formatCurrency(confirmAction.transaction.amount)}
              </p>
              <p className="text-muted-foreground">
                {`Data: ${format(parseISO(confirmAction.transaction.transactionDate), 'dd/MM/yyyy')}`}
                {dialogCompetence ? ` · Competência: ${dialogCompetence}` : ''}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                confirmAction?.type === 'delete' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
              onClick={handleConfirm}
            >
              {confirmAction?.type === 'pay' ? 'Confirmar' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
