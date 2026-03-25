import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, CreditCard, CreditCardInvoice, Installment, Category } from '@/types/finance';
import { filterActiveInstallments, formatCurrency } from '@/lib/finance-utils';
import { t } from '@/i18n';
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
  const creditTransactions = transactions.filter(t => t.paymentMethod === 'credit');

  const purchaseGroups = creditTransactions.reduce((groups, tx) => {
    const key = tx.installmentGroupId || tx.id;
    const existing = groups.get(key) || [];
    existing.push(tx);
    groups.set(key, existing);
    return groups;
  }, new Map<string, Transaction[]>());

  const purchaseSummaries = Array.from(purchaseGroups.entries()).map(([groupId, groupTxs]) => {
    const txIds = groupTxs.map(tx => tx.id);
    const txInstallments = installments.filter(inst => txIds.includes(inst.transactionId));
    const totalInstallments = txInstallments.length || groupTxs[0]?.installmentsTotal || 1;
    const perInstallment = groupTxs[0]?.amount || 0;
    const totalAmount = txInstallments.length
      ? txInstallments.reduce((sum, inst) => sum + inst.amount, 0)
      : perInstallment * totalInstallments;
    const paidInstallments = txInstallments.filter(inst => inst.status === 'paid' && inst.dueMonth <= month);
    const paidCount = paidInstallments.length;
    const paidAmount = paidInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    const pendingFutureInstallments = txInstallments.filter(
      inst => inst.status !== 'paid' && inst.dueMonth >= month
    );
    const card = creditCards.find(c => c.id === groupTxs[0]?.creditCardId);

    return {
      id: groupId,
      description: groupTxs[0]?.description || 'Compra',
      category: groupTxs[0]?.category,
      transactionDate: groupTxs[0]?.transactionDate,
      creditCardId: groupTxs[0]?.creditCardId,
      cardName: card?.name || 'Cartão',
      cardColor: card?.color || 'hsl(0, 0%, 50%)',
      totalInstallments,
      perInstallment,
      totalAmount,
      paidCount,
      paidAmount,
      pendingFutureCount: pendingFutureInstallments.length,
    };
  });
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

    const activeInstallmentPurchases = purchaseSummaries
      .filter(p => p.creditCardId === card.id && p.pendingFutureCount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Calculate total future debt
    const totalFutureDebt = filterActiveInstallments(installments, month, card.id)
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
  const allInstallmentPurchases = purchaseSummaries
    .filter(p => p.totalInstallments > 1)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Virtual Wallet - Physical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2 py-4">
        {cardStats.map(({ card, totalFutureDebt }) => {
          const availableLimit = Math.max(0, card.limit - totalFutureDebt);
          const limitPercentage = Math.min(100, (totalFutureDebt / card.limit) * 100);

          return (
            <div
              key={card.id}
              className="relative aspect-[1.586/1] w-full rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-out group"
              style={{
                background: `linear-gradient(135deg, ${card.color} 0%, rgba(20,20,30,0.95) 100%)`,
              }}
            >
              {/* Glass Reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50" />

              {/* Bank Logo / Brand Name */}
              <div className="absolute top-5 transition-transform duration-300 left-6 right-6 flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-white/90 font-bold text-lg tracking-wide drop-shadow-md">
                    {card.name}
                  </span>
                  <span className="text-white/60 font-mono text-sm tracking-widest mt-1">
                    •••• {card.lastDigits}
                  </span>
                </div>
                <CreditCardIcon className="h-6 w-6 text-white/80 drop-shadow-sm" />
              </div>

              {/* Central Metrics - Consumption vs Available */}
              <div className="absolute inset-x-6 top-[37%] flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-white/60 text-xs uppercase tracking-wider mb-1">
                    Consumo
                  </span>
                  <span className="text-white font-mono text-xl font-bold tracking-tight drop-shadow-md">
                    {formatCurrency(totalFutureDebt)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-white/60 text-xs uppercase tracking-wider mb-1">
                    Limite Atual
                  </span>
                  <span className="text-income font-mono text-xl font-bold tracking-tight drop-shadow-md">
                    {formatCurrency(availableLimit)}
                  </span>
                </div>
              </div>

              {/* Progress Bar (Subtle integration) */}
              <div className="absolute left-6 right-6 top-[62%] h-1 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    limitPercentage > 80 ? "bg-red-400" : limitPercentage > 50 ? "bg-yellow-400" : "bg-white/80"
                  )}
                  style={{ width: `${limitPercentage}%` }}
                />
              </div>

              {/* Bottom Footer - Dates & Total Limit */}
              <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-white/50 text-[10px] uppercase tracking-wider">Fechamento</span>
                    <span className="text-white/90 text-sm font-semibold">Dia {card.closingDay}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white/50 text-[10px] uppercase tracking-wider">Vencimento</span>
                    <span className="text-white/90 text-sm font-semibold">Dia {card.dueDay}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-white/50 text-[10px] uppercase tracking-wider">Limite Total</span>
                  <span className="text-white/80 font-mono text-sm">{formatCurrency(card.limit)}</span>
                </div>
              </div>
            </div>
          );
        })}
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
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scroll-dark">
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
                    <div className="text-right space-y-0.5">
                      <p className="font-mono font-semibold">
                        {formatCurrency(purchase.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {purchase.totalInstallments}x de {formatCurrency(purchase.perInstallment)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {purchase.paidCount}/{purchase.totalInstallments} pagas
                      </p>
                      <p className="text-xs text-income">
                        Pago: {formatCurrency(purchase.paidAmount)}
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
                            {purchase.paidCount}/{purchase.totalInstallments}x pagas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">
                          {formatCurrency(purchase.perInstallment)}/mês
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
