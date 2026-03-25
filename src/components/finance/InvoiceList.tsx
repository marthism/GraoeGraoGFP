import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreditCardInvoice, Installment, Transaction, Category } from '@/types/finance';
import { formatCurrency, isOverdue, getMonthDisplayName } from '@/lib/finance-utils';
import { CreditCard, ChevronDown, Check, Calendar, Receipt, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface InvoiceListProps {
  invoices: CreditCardInvoice[];
  installments: Installment[];
  transactions: Transaction[];
  categories: Category[];
  onPayInvoice: (invoiceId: string, paymentDate?: string) => void;
  selectedMonth: string;
}

export function InvoiceList({ invoices, installments, transactions, categories, onPayInvoice, selectedMonth }: InvoiceListProps) {
  const [openInvoices, setOpenInvoices] = useState<string[]>([]);
  const [confirmPayInvoice, setConfirmPayInvoice] = useState<CreditCardInvoice | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Generate 5 consecutive months starting from the month AFTER selectedMonth
  const months = [];
  for (let i = 1; i <= 5; i++) {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + i, 1);
    months.push(format(date, 'yyyy-MM'));
  }

  // Group invoices by month
  const invoicesByMonth = invoices.reduce((acc, invoice) => {
    if (!acc[invoice.month]) {
      acc[invoice.month] = [];
    }
    acc[invoice.month].push(invoice);
    return acc;
  }, {} as Record<string, CreditCardInvoice[]>);

  // Create month data
  const monthData = months.map(month => {
    const monthInvoices = invoicesByMonth[month] || [];
    const totalAmount = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const hasOverdue = monthInvoices.some(inv => isOverdue(inv.dueDate));
    const allPaid = monthInvoices.length > 0 && monthInvoices.every(inv => inv.status === 'paid');
    const status = monthInvoices.length === 0 ? 'empty' : hasOverdue ? 'overdue' : allPaid ? 'paid' : 'pending';

    return {
      month,
      totalAmount,
      status,
      invoices: monthInvoices,
    };
  });

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getTransactionForInstallment = (installment: Installment) => {
    return transactions.find(t => t.id === installment.transactionId);
  };

  const toggleInvoice = (month: string) => {
    setOpenInvoices(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  if (monthData.length === 0) {
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
            Nenhuma fatura encontrada.
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
          {monthData.map(({ month, totalAmount, status, invoices: monthInvoices }) => {
            const isOpen = openInvoices.includes(month);
            const overdue = status === 'overdue';

            return (
              <Collapsible 
                key={month}
                open={isOpen}
                onOpenChange={() => toggleInvoice(month)}
              >
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    'px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors',
                    overdue && 'bg-expense-light/50'
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'p-2 rounded-lg',
                        status === 'paid' ? 'bg-income/15 text-income' : status === 'empty' ? 'bg-muted text-muted-foreground' : 'bg-credit/15 text-credit'
                      )}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                      
                      <div>
                        <p className="font-medium capitalize">
                          {getMonthDisplayName(month)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {monthInvoices.length} faturas
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono font-semibold text-expense">
                          {formatCurrency(totalAmount)}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs mt-1',
                            status === 'paid' && 'badge-paid',
                            status === 'pending' && 'badge-pending',
                            status === 'overdue' && 'badge-overdue',
                            status === 'empty' && 'bg-muted text-muted-foreground'
                          )}
                        >
                          {status === 'paid' ? 'Paga' : status === 'overdue' ? 'Vencida' : status === 'pending' ? 'Pendente' : 'Sem faturas'}
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
                    {monthInvoices.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma fatura neste mês.
                      </p>
                    ) : (
                      monthInvoices.map(invoice => {
                        const invoiceInstallments = installments.filter(
                          inst => invoice.installmentIds.includes(inst.id)
                        );

                        return (
                          <div key={invoice.id} className="space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-card">
                              <div className="flex items-center gap-3">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {invoice.creditCardId} - {format(parseISO(invoice.dueDate), "dd/MM/yyyy")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {invoiceInstallments.length} lançamentos
                                  </p>
                                </div>
                              </div>
                              <p className="font-mono text-sm font-medium">
                                {formatCurrency(invoice.totalAmount)}
                              </p>
                            </div>

                            {invoiceInstallments.map(inst => {
                              const tx = getTransactionForInstallment(inst);
                              if (!tx) return null;

                              return (
                                <div 
                                  key={inst.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-card ml-6"
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
                                  setConfirmPayInvoice(invoice);
                                }}
                                className="w-full mt-2 gap-2 ml-6"
                                variant="default"
                              >
                                <Check className="h-4 w-4" />
                                Pagar Fatura
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>

      <AlertDialog open={!!confirmPayInvoice} onOpenChange={(open) => !open && setConfirmPayInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento da fatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja pagar essa fatura? Todos os lançamentos vinculados serão marcados como pagos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {confirmPayInvoice && (
            <div className="space-y-4">
              <div className="rounded-md border px-4 py-3 text-sm bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cartão:</span>
                  <span className="font-medium">{confirmPayInvoice.creditCardId}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground">Mês:</span>
                  <span className="font-medium capitalize">{getMonthDisplayName(confirmPayInvoice.month)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground text-lg">Total:</span>
                  <span className="font-mono font-bold text-lg text-expense">
                    {formatCurrency(confirmPayInvoice.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoicePaymentDate">Data do Pagamento</Label>
                <Input
                  id="invoicePaymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmPayInvoice) {
                  onPayInvoice(confirmPayInvoice.id, paymentDate);
                  setConfirmPayInvoice(null);
                  setPaymentDate(new Date().toISOString().split('T')[0]);
                }
              }}
            >
              Confirmar Pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
