import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, CreditCard, CreditCardInvoice, Installment, Category } from '@/types/finance';
import { formatCurrency } from '@/lib/finance-utils';
import { CreditCard as CreditCardIcon, TrendingUp, Receipt, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreditCardAnalysisProps {
  transactions: Transaction[];
  creditCards: CreditCard[];
  invoices: CreditCardInvoice[];
  installments: Installment[];
  categories: Category[];
  month: string;
}

export function CreditCardAnalysis({
  transactions,
  creditCards,
  invoices,
  installments,
  categories,
  month,
}: CreditCardAnalysisProps) {
  // Calculate spending per card
  const cardStats = creditCards.map(card => {
    // Installments due this month for this card
    const monthInstallments = installments.filter(
      i => i.dueMonth === month && i.creditCardId === card.id
    );
    
    const totalDue = monthInstallments.reduce((sum, i) => sum + i.amount, 0);
    
    // Invoice for this card/month
    const invoice = invoices.find(
      i => i.month === month && i.creditCardId === card.id
    );

    // All transactions with installments for this card
    const cardTransactions = transactions.filter(
      t => t.creditCardId === card.id && t.paymentMethod === 'credit'
    );

    // Largest purchases (by total amount, with installments)
    const purchasesWithDetails = cardTransactions.map(t => {
      const txInstallments = installments.filter(i => i.transactionId === t.id);
      const totalInstallments = txInstallments[0]?.totalInstallments || 1;
      const paidInstallments = txInstallments.filter(i => i.status === 'paid').length;
      const remainingAmount = txInstallments
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + i.amount, 0);
      
      return {
        ...t,
        totalInstallments,
        paidInstallments,
        remainingAmount,
        remainingInstallments: totalInstallments - paidInstallments,
      };
    });

    // Only show purchases with remaining installments
    const activeInstallmentPurchases = purchasesWithDetails
      .filter(p => p.remainingInstallments > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Calculate total future debt
    const totalFutureDebt = installments
      .filter(i => i.creditCardId === card.id && i.status === 'pending')
      .reduce((sum, i) => sum + i.amount, 0);

    // Calculate limit usage
    const limitUsage = (totalFutureDebt / card.limit) * 100;

    return {
      card,
      totalDue,
      invoice,
      activeInstallmentPurchases,
      totalFutureDebt,
      limitUsage,
    };
  });

  // Largest installment purchases across all cards
  const allInstallmentPurchases = transactions
    .filter(t => t.paymentMethod === 'credit')
    .map(t => {
      const txInstallments = installments.filter(i => i.transactionId === t.id);
      const totalInstallments = txInstallments[0]?.totalInstallments || 1;
      const paidInstallments = txInstallments.filter(i => i.status === 'paid').length;
      const remainingAmount = txInstallments
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + i.amount, 0);
      const card = creditCards.find(c => c.id === t.creditCardId);
      
      return {
        ...t,
        totalInstallments,
        paidInstallments,
        remainingAmount,
        remainingInstallments: totalInstallments - paidInstallments,
        cardName: card?.name || 'Cartão',
        cardColor: card?.color || 'hsl(0, 0%, 50%)',
      };
    })
    .filter(p => p.remainingInstallments > 0 && p.totalInstallments > 1)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardStats.map(({ card, totalDue, limitUsage, totalFutureDebt }) => (
          <Card 
            key={card.id}
            className="relative overflow-hidden"
          >
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: card.color }}
            />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.color }}
                  >
                    <CreditCardIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fatura do Mês</span>
                  <span className="font-mono font-semibold text-expense">
                    {formatCurrency(totalDue)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dívida Total</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(totalFutureDebt)}
                  </span>
                </div>
              </div>

              {/* Limit Usage Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uso do Limite</span>
                  <span>{limitUsage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      limitUsage > 80 ? "bg-expense" : limitUsage > 50 ? "bg-warning" : "bg-income"
                    )}
                    style={{ width: `${Math.min(limitUsage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  Limite: {formatCurrency(card.limit)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Largest Installment Purchases */}
      {allInstallmentPurchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Maiores Compras Parceladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allInstallmentPurchases.map((purchase, index) => {
                const category = categories.find(c => c.id === purchase.category);
                
                return (
                  <div 
                    key={purchase.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{purchase.description}</p>
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full text-white"
                          style={{ backgroundColor: purchase.cardColor }}
                        >
                          {purchase.cardName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: category?.color }}
                        />
                        <span>{category?.name}</span>
                        <span>•</span>
                        <span>{format(parseISO(purchase.transactionDate), "dd 'de' MMM", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {formatCurrency(purchase.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {purchase.paidInstallments}/{purchase.totalInstallments}x pagas
                      </p>
                      <p className="text-xs text-expense">
                        Resta: {formatCurrency(purchase.remainingAmount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Card Details */}
      {cardStats.map(({ card, activeInstallmentPurchases }) => (
        activeInstallmentPurchases.length > 0 && (
          <Card key={card.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: card.color }}
                />
                Parcelas Ativas - {card.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeInstallmentPurchases.map(purchase => {
                  const category = categories.find(c => c.id === purchase.category);
                  
                  return (
                    <div 
                      key={purchase.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: category?.color }}
                        />
                        <div>
                          <p className="font-medium">{purchase.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {purchase.paidInstallments}/{purchase.totalInstallments}x pagas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">
                          {formatCurrency(purchase.amount / purchase.totalInstallments)}/mês
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Falta: {formatCurrency(purchase.remainingAmount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )
      ))}

      {/* Empty State */}
      {creditCards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCardIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum cartão cadastrado. Acesse as configurações para adicionar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}