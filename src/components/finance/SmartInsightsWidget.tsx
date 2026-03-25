import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { formatCurrency, calculateSummary } from '@/lib/finance-utils';
import type { Transaction, Installment, CreditCardInvoice } from '@/types/finance';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

interface SmartInsightsProps {
    transactions: Transaction[];
    installments: Installment[];
    invoices: CreditCardInvoice[];
}

export function SmartInsightsWidget({ transactions, installments, invoices }: SmartInsightsProps) {
    const [insight, setInsight] = useState<{ message: string; type: 'success' | 'warning' | 'info'; icon: any } | null>(null);
    const [isDismissed, setIsDismissed] = useState(() => {
        return typeof window !== 'undefined' ? sessionStorage.getItem('smartInsightsDismissed') === 'true' : false;
    });

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem('smartInsightsDismissed', 'true');
    };

    useEffect(() => {
        const summary = calculateSummary(transactions, installments, invoices);

        // Logic 1: Cash flow warning
        if (summary.projectedBalance < 0) {
            setInsight({
                message: `Atenção: Seu fluxo de caixa está negativo. As saídas previstas superam suas disponibilidades em ${formatCurrency(Math.abs(summary.projectedBalance))}.`,
                type: 'warning',
                icon: AlertTriangle,
            });
            return;
        }

        // Logic 2: Upcoming large expenses
        if (summary.pendingExpenses > summary.currentBalance && summary.currentBalance > 0) {
            setInsight({
                message: `Alerta: Suas despesas a pagar (${formatCurrency(summary.pendingExpenses)}) são maiores que seu saldo atual. Fique de olho nas datas de vencimento!`,
                type: 'warning',
                icon: AlertTriangle,
            });
            return;
        }

        // Logic 3: Comfortable Cash flow
        if (summary.currentBalance > 0 && summary.currentBalance >= summary.pendingExpenses) {
            setInsight({
                message: `Tudo sob controle! Seu saldo atual de ${formatCurrency(summary.currentBalance)} cobre todas as despesas pendentes deste mês.`,
                type: 'success',
                icon: CheckCircle2,
            });
            return;
        }

        // Default Logic
        if (summary.pendingIncome > 0) {
            setInsight({
                message: `Fôlego a caminho! Você possui ${formatCurrency(summary.pendingIncome)} em receitas a receber neste mês.`,
                type: 'info',
                icon: Lightbulb,
            });
            return;
        }

    }, [transactions, installments, invoices]);

    if (!insight || isDismissed) return null;

    const Icon = insight.icon;

    return (
        <Card className={cn(
            'bg-card/40 backdrop-blur-md border animate-fade-in mb-4 shadow-sm overflow-hidden relative',
            insight.type === 'warning' ? 'border-destructive/50' :
                insight.type === 'success' ? 'border-income/50' : 'border-primary/50'
        )}>
            {/* Accent Line */}
            <div className={cn(
                'absolute left-0 top-0 bottom-0 w-1',
                insight.type === 'warning' ? 'bg-destructive' :
                    insight.type === 'success' ? 'bg-income' : 'bg-primary'
            )} />

            <CardContent className="p-4 pl-6 flex items-start gap-4">
                <div className={cn(
                    'p-2 rounded-full',
                    insight.type === 'warning' ? 'bg-destructive/10 text-destructive' :
                        insight.type === 'success' ? 'bg-income/10 text-income' : 'bg-primary/10 text-primary'
                )}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 pt-1 pr-6">
                    <p className="text-sm font-medium leading-relaxed text-foreground">
                        {insight.message}
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </CardContent>
        </Card>
    );
}
