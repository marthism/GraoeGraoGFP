import { Transaction, Installment, CreditCardInvoice, FinancialSummary, TransactionStatus, RecurrenceType, CreditCard } from '@/types/finance';
import { addDays, parseISO, isWithinInterval, startOfDay, endOfDay, format, addMonths } from 'date-fns';
import { formatCurrency as formatCurrencyI18n, formatMonthYear } from '@/i18n';

// Currency formatting - locale aware (set in i18n)
export function formatCurrency(cents: number): string {
  return formatCurrencyI18n(cents);
}

// Parse currency input to cents
export function parseCurrencyToCents(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function addMonthsPreserveDay(baseDate: Date, monthsToAdd: number): Date {
  const baseDay = baseDate.getDate();
  const targetMonth = baseDate.getMonth() + monthsToAdd;
  const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(baseDay, lastDay);
  return new Date(targetYear, normalizedMonth, day);
}

export function getNextRecurringDate(baseDateStr: string, index: number, type: RecurrenceType): Date {
  const date = parseISO(baseDateStr);
  switch (type) {
    case 'weekly':
      return addDays(date, index * 7);
    case 'monthly':
      return addMonthsPreserveDay(date, index);
    case 'bimonthly':
      return addMonthsPreserveDay(date, index * 2);
    case 'trimonthly':
      return addMonthsPreserveDay(date, index * 3);
    case 'semiannual':
      return addMonthsPreserveDay(date, index * 6);
    case 'annual':
      return addMonthsPreserveDay(date, index * 12);
    default:
      return date;
  }
}

export function filterActiveInstallments(installments: Installment[], referenceMonth: string, cardId?: string): Installment[] {
  return installments.filter(inst => {
    if (inst.status === 'paid') return false;
    if (cardId && inst.creditCardId !== cardId) return false;
    return inst.dueMonth >= referenceMonth;
  });
}

export function clampDayToMonth(contextMonth: string, day: number): string {
  const [yearStr, monthStr] = contextMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return contextMonth;
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return `${contextMonth}-${String(safeDay).padStart(2, '0')}`;
}

export function getEffectiveDate(tx: Transaction, contextMonth?: string, creditCards?: CreditCard[]): string {
  if (tx.paymentMethod === 'credit' && contextMonth && creditCards?.length) {
    const card = tx.creditCardId ? creditCards.find(c => c.id === tx.creditCardId) : undefined;
    if (card?.dueDay) {
      return clampDayToMonth(contextMonth, card.dueDay);
    }
  }

  if (tx.type === 'income') {
    return tx.date || tx.transactionDate;
  }
  return tx.dueDate || tx.date || tx.transactionDate;
}

export function parseIsoDateLocal(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function isWithinDays(dateISO: string, daysAhead: number): boolean {
  const today = startOfDay(new Date());
  const endDate = endOfDay(addDays(today, daysAhead));
  const target = startOfDay(parseIsoDateLocal(dateISO));
  return isWithinInterval(target, { start: today, end: endDate });
}

// Calculate installments with exact distribution (no rounding errors)
export function calculateInstallments(
  totalAmount: number, // in cents
  numInstallments: number,
  startMonth: string // YYYY-MM
): { amounts: number[]; months: string[] } {
  if (numInstallments <= 0) return { amounts: [], months: [] };
  
  const baseAmount = Math.floor(totalAmount / numInstallments);
  const remainder = totalAmount - (baseAmount * numInstallments);
  
  const amounts: number[] = [];
  const months: string[] = [];
  
  for (let i = 0; i < numInstallments; i++) {
    // Add remainder to the first installment to ensure sum equals total
    const amount = i === 0 ? baseAmount + remainder : baseAmount;
    amounts.push(amount);
    
    // Calculate the month for this installment
    const [year, month] = startMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + i, 1);
    months.push(format(date, 'yyyy-MM'));
  }
  
  // Verify: sum must equal total
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum !== totalAmount) {
    console.error('Installment calculation error: sum does not match total', { sum, totalAmount });
  }
  
  return { amounts, months };
}

