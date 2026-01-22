import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/finance-utils';
import { TrendingUp, TrendingDown, Wallet, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  title: string;
  amount: number;
  type: 'current' | 'projected' | 'income' | 'expense';
  subtitle?: string;
  className?: string;
}

export function BalanceCard({ title, amount, type, subtitle, className }: BalanceCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'current':
        return <Wallet className="h-5 w-5" />;
      case 'projected':
        return <Clock className="h-5 w-5" />;
      case 'income':
        return <TrendingUp className="h-5 w-5" />;
      case 'expense':
        return <TrendingDown className="h-5 w-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'current':
        return {
          card: 'bg-primary text-primary-foreground',
          icon: 'bg-primary-foreground/20',
        };
      case 'projected':
        return {
          card: 'bg-card border',
          icon: 'bg-muted',
        };
      case 'income':
        return {
          card: 'bg-income-light border border-income/20',
          icon: 'bg-income/15 text-income',
        };
      case 'expense':
        return {
          card: 'bg-expense-light border border-expense/20',
          icon: 'bg-expense/15 text-expense',
        };
    }
  };

  const styles = getStyles();
  const isNegative = amount < 0;

  return (
    <Card className={cn('overflow-hidden animate-fade-in', styles.card, className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className={cn(
              'text-sm font-medium',
              type === 'current' ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              {title}
            </p>
            <p className={cn(
              'text-2xl font-bold tracking-tight font-mono',
              type === 'income' && 'text-income',
              type === 'expense' && 'text-expense',
              type === 'projected' && isNegative && 'text-expense',
            )}>
              {formatCurrency(amount)}
            </p>
            {subtitle && (
              <p className={cn(
                'text-xs',
                type === 'current' ? 'text-primary-foreground/60' : 'text-muted-foreground'
              )}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg', styles.icon)}>
            {getIcon()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
