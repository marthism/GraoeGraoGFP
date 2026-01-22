import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getPendingInWindow, isOverdue } from '@/lib/finance-utils';
import { Transaction, Installment, CreditCardInvoice } from '@/types/finance';
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingWindowProps {
  transactions: Transaction[];
  installments: Installment[];
  invoices: CreditCardInvoice[];
  type: 'income' | 'expense';
  days: 7 | 15;
}

export function PendingWindow({ transactions, installments, invoices, type, days }: PendingWindowProps) {
  const result = getPendingInWindow(transactions, installments, invoices, days, type);
  const hasItems = result.transactions.length > 0 || result.invoices.length > 0;

  const Icon = type === 'income' ? ArrowDownLeft : ArrowUpRight;
  const title = type === 'income' 
    ? `A Receber - ${days} dias` 
    : `A Pagar - ${days} dias`;

  return (
    <Card className={cn(
      'animate-slide-up',
      type === 'income' ? 'border-income/20' : 'border-expense/20'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Icon className={cn(
              'h-4 w-4',
              type === 'income' ? 'text-income' : 'text-expense'
            )} />
            {title}
          </CardTitle>
          <span className={cn(
            'text-lg font-bold font-mono',
            type === 'income' ? 'text-income' : 'text-expense'
          )}>
            {formatCurrency(result.total)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasItems ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum item pendente
          </p>
        ) : (
          <div className="space-y-2">
            {result.transactions.map(tx => {
              const overdue = isOverdue(tx.transactionDate);
              return (
                <div 
                  key={tx.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    overdue ? 'bg-expense-light' : 'bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-1.5 rounded-md',
                      overdue ? 'bg-expense/15 text-expense' : 'bg-muted'
                    )}>
                      {overdue ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(tx.transactionDate), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-mono font-semibold',
                      type === 'income' ? 'text-income' : 'text-expense'
                    )}>
                      {formatCurrency(tx.amount)}
                    </p>
                    {overdue && (
                      <Badge variant="destructive" className="text-xs">
                        Vencido
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {result.invoices.map(inv => {
              const overdue = isOverdue(inv.dueDate);
              return (
                <div 
                  key={inv.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    overdue ? 'bg-expense-light' : 'bg-credit-light'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-1.5 rounded-md',
                      overdue ? 'bg-expense/15 text-expense' : 'bg-credit/15 text-credit'
                    )}>
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Fatura do Cartão</p>
                      <p className="text-xs text-muted-foreground">
                        Vence em {format(parseISO(inv.dueDate), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-expense">
                      {formatCurrency(inv.totalAmount)}
                    </p>
                    {overdue && (
                      <Badge variant="destructive" className="text-xs">
                        Vencida
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
