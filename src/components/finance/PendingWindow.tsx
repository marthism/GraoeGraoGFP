import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getPendingInWindow, isOverdue, getEffectiveDate, parseIsoDateLocal } from '@/lib/finance-utils';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Transaction, Installment, CreditCardInvoice } from '@/types/finance';
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Calendar, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocale, t } from '@/i18n';

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
    ? `${t('pending.toReceive')} - ${t('pending.days', { count: days })}`
    : `${t('pending.toPay')} - ${t('pending.days', { count: days })}`;

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className={cn(
      'animate-slide-up bg-card/40 backdrop-blur-md shadow-sm',
      type === 'income' ? 'border-t-2 border-t-income border-x-border/50 border-b-border/50' : 'border-t-2 border-t-expense border-x-border/50 border-b-border/50'
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Icon className={cn(
                'h-4 w-4',
                type === 'income' ? 'text-income' : 'text-expense'
              )} />
              {title}
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className={cn(
                'text-lg font-bold font-mono',
                type === 'income' ? 'text-income' : 'text-expense'
              )}>
                <AnimatedNumber value={result.total} formatFn={formatCurrency} duration={1200} />
              </span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-muted-foreground hover:bg-muted/20">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {!hasItems ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('pending.empty')}
              </p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto scroll-dark pr-1">
                {result.transactions.map(tx => {
                  const effectiveDate = getEffectiveDate(tx);
                  const overdue = isOverdue(effectiveDate);
                  return (
                    <div
                      key={tx.id}
                      className={cn(
                        'flex items-center justify-between py-3 border-b border-border/40 last:border-0 relative',
                        overdue && 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-expense before:rounded-full bg-expense/5 pl-4 -ml-4 rounded-r-lg'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-1.5 rounded-md flex-shrink-0',
                          overdue ? 'text-expense bg-expense/10' : 'text-muted-foreground bg-muted/40'
                        )}>
                          {overdue ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Calendar className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat(getLocale(), { day: '2-digit', month: 'short' }).format(parseIsoDateLocal(effectiveDate))}
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
                            {t('pending.overdue')}
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
                        'flex items-center justify-between py-3 border-b border-border/40 last:border-0 relative',
                        overdue && 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-expense before:rounded-full bg-expense/5 pl-4 -ml-4 rounded-r-lg'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-1.5 rounded-md flex-shrink-0',
                          overdue ? 'text-expense bg-expense/10' : 'text-credit bg-credit/10'
                        )}>
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t('pending.invoiceTitle')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('pending.dueOn', { date: new Intl.DateTimeFormat(getLocale(), { day: '2-digit', month: 'short' }).format(parseIsoDateLocal(inv.dueDate)) })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-expense">
                          {formatCurrency(inv.totalAmount)}
                        </p>
                        {overdue && (
                          <Badge variant="destructive" className="text-xs">
                            {t('pending.overdueInvoice')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
