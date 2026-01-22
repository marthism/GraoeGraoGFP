import { Transaction, Installment, CreditCardInvoice, FinancialSummary, TransactionStatus } from '@/types/finance';
import { addDays, parseISO, isWithinInterval, startOfDay, endOfDay, format, addMonths } from 'date-fns';

// Currency formatting - always in BRL
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
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
  const today = startOfDay(new Date());
  const endDate = endOfDay(addDays(today, daysAhead));
  
  // Filter pending transactions (cash/debit only, not credit)
  const pendingTransactions = transactions.filter(t => {
    if (t.type !== type || t.status !== 'pending' || t.paymentMethod === 'credit') return false;
    const txDate = parseISO(t.transactionDate);
    return isWithinInterval(txDate, { start: today, end: endDate });
  });
  
  // For expenses, also include pending invoices
  let pendingInvoices: CreditCardInvoice[] = [];
  let pendingInstallments: Installment[] = [];
  
  if (type === 'expense') {
    pendingInvoices = invoices.filter(inv => {
      if (inv.status !== 'pending') return false;
      const dueDate = parseISO(inv.dueDate);
      return isWithinInterval(dueDate, { start: today, end: endDate });
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
  // Current balance: only paid/received transactions
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
  
  // Pending amounts
  const pendingIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const pendingExpensesCash = transactions
    .filter(t => t.type === 'expense' && t.status === 'pending' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const pendingInvoicesTotal = invoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  const pendingExpenses = pendingExpensesCash + pendingInvoicesTotal;
  
  // Projected balance
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
  return format(date, 'MMMM yyyy', { locale: undefined });
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
