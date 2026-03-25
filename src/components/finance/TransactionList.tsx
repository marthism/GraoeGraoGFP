import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Transaction, Category, TransactionStatus, CreditCard as CreditCardType } from '@/types/finance';
import { formatCurrency, isOverdue, getInstallmentMeta, getMonthDisplayName, getEffectiveDate, parseIsoDateLocal } from '@/lib/finance-utils';
import { ArrowDownLeft, ArrowUpRight, CreditCard, CheckCircle, Trash2, Calendar, Filter, List, Pencil } from 'lucide-react';
import { format, parseISO, isAfter, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type RecentFilter = "1d" | "5d" | "7d" | "30d" | "none";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  allTransactions?: Transaction[];
  onUpdateStatus?: (id: string, status: TransactionStatus, paymentDate?: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  title?: string;
  emptyMessage?: string;
  readOnly?: boolean;
  onSelect?: (transaction: Transaction) => void;
  highlightId?: string | null;
  enableFilter?: boolean;
  scrollHeightClass?: string;
  contextMonth?: string;
  creditCards?: CreditCardType[];
}

export function TransactionList({
  transactions,
  categories,
  allTransactions = [],
  onUpdateStatus,
  onDelete,
  onEdit,
  title = "Movimentações",
  emptyMessage = "Nenhuma movimentação encontrada",
  readOnly = false,
  onSelect,
  highlightId,
  enableFilter = false,
  scrollHeightClass,
  contextMonth,
  creditCards,
}: TransactionListProps) {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'pay' | 'delete';
    transaction: Transaction;
  } | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [recentFilter, setRecentFilter] = useState<RecentFilter>(enableFilter ? "5d" : "none");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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
        onUpdateStatus?.(transaction.id, 'paid', paymentDate);
      }
    } else {
      onDelete?.(transaction.id);
    }

    setConfirmAction(null);
    setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  const formatCompetence = (competenceMonth?: string) => {
    if (!competenceMonth) return null;
    const [year, month] = competenceMonth.split('-');
    if (!year || !month) return competenceMonth;
    return `${month}/${year}`;
  };

  const dialogCompetence = formatCompetence(confirmAction?.transaction?.competenceMonth);
  const dialogDueDate = confirmAction?.transaction?.dueDate || confirmAction?.transaction?.transactionDate;

  // Apply filter if enabled
  const filteredTransactions = transactions.filter(tx => {
    if (!enableFilter || recentFilter === "none") return true;
    const effectiveDate = getEffectiveDate(tx, contextMonth, creditCards);
    const txDate = startOfDay(parseIsoDateLocal(effectiveDate));
    const today = startOfDay(new Date());
    const daysBack = recentFilter === "1d" ? 1
      : recentFilter === "5d" ? 5
        : recentFilter === "7d" ? 7
          : recentFilter === "30d" ? 30
            : 0;
    const limitDate = subDays(today, Math.max(daysBack - 1, 0));
    return isAfter(txDate, limitDate) || txDate.getTime() === limitDate.getTime();
  });

  // Group transactions for Dashboard (one line per installmentGroupId)
  const dashboardTransactions = useMemo(() => {
    if (!enableFilter) return filteredTransactions;

    const groups = new Map<string, Transaction>();
    filteredTransactions.forEach(tx => {
      if (tx.installmentGroupId) {
        const existing = groups.get(tx.installmentGroupId);
        // Keep the most recent one within the range
        if (!existing || isAfter(parseIsoDateLocal(getEffectiveDate(tx, contextMonth, creditCards)), parseIsoDateLocal(getEffectiveDate(existing, contextMonth, creditCards)))) {
          groups.set(tx.installmentGroupId, tx);
        }
      } else {
        groups.set(tx.id, tx);
      }
    });
    return Array.from(groups.values());
  }, [filteredTransactions, enableFilter]);

  // Group transactions by date
  const groupedByDate = (recentFilter === "none" && enableFilter ? [] : dashboardTransactions).reduce((groups, tx) => {
    const date = getEffectiveDate(tx, contextMonth, creditCards);
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const groupTransactions = useMemo(() => {
    if (!selectedGroupId) return [];
    return allTransactions
      .filter(t => t.installmentGroupId === selectedGroupId)
      .sort((a, b) => parseIsoDateLocal(getEffectiveDate(a, contextMonth, creditCards)).getTime() - parseIsoDateLocal(getEffectiveDate(b, contextMonth, creditCards)).getTime());
  }, [selectedGroupId, allTransactions]);

  const installmentGroups = useMemo(() => {
    const groups = new Map<string, { totalAmount: number; count: number }>();
    allTransactions.forEach(tx => {
      if (!tx.installmentGroupId) return;
      const current = groups.get(tx.installmentGroupId) || { totalAmount: 0, count: 0 };
      current.totalAmount += tx.amount;
      current.count += 1;
      groups.set(tx.installmentGroupId, current);
    });
    return groups;
  }, [allTransactions]);

  const renderHeader = () => (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
      <CardTitle className="text-base">{title}</CardTitle>
      {enableFilter && (
        <Select value={recentFilter} onValueChange={(v) => setRecentFilter(v as RecentFilter)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <Filter className="h-3 w-3 mr-2" />
            <SelectValue placeholder="Filtro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Último dia</SelectItem>
            <SelectItem value="5d">Últimos 5 dias</SelectItem>
            <SelectItem value="7d">Última semana</SelectItem>
            <SelectItem value="30d">Último mês</SelectItem>
            <SelectItem value="none">Limpar</SelectItem>
          </SelectContent>
        </Select>
      )}
    </CardHeader>
  );

  if (transactions.length === 0 || (enableFilter && recentFilter === "none")) {
    return (
      <Card className="bg-card/40 backdrop-blur-md shadow-sm border-border/50">
        {renderHeader()}
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {recentFilter === "none" && enableFilter ? "Nenhuma movimentação (Filtro Limpar)" : emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 backdrop-blur-md shadow-sm border-border/50">
      {renderHeader()}
      <CardContent className="p-0">
        <div className={cn(scrollHeightClass && 'overflow-y-auto', scrollHeightClass)}>
          {sortedDates.map(date => (
            <div key={date}>
              <div className="px-6 py-2.5 border-y border-border/40 bg-muted/10">
                <p className="text-[13px] font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(parseIsoDateLocal(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <div className="divide-y">
                {groupedByDate[date].map(tx => {
                  const isIncome = tx.type === 'income';
                  const isPending = tx.status === 'pending';
                  const overdue = isPending && isOverdue(getEffectiveDate(tx, contextMonth, creditCards));
                  const highlight = tx.id === highlightId;
                  const instMeta = getInstallmentMeta(tx);
                  const groupInfo = tx.installmentGroupId ? installmentGroups.get(tx.installmentGroupId) : undefined;
                  const installmentsCount = tx.installmentsTotal || groupInfo?.count || 0;
                  const isInstallment = installmentsCount > 1;
                  const installmentTotal = isInstallment
                    ? (groupInfo ? groupInfo.totalAmount : tx.amount * installmentsCount)
                    : tx.amount;

                  return (
                    <div
                      key={tx.id}
                      id={`transaction-${tx.id}`}
                      className={cn(
                        'px-6 py-4 flex items-center justify-between transition-colors animate-fade-in relative',
                        (readOnly && onSelect || isInstallment) && 'cursor-pointer hover:bg-muted/20',
                        !readOnly && 'hover:bg-muted/20',
                        overdue && 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-expense before:rounded-r-full bg-expense/5',
                        highlight && 'ring-1 ring-primary/40 bg-primary/5'
                      )}
                      role={(readOnly && onSelect || isInstallment) ? 'button' : undefined}
                      tabIndex={(readOnly && onSelect || isInstallment) ? 0 : undefined}
                      onClick={() => {
                        if (isInstallment && tx.installmentGroupId) {
                          setSelectedGroupId(tx.installmentGroupId);
                        } else if (readOnly && onSelect) {
                          onSelect(tx);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          if (isInstallment && tx.installmentGroupId) {
                            setSelectedGroupId(tx.installmentGroupId);
                          } else if (readOnly && onSelect) {
                            onSelect(tx);
                          }
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
                          <div className="flex flex-col gap-0.5 mt-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: getCategoryColor(tx.category) }}
                              />
                              <span>{getCategoryName(tx.category)}</span>
                              {tx.paymentMethod === 'credit' && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    Crédito
                                    {instMeta.isInstallment && " • Compra Parcelada"}
                                  </span>
                                </>
                              )}
                            </div>

                            {instMeta.isInstallment && (
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80">
                                {!enableFilter && <span>{instMeta.totalText}</span>}
                              </div>
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
                            {isIncome ? '+' : '-'}{formatCurrency(installmentTotal)}
                          </p>
                          {isInstallment && (
                            <p className="text-[10px] text-muted-foreground leading-none">
                              {installmentsCount}x de {formatCurrency(tx.amount)}
                            </p>
                          )}

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
                              {onEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onEdit(tx);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Alterar</TooltipContent>
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
        </div>
      </CardContent>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'pay' ? 'Confirmar pagamento?' : 'Excluir movimentação?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'pay'
                ? 'Deseja marcar esta movimentação como paga? Escolha a data do pagamento abaixo.'
                : 'Essa ação não pode ser desfeita. Deseja continuar?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmAction?.transaction && (
            <div className="space-y-4">
              <div className="rounded-md border px-4 py-3 text-sm bg-muted/30">
                <p className="font-medium">{confirmAction.transaction.description}</p>
                <p className="text-muted-foreground mt-1">
                  {formatCurrency(confirmAction.transaction.amount)}
                </p>
                <p className="text-muted-foreground">
                  {`Vencimento: ${format(parseISO(dialogDueDate || confirmAction.transaction.transactionDate), 'dd/MM/yyyy')}`}
                  {dialogCompetence ? ` · Competência: ${dialogCompetence}` : ''}
                </p>
              </div>

              {confirmAction.type === 'pay' && (
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Data do Pagamento</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Deixe como hoje ({format(new Date(), 'dd/MM/yyyy')}) ou escolha uma data retroativa.
                  </p>
                </div>
              )}
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

      <Dialog open={!!selectedGroupId} onOpenChange={(open) => !open && setSelectedGroupId(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Detalhes do Parcelamento
            </DialogTitle>
            <DialogDescription>
              {groupTransactions[0]?.description} • {groupTransactions[0]?.installmentsTotal}x de {formatCurrency(groupTransactions[0]?.amount || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 mt-4 scroll-dark">
            {groupTransactions.map((tx) => {
              const overdue = tx.status === 'pending' && isOverdue(tx.transactionDate);
              return (
                <div
                  key={tx.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border bg-card/50",
                    overdue && "border-expense/30 bg-expense/5"
                  )}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Parcela {tx.installmentIndex}/{tx.installmentsTotal}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {getMonthDisplayName(tx.competenceMonth)}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-sm font-mono font-semibold">
                      {formatCurrency(tx.amount)}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-5",
                        tx.status === 'paid' && "badge-paid",
                        tx.status === 'pending' && !overdue && "badge-pending",
                        tx.status === 'pending' && overdue && "badge-overdue"
                      )}
                    >
                      {tx.status === 'paid' ? 'Paga' : overdue ? 'Vencida' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t mt-4 flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Total da compra: <span className="font-mono font-medium text-foreground">{formatCurrency((groupTransactions[0]?.amount || 0) * (groupTransactions[0]?.installmentsTotal || 0))}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedGroupId(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
