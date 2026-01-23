import { useState, useEffect, useCallback } from 'react';
import { 
  Transaction, 
  Installment, 
  CreditCardInvoice, 
  Category, 
  MonthlyBudget,
  CreditCard,
  UserSettings,
  DEFAULT_CATEGORIES,
  DEFAULT_CREDIT_CARDS,
  DEFAULT_USER_SETTINGS,
  TransactionStatus 
} from '@/types/finance';
import { generateId, calculateInstallments, getCurrentMonth } from '@/lib/finance-utils';
import { format } from 'date-fns';

interface FinanceState {
  transactions: Transaction[];
  installments: Installment[];
  invoices: CreditCardInvoice[];
  categories: Category[];
  budgets: MonthlyBudget[];
  creditCards: CreditCard[];
  userSettings: UserSettings;
}

const STORAGE_KEY = 'finance-manager-data';

const initialState: FinanceState = {
  transactions: [],
  installments: [],
  invoices: [],
  categories: DEFAULT_CATEGORIES,
  budgets: [],
  creditCards: DEFAULT_CREDIT_CARDS,
  userSettings: DEFAULT_USER_SETTINGS,
};

function loadFromStorage(): FinanceState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...initialState,
        ...parsed,
        categories: parsed.categories?.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
        creditCards: parsed.creditCards?.length > 0 ? parsed.creditCards : DEFAULT_CREDIT_CARDS,
        userSettings: parsed.userSettings || DEFAULT_USER_SETTINGS,
      };
    }
  } catch (error) {
    console.error('Error loading finance data:', error);
  }
  return initialState;
}

function saveToStorage(state: FinanceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving finance data:', error);
  }
}