// Get transactions pending within a time window
export function getPendingInWindow(
  transactions: Transaction[],
  installments: Installment[],
  invoices: CreditCardInvoice[],
  daysAhead: number,
  type: 'income' | 'expense'
): { transactions: Transaction[]; installments: Installment[]; invoices: CreditCardInvoice[]; total: number } {
  // Filter pending transactions (cash/debit only, not credit)
  const pendingTransactions = transactions.filter(t => {
    if (t.type !== type || t.status !== 'pending' || t.paymentMethod === 'credit') return false;
    const effectiveDate = getEffectiveDate(t);
    return isWithinDays(effectiveDate, daysAhead);
  });
  
  // For expenses, also include pending invoices
  let pendingInvoices: CreditCardInvoice[] = [];
  let pendingInstallments: Installment[] = [];
  
  if (type === 'expense') {
    pendingInvoices = invoices.filter(inv => {
      if (inv.status !== 'pending') return false;
      return isWithinDays(inv.dueDate, daysAhead);
    });
  }
  
  const transactionTotal = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
  const invoiceTotal = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  return {
    transactions: pendingTransactions,
    installments: pendingInstallments,
    invoices: pendingInvoices,
    total: transactionTotal + invoiceTotal,
  };
}

// Calculate financial summary
export function calculateSummary(
  transactions: Transaction[],
  installments: Installment[],
  invoices: CreditCardInvoice[]
): FinancialSummary {
  const currentMonth = getCurrentMonth();

  // Current balance: only paid/received transactions (Total historical balance)
  const paidIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const paidExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const paidInvoices = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  const currentBalance = paidIncome - paidExpenses - paidInvoices;
  
  // Pending amounts: only for the CURRENT month
  const pendingIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'pending' && t.competenceMonth === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const pendingExpensesCash = transactions
    .filter(t => t.type === 'expense' && t.status === 'pending' && t.paymentMethod === 'cash' && t.competenceMonth === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const pendingInvoicesTotal = invoices
    .filter(inv => inv.status === 'pending' && inv.month === currentMonth)
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  const pendingExpenses = pendingExpensesCash + pendingInvoicesTotal;
  
  // Projected balance: current balance + pending income - pending expenses (for current month)
  const projectedBalance = currentBalance + pendingIncome - pendingExpenses;
  
  return {
    currentBalance,
    projectedBalance,
    pendingIncome,
    pendingExpenses,
    pendingInvoices: pendingInvoicesTotal,
  };
}

// Get month display name
export function getMonthDisplayName(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return formatMonthYear(date);
}

// Get current month string
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

// Get next invoice due date based on closing day and due day
export function getNextInvoiceDueDate(closingDay: number = 25, dueDay: number = 5): string {
  const today = new Date();
  const currentDay = today.getDate();
  
  let dueDate: Date;
  
  if (currentDay <= closingDay) {
    // Purchase will be on next month's invoice
    dueDate = addMonths(today, 1);
  } else {
    // Purchase will be on the month after next's invoice
    dueDate = addMonths(today, 2);
  }
  
  dueDate.setDate(dueDay);
  return format(dueDate, 'yyyy-MM-dd');
}

// Check if a date is overdue
export function isOverdue(dateStr: string): boolean {
  const date = parseISO(dateStr);
  const today = startOfDay(new Date());
  return date < today;
}

// Get status color class
export function getStatusColorClass(status: TransactionStatus, dueDate?: string): string {
  if (status === 'paid') return 'badge-paid';
  if (dueDate && isOverdue(dueDate)) return 'badge-overdue';
  return 'badge-pending';
}

// Installment Helpers
export function isCredit(tx: Transaction): boolean {
  return tx.paymentMethod === 'credit';
}

export function getInstallmentsTotal(tx: Transaction): number | null {
  return tx.installmentsTotal || null;
}

export function getInstallmentIndex(tx: Transaction): number | null {
  return tx.installmentIndex || null;
}

export function getInstallmentAmount(tx: Transaction): number {
  return tx.amount;
}

export function getInstallmentTotalAmount(tx: Transaction): number {
  const total = getInstallmentsTotal(tx);
  if (!total) return tx.amount;
  // Se tivermos o parentId, poderíamos buscar todas as parcelas, 
  // mas como regra de fallback usamos amount * total
  return tx.amount * total;
}

export function getInstallmentBadgeLabel(tx: Transaction): string {
  const total = getInstallmentsTotal(tx);
  const index = getInstallmentIndex(tx);
  if (!total || total <= 1) return "";
  if (index) return `Parcela ${index}/${total}`;
  return `${total}x`;
}

export function getInstallmentMeta(tx: Transaction) {
  const isInst = isCredit(tx) && (getInstallmentsTotal(tx) || 0) > 1;
  if (!isInst) return { isInstallment: false };

  const amount = getInstallmentAmount(tx);
  const totalAmount = getInstallmentTotalAmount(tx);
  
  return {
    isInstallment: true,
    perMonthText: `${formatCurrency(amount)}/mês`,
    totalText: `Total: ${formatCurrency(totalAmount)}`,
    badge: getInstallmentBadgeLabel(tx)
  };
}
