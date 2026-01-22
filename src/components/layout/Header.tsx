import { Button } from '@/components/ui/button';
import { Plus, Wallet } from 'lucide-react';

interface HeaderProps {
  onAddTransaction: () => void;
}

export function Header({ onAddTransaction }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Gestão Financeira</h1>
            <p className="text-xs text-muted-foreground">Controle confiável</p>
          </div>
        </div>

        <Button onClick={onAddTransaction} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>
    </header>
  );
}
