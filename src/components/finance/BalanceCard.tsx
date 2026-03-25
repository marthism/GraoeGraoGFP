import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/finance-utils';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { TrendingUp, TrendingDown, Wallet, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  title: string;
  amount: number;
  type: 'current' | 'projected' | 'income' | 'expense';
  subtitle?: string;
  progress?: number;
  className?: string;
}

export function BalanceCard({ title, amount, type, subtitle, progress, className }: BalanceCardProps) {
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
          card: 'bg-card/40 backdrop-blur-md border-t-2 border-t-primary border-x-border/50 border-b-border/50',
          icon: 'bg-primary/10 text-primary',
          textTitle: 'text-muted-foreground',
          textAmount: 'text-foreground',
          textSubtitle: 'text-muted-foreground',
        };
      case 'projected':
        return {
          card: 'bg-card/40 backdrop-blur-md border border-border/50',
          icon: 'bg-muted/50 text-muted-foreground',
          textTitle: 'text-muted-foreground',
          textAmount: 'text-foreground',
          textSubtitle: 'text-muted-foreground',
        };
      case 'income':
        return {
          card: 'bg-card/40 backdrop-blur-md border-t-2 border-t-income border-x-border/50 border-b-border/50',
          icon: 'bg-income/10 text-income',
          textTitle: 'text-muted-foreground',
          textAmount: 'text-income',
          textSubtitle: 'text-muted-foreground',
        };
      case 'expense':
        return {
          card: 'bg-card/40 backdrop-blur-md border-t-2 border-t-expense border-x-border/50 border-b-border/50',
          icon: 'bg-expense/10 text-expense',
          textTitle: 'text-muted-foreground',
          textAmount: 'text-expense',
          textSubtitle: 'text-muted-foreground',
        };
    }
  };

  const styles = getStyles();
  const isNegative = amount < 0;

  return (
    <Card className={cn('overflow-hidden animate-fade-in shadow-sm', styles.card, className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className={cn('text-sm font-medium', styles.textTitle)}>
              {title}
            </p>
            <p className={cn(
              'text-2xl font-bold tracking-tight font-mono',
              styles.textAmount,
              type === 'projected' && isNegative && 'text-expense'
            )}>
              <AnimatedNumber value={amount} formatFn={formatCurrency} duration={1200} />
            </p>
            {progress !== undefined && (
              <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden mt-3 mb-1">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out",
                    type === 'expense' ? 'bg-expense' : type === 'income' ? 'bg-income' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                />
              </div>
            )}
            {subtitle && (
              <p className={cn('text-xs', progress !== undefined ? 'mt-0' : 'mt-1', styles.textSubtitle)}>
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