export function useFinanceStore() {
  const [state, setState] = useState<FinanceState>(loadFromStorage);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Apply theme
  useEffect(() => {
    const theme = state.userSettings.theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [state.userSettings.theme]);

  // Add a new transaction
  const addTransaction = useCallback((
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    installmentCount?: number
  ) => {
    const now = new Date().toISOString();
    const transactionId = generateId();
    
    const transaction: Transaction = {
      ...data,
      id: transactionId,
      createdAt: now,
      updatedAt: now,
    };

    setState(prev => {
      let newInstallments = [...prev.installments];
      let newInvoices = [...prev.invoices];

      // Get credit card for due date calculation
      const creditCard = data.creditCardId 
        ? prev.creditCards.find(c => c.id === data.creditCardId)
        : prev.creditCards[0];

      // Handle credit card installments
      if (data.paymentMethod === 'credit' && installmentCount && installmentCount > 1) {
        const { amounts, months } = calculateInstallments(
          data.amount,
          installmentCount,
          data.competenceMonth
        );

        const installments: Installment[] = amounts.map((amount, index) => ({
          id: generateId(),
          transactionId,
          installmentNumber: index + 1,
          totalInstallments: installmentCount,
          amount,
          dueMonth: months[index],
          status: 'pending' as TransactionStatus,
          creditCardId: data.creditCardId || prev.creditCards[0]?.id,
        }));

        newInstallments = [...newInstallments, ...installments];

        // Group installments into invoices
        installments.forEach(inst => {
          const existingInvoice = newInvoices.find(
            inv => inv.month === inst.dueMonth && inv.creditCardId === inst.creditCardId
          );
          
          if (existingInvoice) {
            existingInvoice.installmentIds.push(inst.id);
            existingInvoice.totalAmount += inst.amount;
          } else {
            // Create new invoice for this month
            const [year, month] = inst.dueMonth.split('-').map(Number);
            const dueDay = creditCard?.dueDay || 10;
            const dueDate = new Date(year, month - 1, dueDay);
            
            newInvoices.push({
              id: generateId(),
              creditCardId: inst.creditCardId || prev.creditCards[0]?.id,
              month: inst.dueMonth,
              dueDate: format(dueDate, 'yyyy-MM-dd'),
              totalAmount: inst.amount,
              status: 'pending',
              installmentIds: [inst.id],
            });
          }
        });
      } else if (data.paymentMethod === 'credit') {
        // Single credit purchase
        const dueMonth = data.competenceMonth;
        const cardId = data.creditCardId || prev.creditCards[0]?.id;
        const existingInvoice = newInvoices.find(
          inv => inv.month === dueMonth && inv.creditCardId === cardId
        );
        
        const installment: Installment = {
          id: generateId(),
          transactionId,
          installmentNumber: 1,
          totalInstallments: 1,
          amount: data.amount,
          dueMonth,
          status: 'pending',
          creditCardId: cardId,
        };
        
        newInstallments.push(installment);
        
        if (existingInvoice) {
          existingInvoice.installmentIds.push(installment.id);
          existingInvoice.totalAmount += installment.amount;
        } else {
          const [year, month] = dueMonth.split('-').map(Number);
          const dueDay = creditCard?.dueDay || 10;
          const dueDate = new Date(year, month - 1, dueDay);
          
          newInvoices.push({
            id: generateId(),
            creditCardId: cardId,
            month: dueMonth,
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            totalAmount: installment.amount,
            status: 'pending',
            installmentIds: [installment.id],
          });
        }
      }

      return {
        ...prev,
        transactions: [...prev.transactions, transaction],
        installments: newInstallments,
        invoices: newInvoices,
      };
    });

    return transactionId;
  }, []);

  // Update transaction status
  const updateTransactionStatus = useCallback((id: string, status: TransactionStatus) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t =>
        t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
      ),
    }));
  }, []);

  // Delete transaction
  const deleteTransaction = useCallback((id: string) => {
    setState(prev => {
      // Remove associated installments
      const relatedInstallments = prev.installments.filter(i => i.transactionId === id);
      const installmentIds = relatedInstallments.map(i => i.id);
      
      // Update invoices
      const updatedInvoices = prev.invoices.map(inv => ({
        ...inv,
        installmentIds: inv.installmentIds.filter(iid => !installmentIds.includes(iid)),
        totalAmount: inv.totalAmount - relatedInstallments
          .filter(i => inv.installmentIds.includes(i.id))
          .reduce((sum, i) => sum + i.amount, 0),
      })).filter(inv => inv.installmentIds.length > 0);

      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
        installments: prev.installments.filter(i => i.transactionId !== id),
        invoices: updatedInvoices,
      };
    });
  }, []);

  // Pay invoice
  const payInvoice = useCallback((invoiceId: string) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, status: 'paid' as TransactionStatus } : inv
      ),
      installments: prev.installments.map(inst => {
        const invoice = prev.invoices.find(inv => inv.id === invoiceId);
        if (invoice?.installmentIds.includes(inst.id)) {
          return { ...inst, status: 'paid' as TransactionStatus };
        }
        return inst;
      }),
    }));
  }, []);

  // Add/update budget
  const setBudget = useCallback((categoryId: string, month: string, amount: number) => {
    setState(prev => {
      const existingIndex = prev.budgets.findIndex(
        b => b.categoryId === categoryId && b.month === month
      );

      if (existingIndex >= 0) {
        const updated = [...prev.budgets];
        updated[existingIndex] = { ...updated[existingIndex], budgetAmount: amount };
        return { ...prev, budgets: updated };
      }

      return {
        ...prev,
        budgets: [
          ...prev.budgets,
          { id: generateId(), categoryId, month, budgetAmount: amount },
        ],
      };
    });
  }, []);

  // Get budget for category and month
  const getBudget = useCallback((categoryId: string, month: string): number => {
    const budget = state.budgets.find(
      b => b.categoryId === categoryId && b.month === month
    );
    return budget?.budgetAmount ?? 0;
  }, [state.budgets]);

  // Get spending by category for a month (considers purchase date for credit)
  const getSpendingByCategory = useCallback((month: string): Record<string, number> => {
    const spending: Record<string, number> = {};
    
    state.transactions
      .filter(t => t.type === 'expense' && t.competenceMonth === month)
      .forEach(t => {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
      });
    
    return spending;
  }, [state.transactions]);

  // Get transactions for a month
  const getTransactionsByMonth = useCallback((month: string): Transaction[] => {
    return state.transactions.filter(t => t.competenceMonth === month);
  }, [state.transactions]);

  // Get invoice by month
  const getInvoiceByMonth = useCallback((month: string): CreditCardInvoice | undefined => {
    return state.invoices.find(inv => inv.month === month);
  }, [state.invoices]);

  // Get installments for an invoice
  const getInstallmentsForInvoice = useCallback((invoiceId: string): Installment[] => {
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return [];
    return state.installments.filter(inst => invoice.installmentIds.includes(inst.id));
  }, [state.invoices, state.installments]);

  // Add category
  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory = { ...category, id: generateId() };
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
    return newCategory.id;
  }, []);

  // Credit Card Management
  const addCreditCard = useCallback((card: Omit<CreditCard, 'id'>) => {
    const newCard = { ...card, id: generateId() };
    setState(prev => ({
      ...prev,
      creditCards: [...prev.creditCards, newCard],
    }));
    return newCard.id;
  }, []);

  const updateCreditCard = useCallback((id: string, updates: Partial<CreditCard>) => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const deleteCreditCard = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.filter(c => c.id !== id),
    }));
  }, []);

  // User Settings
  const updateUserSettings = useCallback((updates: Partial<UserSettings>) => {
    setState(prev => ({
      ...prev,
      userSettings: { ...prev.userSettings, ...updates },
    }));
  }, []);

  // Load mock data
  const loadMockData = useCallback((mockData: Partial<FinanceState>) => {
    setState(prev => ({
      ...prev,
      ...mockData,
    }));
  }, []);

  // Clear all data
  const clearAllData = useCallback(() => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    transactions: state.transactions,
    installments: state.installments,
    invoices: state.invoices,
    categories: state.categories,
    budgets: state.budgets,
    creditCards: state.creditCards,
    userSettings: state.userSettings,
    addTransaction,
    updateTransactionStatus,
    deleteTransaction,
    payInvoice,
    setBudget,
    getBudget,
    getSpendingByCategory,
    getTransactionsByMonth,
    getInvoiceByMonth,
    getInstallmentsForInvoice,
    addCategory,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    updateUserSettings,
    loadMockData,
    clearAllData,
  };
}