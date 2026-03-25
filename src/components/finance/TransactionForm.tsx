
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Category, TransactionType, PaymentMethod, TransactionStatus, CreditCard, Installment, PaymentMethodOption, MonthlyBudget, RecurrenceType, Transaction } from '@/types/finance';
import { parseCurrencyToCents, formatCurrency, calculateInstallments, getCurrentMonth } from '@/lib/finance-utils';
import { getTransactionDateValidation } from '@/lib/transaction-validation';
import { ArrowDownLeft, ArrowUpRight, CreditCard as CreditCardIcon, Wallet, AlertCircle, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCurrencySymbol, getLocale } from '@/i18n';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
  categories: Category[];
  paymentMethods: PaymentMethodOption[];
  creditCards: CreditCard[];
  installments: Installment[];
  budgets: MonthlyBudget[];
  spending: Record<string, number>;
  selectedMonth: string;
  onSubmit: (data: {
    type: TransactionType;
    paymentMethod: PaymentMethod;
    amount: number;
    category: string;
    description: string;
    transactionDate: string;
    date?: string;
    dueDate?: string;
    competenceMonth: string;
    status: TransactionStatus;
    creditCardId?: string;
    recurrence?: RecurrenceType;
    recurrenceCount?: number;
  }, installments?: number) => void;
  onUpdate?: (id: string, data: {
    type: TransactionType;
    paymentMethod: PaymentMethod;
    amount: number;
    category: string;
    description: string;
    transactionDate: string;
    date?: string;
    dueDate?: string;
    competenceMonth: string;
    status: TransactionStatus;
    creditCardId?: string;
  }) => void;
}

