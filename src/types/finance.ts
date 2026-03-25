export type TransactionType = 'income' | 'expense';
export type PaymentMethod = string; // 'credit' is special, others are custom
export type TransactionStatus = 'paid' | 'pending';
export type RecurrenceType = 'none' | 'weekly' | 'monthly' | 'bimonthly' | 'trimonthly' | 'semiannual' | 'annual';

export interface CreditCard {
  id: string;
  name: string;
  lastDigits: string;
  color: string;
  closingDay: number; // 1-28
  dueDay: number; // 1-28
  limit: number; // in cents
}

export interface Transaction {
  id: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  amount: number; // in cents to avoid floating point issues
  category: string;
  description: string;
  transactionDate: string; // ISO date - data real da compra/recebimento
  date?: string; // ISO date - data de lançamento (entrada)
  dueDate?: string; // ISO date YYYY-MM-DD - vencimento
  paymentDate?: string; // ISO date - data em que o pagamento foi efetivado
  competenceMonth: string; // YYYY-MM - mês de referência contábil
  status: TransactionStatus;
  recurrence?: RecurrenceType;
  recurrenceId?: string; // Para agrupar transações recorrentes
  creditCardId?: string; // Reference to credit card if payment method is credit
  installmentIndex?: number;
  installmentsTotal?: number;
  installmentGroupId?: string; // ID interno para agrupar parcelas
  parentId?: string; // ID da transação original em caso de parcelamento
  createdAt: string;
  updatedAt: string;
}

export interface Installment {
  id: string;
  transactionId: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number; // in cents
  dueMonth: string; // YYYY-MM
  status: TransactionStatus;
  invoiceId?: string;
  creditCardId?: string;
}

export interface CreditCardInvoice {
  id: string;
  creditCardId: string;
  month: string; // YYYY-MM
  dueDate: string; // ISO date
  totalAmount: number; // in cents
  status: TransactionStatus;
  installmentIds: string[];
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon?: string;
}

export interface MonthlyBudget {
  id: string;
  categoryId: string;
  month: string; // YYYY-MM
  budgetAmount: number; // in cents
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  type: 'cash' | 'credit'; // credit has special logic
}

export interface UserSettings {
  userName: string;
  theme: 'light' | 'dark' | 'system';
}

export interface FinancialSummary {
  currentBalance: number; // only paid/received
  projectedBalance: number; // current + pending
  pendingIncome: number;
  pendingExpenses: number;
  pendingInvoices: number;
}

// Default credit card
export const DEFAULT_CREDIT_CARDS: CreditCard[] = [
  { 
    id: 'nubank', 
    name: 'Nubank', 
    lastDigits: '1234', 
    color: 'hsl(280, 100%, 60%)', 
    closingDay: 3, 
    dueDay: 10, 
    limit: 500000 // R$ 5.000,00
  },
];

// Default categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salário', type: 'income', color: 'hsl(155, 70%, 35%)' },
  { id: 'freelance', name: 'Freelance', type: 'income', color: 'hsl(175, 70%, 35%)' },
  { id: 'investments', name: 'Investimentos', type: 'income', color: 'hsl(200, 70%, 35%)' },
  { id: 'other-income', name: 'Outras Receitas', type: 'income', color: 'hsl(130, 60%, 40%)' },
  { id: 'food', name: 'Alimentação', type: 'expense', color: 'hsl(30, 70%, 50%)' },
  { id: 'transport', name: 'Transporte', type: 'expense', color: 'hsl(200, 60%, 50%)' },
  { id: 'housing', name: 'Moradia', type: 'expense', color: 'hsl(260, 50%, 55%)' },
  { id: 'health', name: 'Saúde', type: 'expense', color: 'hsl(0, 60%, 50%)' },
  { id: 'education', name: 'Educação', type: 'expense', color: 'hsl(45, 70%, 50%)' },
  { id: 'entertainment', name: 'Lazer', type: 'expense', color: 'hsl(320, 60%, 55%)' },
  { id: 'shopping', name: 'Compras', type: 'expense', color: 'hsl(280, 55%, 55%)' },
  { id: 'bills', name: 'Contas Fixas', type: 'expense', color: 'hsl(220, 50%, 50%)' },
  { id: 'other-expense', name: 'Outras Despesas', type: 'expense', color: 'hsl(0, 0%, 50%)' },
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'cash', name: 'Dinheiro/Pix', type: 'cash' },
  { id: 'debit', name: 'Débito', type: 'cash' },
  { id: 'credit', name: 'Crédito', type: 'credit' },
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  userName: 'Usuário',
  theme: 'dark',
};
