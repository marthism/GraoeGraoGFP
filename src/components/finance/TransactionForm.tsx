import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Category, TransactionType, PaymentMethod, TransactionStatus, CreditCard } from '@/types/finance';
import { parseCurrencyToCents, formatCurrency, calculateInstallments, getCurrentMonth } from '@/lib/finance-utils';
import { ArrowDownLeft, ArrowUpRight, CreditCard as CreditCardIcon, Wallet, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  creditCards: CreditCard[];
  onSubmit: (data: {
    type: TransactionType;
    paymentMethod: PaymentMethod;
    amount: number;
    category: string;
    description: string;
    transactionDate: string;
    competenceMonth: string;
    status: TransactionStatus;
    creditCardId?: string;
  }, installments?: number) => void;
}

export function TransactionForm({ open, onOpenChange, categories, creditCards, onSubmit }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [competenceMonth, setCompetenceMonth] = useState(getCurrentMonth());
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [selectedCardId, setSelectedCardId] = useState(creditCards[0]?.id || '');

  const filteredCategories = categories.filter(c => c.type === type);
  const amountInCents = parseCurrencyToCents(amount);
  const numInstallments = parseInt(installmentCount) || 1;

  // Preview installments for credit
  const installmentPreview = paymentMethod === 'credit' && numInstallments > 1
    ? calculateInstallments(amountInCents, numInstallments, competenceMonth)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amountInCents || !category || !description) return;

    onSubmit({
      type,
      paymentMethod,
      amount: amountInCents,
      category,
      description,
      transactionDate,
      competenceMonth,
      status: paymentMethod === 'credit' ? 'pending' : status,
      creditCardId: paymentMethod === 'credit' ? selectedCardId : undefined,
    }, paymentMethod === 'credit' ? numInstallments : undefined);

    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
    setInstallmentCount('1');
    setStatus('pending');
    onOpenChange(false);
  };

  const resetForm = () => {
    setType('expense');
    setPaymentMethod('cash');
    setAmount('');
    setCategory('');
    setDescription('');
    setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
    setCompetenceMonth(getCurrentMonth());
    setStatus('pending');
    setInstallmentCount('1');
    setSelectedCardId(creditCards[0]?.id || '');
  };

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Movimentação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Selection */}
          <Tabs value={type} onValueChange={(v) => {
            setType(v as TransactionType);
            setCategory('');
            if (v === 'income') setPaymentMethod('cash');
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Saída
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Entrada
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Payment Method (only for expenses) */}
          {type === 'expense' && (
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="cash"
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    paymentMethod === 'cash' 
                      ? 'border-primary bg-accent' 
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <RadioGroupItem value="cash" id="cash" />
                  <Wallet className="h-4 w-4" />
                  <span>Caixa/Débito</span>
                </Label>
                <Label
                  htmlFor="credit"
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    paymentMethod === 'credit' 
                      ? 'border-credit bg-credit-light' 
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <RadioGroupItem value="credit" id="credit" />
                  <CreditCardIcon className="h-4 w-4" />
                  <span>Crédito</span>
                </Label>
              </RadioGroup>
            </div>
          )}

          {/* Credit Card Selection */}
          {paymentMethod === 'credit' && creditCards.length > 0 && (
            <div className="space-y-2">
              <Label>Cartão de Crédito</Label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    {selectedCard && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedCard.color }}
                      />
                    )}
                    <SelectValue placeholder="Selecione o cartão" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {creditCards.map(card => (
                    <SelectItem key={card.id} value={card.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: card.color }}
                        />
                        <span>{card.name}</span>
                        <span className="text-muted-foreground">•••• {card.lastDigits}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount & Installments */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Total</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 font-mono"
                />
              </div>
            </div>

            {paymentMethod === 'credit' && (
              <div className="space-y-2">
                <Label htmlFor="installments">Parcelas</Label>
                <Select value={installmentCount} onValueChange={setInstallmentCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}x {num > 1 && amountInCents > 0 && (
                          <span className="text-muted-foreground ml-1">
                            de {formatCurrency(Math.floor(amountInCents / num))}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Installment Preview */}
          {installmentPreview && (
            <div className="p-3 rounded-lg bg-credit-light border border-credit/20 space-y-2">
              <p className="text-sm font-medium text-credit flex items-center gap-2">
                <CreditCardIcon className="h-4 w-4" />
                Prévia das Parcelas
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {installmentPreview.amounts.map((amt, idx) => (
                  <div key={idx} className="p-2 bg-card rounded text-center">
                    <p className="text-muted-foreground">{idx + 1}ª</p>
                    <p className="font-mono font-medium">{formatCurrency(amt)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Soma exata: {formatCurrency(installmentPreview.amounts.reduce((a, b) => a + b, 0))}
              </p>
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Compras do mês"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Data do Lançamento</Label>
              <Input
                id="transactionDate"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competenceMonth">Competência</Label>
              <Input
                id="competenceMonth"
                type="month"
                value={competenceMonth}
                onChange={(e) => setCompetenceMonth(e.target.value)}
              />
            </div>
          </div>

          {/* Status (only for cash) */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup
                value={status}
                onValueChange={(v) => setStatus(v as TransactionStatus)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="pending"
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    status === 'pending' 
                      ? 'border-pending bg-pending-light' 
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <RadioGroupItem value="pending" id="pending" />
                  <span>Pendente</span>
                </Label>
                <Label
                  htmlFor="paid"
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    status === 'paid' 
                      ? 'border-income bg-income-light' 
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <RadioGroupItem value="paid" id="paid" />
                  <span>{type === 'income' ? 'Recebido' : 'Pago'}</span>
                </Label>
              </RadioGroup>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!amountInCents || !category || !description}>
            Adicionar {type === 'income' ? 'Entrada' : 'Saída'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
