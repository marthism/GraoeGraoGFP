import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Transaction, Category, TransactionStatus } from '@/types/finance';
import { formatCurrency, isOverdue } from '@/lib/finance-utils';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Wallet, MoreVertical, Check, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onUpdateStatus: (id: string, status: TransactionStatus) => void;
  onDelete: (id: string) => void;
  title?: string;
  emptyMessage?: string;
}

export function TransactionList({ 
  transactions, 
  categories, 
  onUpdateStatus, 
  onDelete,
  title = "Movimentações",
  emptyMessage = "Nenhuma movimentação encontrada"
}: TransactionListProps) {
  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.color || 'hsl(0, 0%, 50%)';
  };

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

                return (
                  <div 
                    key={tx.id}
                    className={cn(
                      'px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors animate-fade-in',
                      overdue && 'bg-expense-light/50'
                    )}
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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isPending && tx.paymentMethod !== 'credit' && (
                            <DropdownMenuItem onClick={() => onUpdateStatus(tx.id, 'paid')}>
                              <Check className="h-4 w-4 mr-2" />
                              Marcar como {isIncome ? 'recebido' : 'pago'}
                            </DropdownMenuItem>
                          )}
                          {tx.status === 'paid' && tx.paymentMethod !== 'credit' && (
                            <DropdownMenuItem onClick={() => onUpdateStatus(tx.id, 'pending')}>
                              Marcar como pendente
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => onDelete(tx.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
