import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreditCardInvoice, Installment, Transaction, Category } from '@/types/finance';
import { formatCurrency, isOverdue, getMonthDisplayName } from '@/lib/finance-utils';
import { CreditCard, ChevronDown, Check, Calendar, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface InvoiceListProps {
  invoices: CreditCardInvoice[];
  installments: Installment[];
  transactions: Transaction[];
  categories: Category[];
  onPayInvoice: (invoiceId: string) => void;
}

export function InvoiceList({ invoices, installments, transactions, categories, onPayInvoice }: InvoiceListProps) {
  const [openInvoices, setOpenInvoices] = useState<string[]>([]);

  const sortedInvoices = [...invoices].sort((a, b) => b.month.localeCompare(a.month));

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getTransactionForInstallment = (installment: Installment) => {
    return transactions.find(t => t.id === installment.transactionId);
  };

  const toggleInvoice = (invoiceId: string) => {
    setOpenInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  if (sortedInvoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Faturas do Cartão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma fatura registrada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Faturas do Cartão
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {sortedInvoices.map(invoice => {
            const overdue = invoice.status === 'pending' && isOverdue(invoice.dueDate);
            const isOpen = openInvoices.includes(invoice.id);
            const invoiceInstallments = installments.filter(
              inst => invoice.installmentIds.includes(inst.id)
            );

            return (
              <Collapsible 
                key={invoice.id}
                open={isOpen}
                onOpenChange={() => toggleInvoice(invoice.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    'px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors',
                    overdue && 'bg-expense-light/50'
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'p-2 rounded-lg',
                        invoice.status === 'paid' ? 'bg-income/15 text-income' : 'bg-credit/15 text-credit'
                      )}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      
                      <div>
                        <p className="font-medium capitalize">
                          {format(parseISO(invoice.month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Vence em {format(parseISO(invoice.dueDate), "dd/MM/yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {invoiceInstallments.length} lançamentos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono font-semibold text-expense">
                          {formatCurrency(invoice.totalAmount)}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs mt-1',
                            invoice.status === 'paid' && 'badge-paid',
                            invoice.status === 'pending' && !overdue && 'badge-pending',
                            invoice.status === 'pending' && overdue && 'badge-overdue'
                          )}
                        >
                          {invoice.status === 'paid' ? 'Paga' : overdue ? 'Vencida' : 'Pendente'}
                        </Badge>
                      </div>

                      <ChevronDown className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                      )} />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-6 pb-4 pt-2 space-y-2 bg-muted/30">
                    {invoiceInstallments.map(inst => {
                      const tx = getTransactionForInstallment(inst);
                      if (!tx) return null;

                      return (
                        <div 
                          key={inst.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {getCategoryName(tx.category)}
                                {inst.totalInstallments > 1 && (
                                  <span className="ml-1">
                                    • Parcela {inst.installmentNumber}/{inst.totalInstallments}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <p className="font-mono text-sm font-medium">
                            {formatCurrency(inst.amount)}
                          </p>
                        </div>
                      );
                    })}

                    {invoice.status === 'pending' && (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onPayInvoice(invoice.id);
                        }}
                        className="w-full mt-2 gap-2"
                        variant="default"
                      >
                        <Check className="h-4 w-4" />
                        Pagar Fatura
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