const parsePercent = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatCentsToInput = (cents: number): string => {
  return (cents / 100).toLocaleString(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatMonthLabel = (month: string): string => {
  if (!month) return '';
  return format(parseISO(`${month}-01`), 'MM/yyyy');
};

const getAutoCompetenceMonth = (dateStr: string, closingDay: number): string => {
  const date = parseISO(dateStr);
  if (Number.isNaN(date.getTime()) || !closingDay) return getCurrentMonth();
  const closingDate = new Date(date.getFullYear(), date.getMonth(), closingDay);
  const competenceDate = date > closingDate ? addMonths(date, 1) : date;
  return format(competenceDate, 'yyyy-MM');
};

type ScheduleItem = { month: string; amount: number; interest: number; amortization: number; balance: number };

const adjustScheduleTotal = (schedule: ScheduleItem[], targetTotalCents: number) => {
  if (!schedule.length) return schedule;
  const currentTotal = schedule.reduce((sum, item) => sum + item.amount, 0);
  const diff = targetTotalCents - currentTotal;
  if (diff !== 0) {
    schedule[0] = {
      ...schedule[0],
      amount: schedule[0].amount + diff,
      amortization: schedule[0].amortization + diff,
    };
  }
  return schedule;
};

const buildPriceSchedule = (
  capitalCents: number,
  rate: number,
  months: number,
  startMonth: string,
  penaltyCents: number,
) => {
  if (capitalCents <= 0 || months <= 0) return [] as ScheduleItem[];
  const { months: monthList } = calculateInstallments(capitalCents, months, startMonth || getCurrentMonth());
  if (rate <= 0) {
    const { amounts } = calculateInstallments(capitalCents, months, startMonth || getCurrentMonth());
    let balance = capitalCents;
    return amounts.map((amt, idx) => {
      const amortization = amt;
      balance = Math.max(balance - amortization, 0);
      return {
        month: monthList[idx],
        amount: amt + (idx === 0 ? penaltyCents : 0),
        interest: 0,
        amortization,
        balance,
      };
    });
  }

  const factor = Math.pow(1 + rate, months);
  const payment = Math.round(capitalCents * (rate * factor) / (factor - 1));
  let balance = capitalCents;

  return monthList.map((month, idx) => {
    const interest = Math.round(balance * rate);
    let amortization = payment - interest;
    if (idx === monthList.length - 1) {
      amortization = balance;
    }
    let amount = amortization + interest;
    if (idx === 0) amount += penaltyCents;
    balance = Math.max(balance - amortization, 0);
    return {
      month,
      amount,
      interest,
      amortization,
      balance,
    };
  });
};

const buildVariableSchedule = (
  capitalCents: number,
  rate: number,
  months: number,
  startMonth: string,
  penaltyCents: number,
) => {
  if (capitalCents <= 0 || months <= 0) return [] as ScheduleItem[];
  const { amounts, months: monthList } = calculateInstallments(capitalCents, months, startMonth || getCurrentMonth());
  let balance = capitalCents;
  return amounts.map((amortization, idx) => {
    const interest = rate > 0 ? Math.round(balance * rate) : 0;
    let amount = amortization + interest;
    if (idx === 0) amount += penaltyCents;
    balance = Math.max(balance - amortization, 0);
    return {
      month: monthList[idx],
      amount,
      interest,
      amortization,
      balance,
    };
  });
};

export function TransactionForm({
  open,
  onOpenChange,
  categories,
  paymentMethods,
  creditCards,
  installments,
  budgets,
  spending,
  selectedMonth,
  onSubmit,
  onUpdate,
  editingTransaction
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [incomeDate, setIncomeDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [installmentCount, setInstallmentCount] = useState('1');
  const [selectedCardId, setSelectedCardId] = useState(creditCards[0]?.id || '');
  const [interestMode, setInterestMode] = useState<'percent' | 'fixed'>('percent');
  const [interestValue, setInterestValue] = useState('');
  const [penaltyMode, setPenaltyMode] = useState<'percent' | 'fixed'>('percent');
  const [penaltyValue, setPenaltyValue] = useState('');
  const [compoundEnabled, setCompoundEnabled] = useState(false);
  const [isCompoundExpanded, setIsCompoundExpanded] = useState(false);
  const [compoundRate, setCompoundRate] = useState('');
  const [compoundMethod, setCompoundMethod] = useState<'price' | 'variable'>('price');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [card2Id, setCard2Id] = useState('');
  const [card1Amount, setCard1Amount] = useState('');
  const [card2Amount, setCard2Amount] = useState('');
  const [splitDirty, setSplitDirty] = useState(false);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [recurrenceCount, setRecurrenceCount] = useState('12');
  const [showBudgetAlert, setShowBudgetAlert] = useState(false);
  const [hasConfirmedBudget, setHasConfirmedBudget] = useState(false);
  const isEditing = Boolean(editingTransaction);

  const currencySymbol = getCurrencySymbol();

  const filteredCategories = categories.filter(c => c.type === type);
  const amountInCents = parseCurrencyToCents(amount);
  const entryInCents = parseCurrencyToCents(entryAmount);
  const numInstallments = parseInt(installmentCount) || 1;

  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod) || paymentMethods[0];
  const isCreditType = selectedMethod?.type === 'credit';

  const selectedCard = creditCards.find(c => c.id === selectedCardId);
  const secondCard = creditCards.find(c => c.id === card2Id);
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const transactionDate = type === 'income' ? incomeDate : todayDate;
  const competenceMonth = isCreditType && selectedCard
    ? getAutoCompetenceMonth(transactionDate, selectedCard.closingDay)
    : (transactionDate ? transactionDate.slice(0, 7) : getCurrentMonth());

  const financedBaseCents = Math.max(amountInCents - entryInCents, 0);
  const isEntryInvalid = amountInCents > 0 && entryInCents > amountInCents;

  const compoundRatePct = parsePercent(compoundRate);
  const compoundRateDecimal = compoundRatePct / 100;
  const compoundRateInvalid = compoundRatePct < 0;
  const compoundRateLabel = compoundRatePct > 0
    ? compoundRatePct.toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
  const compoundMethodLabel = compoundMethod === 'price' ? 'Price' : 'Variável';

  const simpleInterestPct = interestMode === 'percent' ? parsePercent(interestValue) : 0;
  const penaltyPct = penaltyMode === 'percent' ? parsePercent(penaltyValue) : 0;
  const simpleInterestFixedCents = interestMode === 'fixed' ? parseCurrencyToCents(interestValue) : 0;
  const penaltyFixedCents = penaltyMode === 'fixed' ? parseCurrencyToCents(penaltyValue) : 0;

  const interestCalcCents = compoundEnabled
    ? 0
    : Math.round(financedBaseCents * (simpleInterestPct / 100)) + simpleInterestFixedCents;
  const penaltyCalcCents = Math.round(financedBaseCents * (penaltyPct / 100)) + penaltyFixedCents;

  const requiresCreditCharge = isCreditType && financedBaseCents > 0;

  let totalFinalCents = financedBaseCents;
  let compoundFullSchedule: ScheduleItem[] = [];
  if (isCreditType) {
    if (compoundEnabled) {
      compoundFullSchedule = compoundMethod === 'price'
        ? buildPriceSchedule(financedBaseCents, compoundRateDecimal, numInstallments, competenceMonth, penaltyCalcCents)
        : buildVariableSchedule(financedBaseCents, compoundRateDecimal, numInstallments, competenceMonth, penaltyCalcCents);
      totalFinalCents = compoundFullSchedule.reduce((sum, item) => sum + item.amount, 0);
    } else {
      totalFinalCents = financedBaseCents + interestCalcCents + penaltyCalcCents;
    }
  }

  useEffect(() => {
    if (!selectedCardId && creditCards[0]) {
      setSelectedCardId(creditCards[0].id);
    }
  }, [creditCards, selectedCardId]);

  useEffect(() => {
    if (!open || !editingTransaction) return;

    setType(editingTransaction.type);
    setPaymentMethod(editingTransaction.paymentMethod);
    setAmount(formatCentsToInput(editingTransaction.amount));
    setEntryAmount('');
    setCategory(editingTransaction.category);
    setDescription(editingTransaction.description);
    setIncomeDate(editingTransaction.date || editingTransaction.transactionDate || todayDate);
    setDueDate(editingTransaction.dueDate || editingTransaction.transactionDate || todayDate);
    setStatus(editingTransaction.status);
    setInstallmentCount(editingTransaction.installmentsTotal?.toString() || '1');
    setSelectedCardId(editingTransaction.creditCardId || creditCards[0]?.id || '');
    setInterestMode('percent');
    setInterestValue('');
    setPenaltyMode('percent');
    setPenaltyValue('');
    setCompoundEnabled(false);
    setCompoundRate('');
    setCompoundMethod('price');
    setIsCompoundExpanded(false);
    setIsPreviewExpanded(false);
    setSplitEnabled(false);
    setCard2Id('');
    setCard1Amount('');
    setCard2Amount('');
    setSplitDirty(false);
    setRecurrenceEnabled(false);
    setHasConfirmedBudget(false);
  }, [open, editingTransaction, creditCards, todayDate]);

  useEffect(() => {
    if (type !== 'expense' && dueDate) {
      setDueDate('');
    }
  }, [type, paymentMethod, dueDate]);

  useEffect(() => {
    if (type === 'expense' && !dueDate) {
      setDueDate(todayDate);
    }
  }, [type, dueDate, todayDate]);

  useEffect(() => {
    if (type === 'income' && !incomeDate) {
      setIncomeDate(todayDate);
    }
  }, [type, incomeDate, todayDate]);

  useEffect(() => {
    if (!compoundEnabled) return;
    if (interestMode !== 'percent') {
      setInterestMode('percent');
    }
  }, [compoundEnabled, interestMode]);

  useEffect(() => {
    if (!splitEnabled) {
      setCard2Id('');
      setCard1Amount('');
      setCard2Amount('');
      setSplitDirty(false);
      return;
    }
    const fallbackCard2 = creditCards.find(c => c.id !== selectedCardId)?.id || '';
    if (!card2Id || card2Id === selectedCardId) {
      setCard2Id(fallbackCard2);
    }
    if (!splitDirty) {
      const half = Math.floor(totalFinalCents / 2);
      setCard1Amount(formatCentsToInput(half));
      setCard2Amount(formatCentsToInput(Math.max(totalFinalCents - half, 0)));
    }
  }, [splitEnabled, creditCards, selectedCardId, card2Id, splitDirty, totalFinalCents]);

  useEffect(() => {
    if (!splitEnabled || splitDirty) return;
    const half = Math.floor(totalFinalCents / 2);
    setCard1Amount(formatCentsToInput(half));
    setCard2Amount(formatCentsToInput(Math.max(totalFinalCents - half, 0)));
  }, [totalFinalCents, splitEnabled, splitDirty]);

  const card1AmountCents = splitEnabled ? parseCurrencyToCents(card1Amount) : totalFinalCents;
  const card2AmountCents = splitEnabled ? parseCurrencyToCents(card2Amount) : 0;
  const splitMismatch = splitEnabled && Math.abs((card1AmountCents + card2AmountCents) - totalFinalCents) > 1;
  const splitInvalidCards = splitEnabled && (!!card2Id && card2Id === selectedCardId);
  const splitInvalidAmounts = splitEnabled && (card1AmountCents <= 0 || card2AmountCents <= 0);
  const compoundReferenceTotalCents = compoundEnabled && compoundRateDecimal > 0
    ? Math.round(financedBaseCents * Math.pow(1 + compoundRateDecimal, numInstallments))
    : 0;

  const getInstallmentSchedule = (amountCents: number, count: number, startMonth: string) => {
    if (amountCents <= 0 || count <= 0) return [] as ScheduleItem[];
    const { amounts, months } = calculateInstallments(amountCents, count, startMonth || getCurrentMonth());
    return amounts.map((amt, idx) => ({
      month: months[idx],
      amount: amt,
      interest: 0,
      amortization: amt,
      balance: 0,
    }));
  };

  const card1PenaltyCents = splitEnabled && totalFinalCents > 0
    ? Math.round(penaltyCalcCents * (card1AmountCents / totalFinalCents))
    : penaltyCalcCents;
  const card2PenaltyCents = splitEnabled ? penaltyCalcCents - card1PenaltyCents : 0;

  const compoundFactor = compoundEnabled && financedBaseCents > 0
    ? totalFinalCents / financedBaseCents
    : 0;
  const card1CapitalCents = compoundEnabled && splitEnabled && compoundFactor > 0
    ? Math.round(financedBaseCents * (card1AmountCents / totalFinalCents))
    : card1AmountCents;
  const card2CapitalCents = compoundEnabled && splitEnabled
    ? Math.max(financedBaseCents - card1CapitalCents, 0)
    : card2AmountCents;

  const scheduleSingle: ScheduleItem[] = requiresCreditCharge && !splitEnabled
    ? (compoundEnabled
      ? compoundFullSchedule
      : getInstallmentSchedule(totalFinalCents, numInstallments, competenceMonth))
    : [];

  const scheduleCard1: ScheduleItem[] = requiresCreditCharge && splitEnabled
    ? (compoundEnabled
      ? adjustScheduleTotal(
        compoundMethod === 'price'
          ? buildPriceSchedule(card1CapitalCents, compoundRateDecimal, numInstallments, competenceMonth, card1PenaltyCents)
          : buildVariableSchedule(card1CapitalCents, compoundRateDecimal, numInstallments, competenceMonth, card1PenaltyCents),
        card1AmountCents,
      )
      : getInstallmentSchedule(card1AmountCents, numInstallments, competenceMonth))
    : [];

  const scheduleCard2: ScheduleItem[] = requiresCreditCharge && splitEnabled
    ? (compoundEnabled
      ? adjustScheduleTotal(
        compoundMethod === 'price'
          ? buildPriceSchedule(card2CapitalCents, compoundRateDecimal, numInstallments, competenceMonth, card2PenaltyCents)
          : buildVariableSchedule(card2CapitalCents, compoundRateDecimal, numInstallments, competenceMonth, card2PenaltyCents),
        card2AmountCents,
      )
      : getInstallmentSchedule(card2AmountCents, numInstallments, competenceMonth))
    : [];

  const previewTotalCents = splitEnabled
    ? scheduleCard1.reduce((sum, i) => sum + i.amount, 0) + scheduleCard2.reduce((sum, i) => sum + i.amount, 0)
    : scheduleSingle.reduce((sum, i) => sum + i.amount, 0);
  const previewTotalInterestCents = previewTotalCents - financedBaseCents;

  const getExistingUtilized = (cardId: string, month: string) => {
    return installments
      .filter(i => i.creditCardId === cardId && i.dueMonth === month)
      .reduce((sum, i) => sum + i.amount, 0);
  };

  const getPreviewUtilized = (schedule: { month: string; amount: number }[], month: string) => {
    return schedule
      .filter(i => i.month === month)
      .reduce((sum, i) => sum + i.amount, 0);
  };

  const card1Utilized = selectedCard && requiresCreditCharge
    ? getExistingUtilized(selectedCard.id, competenceMonth)
    + (splitEnabled ? getPreviewUtilized(scheduleCard1, competenceMonth) : getPreviewUtilized(scheduleSingle, competenceMonth))
    : selectedCard
      ? getExistingUtilized(selectedCard.id, competenceMonth)
      : 0;

  const card1Available = selectedCard ? selectedCard.limit - card1Utilized : 0;

  const card2Utilized = secondCard && splitEnabled
    ? getExistingUtilized(secondCard.id, competenceMonth) + getPreviewUtilized(scheduleCard2, competenceMonth)
    : secondCard
      ? getExistingUtilized(secondCard.id, competenceMonth)
      : 0;

  const card2Available = secondCard ? secondCard.limit - card2Utilized : 0;

  const compoundSummary = compoundEnabled
    ? (compoundRateLabel ? `Ativo · ${compoundRateLabel}% a.m. · ${compoundMethodLabel}` : 'Ativo · configurar')
    : 'Inativo';

  const previewFirstMonth = scheduleSingle[0]?.month || scheduleCard1[0]?.month || scheduleCard2[0]?.month || '';
  const previewSummary = previewTotalCents > 0 && previewFirstMonth
    ? `${numInstallments}x · primeira ${formatMonthLabel(previewFirstMonth)} · total pago ${formatCurrency(previewTotalCents)}`
    : 'Prévia indisponível';

  const { missingExpenseDueDate, missingIncomeDate: isIncomeDateInvalid } =
    getTransactionDateValidation({ type, date: incomeDate, dueDate });
  // Credit expenses don't use manual due date (follows card closing/due logic)
  const isDueDateInvalid = isCreditType ? false : missingExpenseDueDate;

  const getMissingFields = () => {
    const missing: string[] = [];
    if (!amountInCents) missing.push('Informe o valor');
    if (!category) missing.push('Selecione uma categoria');
    if (!description) missing.push('Informe a descrição');
    if (type === 'income' && !incomeDate) missing.push('Escolha a data da entrada');
    if (type === 'expense' && !isCreditType && !dueDate) missing.push('Informe o vencimento');
    return missing;
  };
  const isSubmitDisabled = !amountInCents || !category || !description
    || isDueDateInvalid
    || isIncomeDateInvalid
    || isEntryInvalid
    || (numInstallments < 1)
    || (compoundEnabled && compoundRateInvalid)
    || (requiresCreditCharge && !selectedCardId)
    || (splitEnabled && (!card2Id || splitMismatch || splitInvalidCards || splitInvalidAmounts));

  const getBudgetSnapshot = () => {
    if (type !== 'expense' || !category) return null;
    const budget = budgets.find(b => b.categoryId === category && b.month === selectedMonth)?.budgetAmount || 0;
    if (budget === 0) return null;

    const spent = spending[category] || 0;
    const remaining = budget - spent;
    const usagePct = (spent / budget) * 100;
    const remainingPct = (remaining / budget);

    return { budget, spent, remaining, usagePct, remainingPct };
  };

  const budgetSnapshot = getBudgetSnapshot();
  const shouldAlert = type === 'expense' && budgetSnapshot && (budgetSnapshot.remainingPct <= 0.10);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isSubmitDisabled) {
      const missing = getMissingFields();
      if (missing.length > 0) {
        toast.error('Preencha os campos obrigatórios', {
          id: 'missing-fields',
          description: (
            <ul className="list-disc pl-4">
              {missing.map(item => <li key={item}>{item}</li>)}
            </ul>
          ),
        });
      }
      return;
    }

    if (shouldAlert && !hasConfirmedBudget) {
      setShowBudgetAlert(true);
      return;
    }

    const effectiveTransactionDate = type === 'income' ? incomeDate : transactionDate;

    if (isEditing && editingTransaction && onUpdate) {
      // If recurrence is enabled during edit, delete original and create recurring copies via onSubmit
      if (recurrenceEnabled && parseInt(recurrenceCount) > 1) {
        onSubmit({
          type,
          paymentMethod,
          amount: amountInCents,
          category,
          description,
          transactionDate: effectiveTransactionDate,
          date: type === 'income' ? incomeDate : undefined,
          dueDate: type === 'expense' ? dueDate : undefined,
          competenceMonth,
          status: isCreditType ? 'paid' : status,
          creditCardId: isCreditType ? selectedCardId : undefined,
          recurrence: recurrence,
          recurrenceCount: parseInt(recurrenceCount),
        });
      } else {
        onUpdate(editingTransaction.id, {
          type,
          paymentMethod,
          amount: amountInCents,
          category,
          description,
          transactionDate: effectiveTransactionDate,
          date: type === 'income' ? incomeDate : undefined,
          dueDate: type === 'expense' ? dueDate : undefined,
          competenceMonth,
          status: isCreditType ? 'paid' : status,
          creditCardId: isCreditType ? selectedCardId : undefined,
        });
      }
    } else if (!requiresCreditCharge) {
      onSubmit({
        type,
        paymentMethod,
        amount: amountInCents,
        category,
        description,
        transactionDate: effectiveTransactionDate,
        date: type === 'income' ? incomeDate : undefined,
        dueDate: type === 'expense' ? dueDate : undefined,
        competenceMonth,
        status: isCreditType ? 'paid' : status,
        creditCardId: isCreditType ? selectedCardId : undefined,
        recurrence: recurrenceEnabled ? recurrence : 'none',
        recurrenceCount: recurrenceEnabled ? parseInt(recurrenceCount) : 1,
      });
    } else if (splitEnabled) {
      onSubmit({
        type,
        paymentMethod,
        amount: card1AmountCents,
        category,
        description,
        transactionDate: effectiveTransactionDate,
        date: type === 'income' ? incomeDate : undefined,
        dueDate: type === 'expense' ? dueDate : undefined,
        competenceMonth,
        status: 'pending',
        creditCardId: selectedCardId,
      }, numInstallments);

      onSubmit({
        type,
        paymentMethod,
        amount: card2AmountCents,
        category,
        description,
        transactionDate: effectiveTransactionDate,
        date: type === 'income' ? incomeDate : undefined,
        dueDate: type === 'expense' ? dueDate : undefined,
        competenceMonth,
        status: 'pending',
        creditCardId: card2Id,
      }, numInstallments);
    } else {
      onSubmit({
        type,
        paymentMethod,
        amount: totalFinalCents,
        category,
        description,
        transactionDate: effectiveTransactionDate,
        date: type === 'income' ? incomeDate : undefined,
        dueDate: type === 'expense' ? dueDate : undefined,
        competenceMonth,
        status: 'pending',
        creditCardId: selectedCardId,
      }, numInstallments);
    }

    setAmount('');
    setEntryAmount('');
    setCategory('');
    setDescription('');
    setIncomeDate('');
    setDueDate('');
    setInstallmentCount('1');
    setStatus('pending');
    setInterestMode('percent');
    setInterestValue('');
    setPenaltyMode('percent');
    setPenaltyValue('');
    setCompoundEnabled(false);
    setCompoundRate('');
    setCompoundMethod('price');
    setIsCompoundExpanded(false);
    setIsPreviewExpanded(false);
    setSplitEnabled(false);
    setCard1Amount('');
    setCard2Amount('');
    setSplitDirty(false);
    setRecurrenceEnabled(false);
    setHasConfirmedBudget(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setType('expense');
    setPaymentMethod('cash');
    setAmount('');
    setEntryAmount('');
    setCategory('');
    setDescription('');
    setIncomeDate('');
    setDueDate('');
    setStatus('pending');
    setInstallmentCount('1');
    setSelectedCardId(creditCards[0]?.id || '');
    setInterestMode('percent');
    setInterestValue('');
    setPenaltyMode('percent');
    setPenaltyValue('');
    setCompoundEnabled(true);
    setCompoundRate('');
    setCompoundMethod('price');
    setIsCompoundExpanded(false);
    setIsPreviewExpanded(false);
    setSplitEnabled(false);
    setCard2Id('');
    setCard1Amount('');
    setCard2Amount('');
    setSplitDirty(false);
    setRecurrenceEnabled(false);
    setHasConfirmedBudget(false);
  };

  const simulation = budgetSnapshot ? {
    newSpent: budgetSnapshot.spent + amountInCents,
    newUsagePct: ((budgetSnapshot.spent + amountInCents) / budgetSnapshot.budget) * 100,
    overBy: Math.max(0, (budgetSnapshot.spent + amountInCents) - budgetSnapshot.budget)
  } : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}>
        <DialogContent className="sm:max-w-[560px] flex max-h-[85vh] flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Nova Movimentação</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-5 scroll-dark">
              <Tabs value={type} onValueChange={(v) => {
                setType(v as TransactionType);
                setCategory('');
                if (v === 'income') {
                  setPaymentMethod('cash');
                  setEntryAmount('');
                  setInstallmentCount('1');
                  setSelectedCardId(creditCards[0]?.id || '');
                  setInterestMode('percent');
                  setInterestValue('');
                  setPenaltyMode('percent');
                  setPenaltyValue('');
                  setCompoundEnabled(false);
                  setCompoundRate('');
                  setCompoundMethod('price');
                  setIsCompoundExpanded(false);
                  setSplitEnabled(false);
                  setCard2Id('');
                  setCard1Amount('');
                  setCard2Amount('');
                  setSplitDirty(false);
                  setDueDate('');
                } else {
                  setIncomeDate('');
                }
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

              {type === 'expense' && (
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200",
                          paymentMethod === method.id
                            ? (method.type === 'credit' ? "border-credit bg-credit/10 text-credit" : "border-primary bg-primary/10 text-primary")
                            : "border-border hover:border-muted-foreground/30 bg-card/50"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-full",
                          paymentMethod === method.id
                            ? (method.type === 'credit' ? "bg-credit text-white" : "bg-primary text-white")
                            : "bg-muted text-muted-foreground"
                        )}>
                          {method.type === 'credit' ? <CreditCardIcon className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                        </div>
                        <span className="text-xs font-semibold truncate w-full text-center">{method.name}</span>
                        {paymentMethod === method.id && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isCreditType && creditCards.length > 0 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Cartão de Crédito</Label>
                    <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {creditCards.map(card => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCard && (
                    <div className="rounded-lg border p-3 bg-muted/30 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Limite do cartão</span>
                        <span className="font-mono">{formatCurrency(selectedCard.limit)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Utilizado na competência</span>
                        <span className="font-mono text-expense">{formatCurrency(card1Utilized)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Crédito disponível</span>
                        <span className={cn('font-mono', card1Available >= 0 ? 'text-income' : 'text-expense')}>
                          {formatCurrency(card1Available)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Competência: {formatMonthLabel(competenceMonth)}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor Total</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currencySymbol || 'R$'}
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
                      <SelectContent className="max-h-[300px]">
                        {Array.from({ length: 48 }, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}x {num > 1 && totalFinalCents > 0 && (
                              <span className="text-muted-foreground ml-1">
                                de {formatCurrency(Math.floor(totalFinalCents / num))}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isCreditType && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entryAmount">Entrada ({currencySymbol || 'R$'})</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currencySymbol || 'R$'}
                      </span>
                      <Input
                        id="entryAmount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={entryAmount}
                        onChange={(e) => setEntryAmount(e.target.value)}
                        className="pl-10 font-mono"
                      />
                    </div>
                    {isEntryInvalid && (
                      <p className="text-xs text-expense">A entrada não pode ser maior que o valor total.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Valor financiado</Label>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm font-mono">
                      {formatCurrency(financedBaseCents)}
                    </div>
                  </div>
                </div>
              )}

              {isCreditType && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Juros</Label>
                      <div className="flex gap-2">
                        <Select
                          value={interestMode}
                          onValueChange={(v) => setInterestMode(v as 'percent' | 'fixed')}
                          disabled={compoundEnabled}
                        >
                          <SelectTrigger className="w-[92px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">%</SelectItem>
                            <SelectItem value="fixed">{currencySymbol || 'R$'}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder={interestMode === 'percent' ? '0,0' : '0,00'}
                          value={interestValue}
                          onChange={(e) => setInterestValue(e.target.value)}
                          className="font-mono"
                          disabled={compoundEnabled}
                        />
                      </div>
                      {compoundEnabled && (
                        <p className="text-xs text-muted-foreground">
                          Juros em {currencySymbol || 'R$'} unico desativado.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Multa</Label>
                      <div className="flex gap-2">
                        <Select value={penaltyMode} onValueChange={(v) => setPenaltyMode(v as 'percent' | 'fixed')}>
                          <SelectTrigger className="w-[92px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">%</SelectItem>
                            <SelectItem value="fixed">{currencySymbol || 'R$'}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder={penaltyMode === 'percent' ? '0,0' : '0,00'}
                          value={penaltyValue}
                          onChange={(e) => setPenaltyValue(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30">
                    <div
                      role="button"
                      aria-expanded={isCompoundExpanded}
                      className="flex items-start justify-between gap-3 p-3 cursor-pointer"
                      onClick={() => setIsCompoundExpanded((prev) => !prev)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={cn('h-4 w-4 transition-transform', isCompoundExpanded && 'rotate-90')} />
                          <Label>Juros compostos mensais</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">{compoundSummary}</p>
                      </div>
                      <div onClick={(event) => event.stopPropagation()}>
                        <Switch
                          checked={compoundEnabled}
                          onCheckedChange={(checked) => {
                            setCompoundEnabled(checked);
                            setIsCompoundExpanded(checked);
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className={cn(
                        'px-3 pb-3 transition-all duration-200',
                        isCompoundExpanded ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                      )}
                    >
                      <div className="rounded-lg border p-3 bg-background space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Taxa de juros mensal (%)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,0"
                              value={compoundRate}
                              onChange={(e) => setCompoundRate(e.target.value)}
                              className="font-mono"
                              disabled={!compoundEnabled}
                            />
                            {compoundRateInvalid && (
                              <p className="text-xs text-expense">A taxa não pode ser negativa.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Método</Label>
                            <Select
                              value={compoundMethod}
                              onValueChange={(v) => setCompoundMethod(v as 'price' | 'variable')}
                              disabled={!compoundEnabled}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="price">Parcela fixa (Price)</SelectItem>
                                <SelectItem value="variable">Parcela variável</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Os juros incidem sobre o saldo devedor acumulado (juros sobre juros). Alterar o método muda o valor das parcelas.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isCreditType && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label>Pagar com 2 cartões</Label>
                      <p className="text-xs text-muted-foreground">Distribua o valor final entre dois cartões.</p>
                    </div>
                    <Switch
                      checked={splitEnabled}
                      onCheckedChange={(checked) => setSplitEnabled(checked)}
                      disabled={creditCards.length < 2}
                    />
                  </div>

                  {creditCards.length < 2 && (
                    <p className="text-xs text-muted-foreground">Cadastre outro cartão para habilitar o split.</p>
                  )}

                  {splitEnabled && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cartão 1</Label>
                          <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o cartão" />
                            </SelectTrigger>
                            <SelectContent>
                              {creditCards.map(card => (
                                <SelectItem key={card.id} value={card.id} disabled={card.id === card2Id}>
                                  {card.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Valor no Cartão 1</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol || 'R$'}</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={card1Amount}
                              onChange={(e) => {
                                setCard1Amount(e.target.value);
                                setSplitDirty(true);
                              }}
                              className="pl-10 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cartão 2</Label>
                          <Select value={card2Id} onValueChange={setCard2Id}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o cartão" />
                            </SelectTrigger>
                            <SelectContent>
                              {creditCards.map(card => (
                                <SelectItem key={card.id} value={card.id} disabled={card.id === selectedCardId}>
                                  {card.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Valor no Cartão 2</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol || 'R$'}</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0,00"
                              value={card2Amount}
                              onChange={(e) => {
                                setCard2Amount(e.target.value);
                                setSplitDirty(true);
                              }}
                              className="pl-10 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {splitMismatch && (
                        <p className="text-xs text-expense">A soma dos cartões deve fechar com o valor final.</p>
                      )}
                      {splitInvalidCards && (
                        <p className="text-xs text-expense">Selecione cartões diferentes.</p>
                      )}

                      {selectedCard && (
                        <div className="rounded-lg border p-3 bg-muted/30 text-sm space-y-1">
                          <p className="text-xs font-medium">{selectedCard.name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Utilizado na competência</span>
                            <span className="font-mono text-expense">{formatCurrency(card1Utilized)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Crédito disponível</span>
                            <span className={cn('font-mono', card1Available >= 0 ? 'text-income' : 'text-expense')}>
                              {formatCurrency(card1Available)}
                            </span>
                          </div>
                        </div>
                      )}

                      {secondCard && (
                        <div className="rounded-lg border p-3 bg-muted/30 text-sm space-y-1">
                          <p className="text-xs font-medium">{secondCard.name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Utilizado na competência</span>
                            <span className="font-mono text-expense">{formatCurrency(card2Utilized)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Crédito disponível</span>
                            <span className={cn('font-mono', card2Available >= 0 ? 'text-income' : 'text-expense')}>
                              {formatCurrency(card2Available)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {requiresCreditCharge && (
                <div className="rounded-lg border bg-credit-light border-credit/20">
                  <div
                    role="button"
                    aria-expanded={isPreviewExpanded}
                    className="flex items-start justify-between gap-3 p-3 cursor-pointer"
                    onClick={() => setIsPreviewExpanded((prev) => !prev)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-credit">
                        <ChevronRight className={cn('h-4 w-4 transition-transform', isPreviewExpanded && 'rotate-90')} />
                        <span className="text-sm font-medium flex items-center gap-2">
                          <CreditCardIcon className="h-4 w-4" />
                          Prévia das Parcelas
                        </span>
                      </div>
                      {!isPreviewExpanded && (
                        <p className="text-xs text-muted-foreground">{previewSummary}</p>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      'px-3 pb-3 transition-all duration-200',
                      isPreviewExpanded ? 'max-h-[720px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                    )}
                  >
                    {!splitEnabled && (
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {scheduleSingle.map((inst, idx) => (
                          <div key={idx} className="p-2 bg-card rounded text-center">
                            <p className="text-muted-foreground">{formatMonthLabel(inst.month)}</p>
                            <p className="font-mono font-medium">{formatCurrency(inst.amount)}</p>
                            {compoundEnabled && (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Juros: {formatCurrency(inst.interest)} · Amort.: {formatCurrency(inst.amortization)} · Saldo: {formatCurrency(inst.balance)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {splitEnabled && (
                      <div className="space-y-3 text-xs">
                        <div className="space-y-2">
                          <p className="text-xs font-medium">{selectedCard?.name}</p>
                          <div className="grid grid-cols-4 gap-2">
                            {scheduleCard1.map((inst, idx) => (
                              <div key={idx} className="p-2 bg-card rounded text-center">
                                <p className="text-muted-foreground">{formatMonthLabel(inst.month)}</p>
                                <p className="font-mono font-medium">{formatCurrency(inst.amount)}</p>
                                {compoundEnabled && (
                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    Juros: {formatCurrency(inst.interest)} · Amort.: {formatCurrency(inst.amortization)} · Saldo: {formatCurrency(inst.balance)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium">{secondCard?.name}</p>
                          <div className="grid grid-cols-4 gap-2">
                            {scheduleCard2.map((inst, idx) => (
                              <div key={idx} className="p-2 bg-card rounded text-center">
                                <p className="text-muted-foreground">{formatMonthLabel(inst.month)}</p>
                                <p className="font-mono font-medium">{formatCurrency(inst.amount)}</p>
                                {compoundEnabled && (
                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    Juros: {formatCurrency(inst.interest)} · Amort.: {formatCurrency(inst.amortization)} · Saldo: {formatCurrency(inst.balance)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <AlertCircle className="h-3 w-3" />
                      Soma exata: {formatCurrency(previewTotalCents)}
                    </p>
                    <div className="pt-2 mt-2 border-t text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Capital (C)</span>
                        <span className="font-mono">{formatCurrency(financedBaseCents)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total pago</span>
                        <span className="font-mono">{formatCurrency(previewTotalCents)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total de juros</span>
                        <span className="font-mono">{formatCurrency(previewTotalInterestCents)}</span>
                      </div>
                      {compoundEnabled && compoundReferenceTotalCents > 0 && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Total com juros (referência)</span>
                          <span className="font-mono">{formatCurrency(compoundReferenceTotalCents)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Ex: Compras do mês"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {type === 'income' && (
                <div className="space-y-2">
                  <Label htmlFor="incomeDate">Data</Label>
                  <Input
                    id="incomeDate"
                    type="date"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                  />
                  {isIncomeDateInvalid && (
                    <p className="text-xs text-expense">Informe a data da Entrada.</p>
                  )}
                </div>
              )}

              {type === 'expense' && !isCreditType && (
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                  {isDueDateInvalid && (
                    <p className="text-xs text-expense">Informe a data de vencimento para Saídas.</p>
                  )}
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Repetir movimentação</Label>
                    <p className="text-[10px] text-muted-foreground">Para gastos fixos ou recorrentes</p>
                  </div>
                  <Switch
                    checked={recurrenceEnabled}
                    onCheckedChange={setRecurrenceEnabled}
                  />
                </div>

                {recurrenceEnabled && (
                  <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <div className="space-y-2">
                      <Label className="text-xs">Frequência</Label>
                      <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="bimonthly">Bimestral</SelectItem>
                          <SelectItem value="trimonthly">Trimestral</SelectItem>
                          <SelectItem value="semiannual">Semestral</SelectItem>
                          <SelectItem value="annual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Repetições</Label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={recurrenceCount}
                        onChange={(e) => setRecurrenceCount(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {!isCreditType && (
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
            </div>
            <div className="sticky bottom-0 border-t bg-background px-6 py-4">
              <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
                {isEditing ? 'Salvar Alterações' : `Adicionar ${type === 'income' ? 'Entrada' : 'Saída'}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showBudgetAlert} onOpenChange={setShowBudgetAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Orçamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta categoria está próxima de atingir ou já ultrapassou o orçamento definido. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {budgetSnapshot && simulation && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-3 bg-muted/30 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoria:</span>
                  <span className="font-medium">{categories.find(c => c.id === category)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orçado:</span>
                  <span className="font-mono">{formatCurrency(budgetSnapshot.budget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gasto Atual:</span>
                  <span className="font-mono">{formatCurrency(budgetSnapshot.spent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Restante:</span>
                  <span className={cn("font-mono", budgetSnapshot.remaining < 0 ? "text-expense" : "")}>
                    {formatCurrency(budgetSnapshot.remaining)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uso Atual:</span>
                  <span>{budgetSnapshot.usagePct.toFixed(1)}%</span>
                </div>
              </div>

              <div className="rounded-lg border p-3 border-primary/20 bg-primary/5 space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase text-primary/70">Simulação do Impacto</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nova Movimentação:</span>
                  <span className="font-mono font-bold">{formatCurrency(amountInCents)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-muted-foreground">Novo Gasto Total:</span>
                  <span className="font-mono font-bold">{formatCurrency(simulation.newSpent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Novo Uso:</span>
                  <span className={cn("font-bold", simulation.newUsagePct > 100 ? "text-expense" : "text-primary")}>
                    {simulation.newUsagePct.toFixed(1)}%
                  </span>
                </div>
                {simulation.overBy > 0 && (
                  <div className="flex justify-between text-expense font-bold">
                    <span>Excedente:</span>
                    <span className="font-mono">{formatCurrency(simulation.overBy)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBudgetAlert(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setHasConfirmedBudget(true);
              setShowBudgetAlert(false);
              // Usar setTimeout para garantir que o estado atualizou antes do submit
              setTimeout(() => handleSubmit(), 0);
            }}>
              Confirmar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
