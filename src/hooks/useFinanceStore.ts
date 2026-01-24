import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Transaction,
  Installment,
  CreditCardInvoice,
  Category,
  MonthlyBudget,
  CreditCard,
  UserSettings,
  DEFAULT_USER_SETTINGS,
  TransactionStatus,
} from '@/types/finance';
import { generateId, calculateInstallments } from '@/lib/finance-utils';
import { format } from 'date-fns';

interface FinanceData {
  transactions: Transaction[];
  installments: Installment[];
  invoices: CreditCardInvoice[];
  categories: Category[];
  budgets: MonthlyBudget[];
  creditCards: CreditCard[];
  userSettings: UserSettings;
}

interface FinanceStore extends FinanceData {
  userName: string | null;
  hasCompletedOnboarding: boolean;
  useDemoData: boolean;
  addTransaction: (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    installmentCount?: number
  ) => string;
  updateTransactionStatus: (id: string, status: TransactionStatus) => void;
  deleteTransaction: (id: string) => void;
  payInvoice: (invoiceId: string) => void;
  setBudget: (categoryId: string, month: string, amount: number) => void;
  getBudget: (categoryId: string, month: string) => number;
  getSpendingByCategory: (month: string) => Record<string, number>;
  getTransactionsByMonth: (month: string) => Transaction[];
  getInvoiceByMonth: (month: string) => CreditCardInvoice | undefined;
  getInstallmentsForInvoice: (invoiceId: string) => Installment[];
  addCategory: (category: Omit<Category, 'id'>) => string;
  addCreditCard: (card: Omit<CreditCard, 'id'>) => string;
  updateCreditCard: (id: string, updates: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  updateUserSettings: (updates: Partial<UserSettings>) => void;
  loadMockData: (mockData: Partial<FinanceData>) => void;
  setUserName: (name: string | null) => void;
  completeOnboardingWithDemo: (name: string, mockData: Partial<FinanceData>) => void;
  completeOnboardingBlank: (name: string) => void;
  resetData: () => void;
  resetApp: () => void;
}

export const STORAGE_KEY = 'finance-manager-data';

const USER_NAME_KEY = 'app.userName';
const USE_DEMO_KEY = 'app.useDemoData';
const HAS_ONBOARDED_KEY = 'app.hasOnboarded';

const initialData: FinanceData = {
  transactions: [],
  installments: [],
  invoices: [],
  categories: [],
  budgets: [],
  creditCards: [],
  userSettings: DEFAULT_USER_SETTINGS,
};

const initialState = {
  ...initialData,
  userName: null as string | null,
  hasCompletedOnboarding: false,
  useDemoData: false,
};

const normalizeData = (data?: Partial<FinanceData>): FinanceData => ({
  transactions: data?.transactions ?? [],
  installments: data?.installments ?? [],
  invoices: data?.invoices ?? [],
  categories: data?.categories ?? [],
  budgets: data?.budgets ?? [],
  creditCards: data?.creditCards ?? [],
  userSettings: data?.userSettings ?? DEFAULT_USER_SETTINGS,
});

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      addTransaction: (data, installmentCount) => {
        const now = new Date().toISOString();
        const transactionId = generateId();

        const transaction: Transaction = {
          ...data,
          id: transactionId,
          createdAt: now,
          updatedAt: now,
        };

        set(state => {
          let newInstallments = [...state.installments];
          let newInvoices = [...state.invoices];

          const creditCard = data.creditCardId
            ? state.creditCards.find(c => c.id === data.creditCardId)
            : state.creditCards[0];

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
              creditCardId: data.creditCardId || state.creditCards[0]?.id,
            }));

            newInstallments = [...newInstallments, ...installments];

            installments.forEach(inst => {
              const existingInvoice = newInvoices.find(
                inv => inv.month === inst.dueMonth && inv.creditCardId === inst.creditCardId
              );

              if (existingInvoice) {
                existingInvoice.installmentIds.push(inst.id);
                existingInvoice.totalAmount += inst.amount;
              } else {
                const [year, month] = inst.dueMonth.split('-').map(Number);
                const dueDay = creditCard?.dueDay || 10;
                const dueDate = new Date(year, month - 1, dueDay);

                newInvoices.push({
                  id: generateId(),
                  creditCardId: inst.creditCardId || state.creditCards[0]?.id,
                  month: inst.dueMonth,
                  dueDate: format(dueDate, 'yyyy-MM-dd'),
                  totalAmount: inst.amount,
                  status: 'pending',
                  installmentIds: [inst.id],
                });
              }
            });
          } else if (data.paymentMethod === 'credit') {
            const dueMonth = data.competenceMonth;
            const cardId = data.creditCardId || state.creditCards[0]?.id;
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
            ...state,
            transactions: [...state.transactions, transaction],
            installments: newInstallments,
            invoices: newInvoices,
          };
        });

        return transactionId;
      },
      updateTransactionStatus: (id, status) =>
        set(state => ({
          ...state,
          transactions: state.transactions.map(t =>
            t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t
          ),
        })),
      deleteTransaction: id =>
        set(state => {
          const relatedInstallments = state.installments.filter(i => i.transactionId === id);
          const installmentIds = relatedInstallments.map(i => i.id);

          const updatedInvoices = state.invoices
            .map(inv => ({
              ...inv,
              installmentIds: inv.installmentIds.filter(iid => !installmentIds.includes(iid)),
              totalAmount:
                inv.totalAmount -
                relatedInstallments
                  .filter(i => inv.installmentIds.includes(i.id))
                  .reduce((sum, i) => sum + i.amount, 0),
            }))
            .filter(inv => inv.installmentIds.length > 0);

          return {
            ...state,
            transactions: state.transactions.filter(t => t.id !== id),
            installments: state.installments.filter(i => i.transactionId !== id),
            invoices: updatedInvoices,
          };
        }),
      payInvoice: invoiceId =>
        set(state => ({
          ...state,
          invoices: state.invoices.map(inv =>
            inv.id === invoiceId ? { ...inv, status: 'paid' as TransactionStatus } : inv
          ),
          installments: state.installments.map(inst => {
            const invoice = state.invoices.find(inv => inv.id === invoiceId);
            if (invoice?.installmentIds.includes(inst.id)) {
              return { ...inst, status: 'paid' as TransactionStatus };
            }
            return inst;
          }),
        })),
      setBudget: (categoryId, month, amount) =>
        set(state => {
          const existingIndex = state.budgets.findIndex(
            b => b.categoryId === categoryId && b.month === month
          );

          if (existingIndex >= 0) {
            const updated = [...state.budgets];
            updated[existingIndex] = { ...updated[existingIndex], budgetAmount: amount };
            return { ...state, budgets: updated };
          }

          return {
            ...state,
            budgets: [...state.budgets, { id: generateId(), categoryId, month, budgetAmount: amount }],
          };
        }),
      getBudget: (categoryId, month) => {
        const budget = get().budgets.find(b => b.categoryId === categoryId && b.month === month);
        return budget?.budgetAmount ?? 0;
      },
      getSpendingByCategory: month => {
        const spending: Record<string, number> = {};
        get()
          .transactions.filter(t => t.type === 'expense' && t.competenceMonth === month)
          .forEach(t => {
            spending[t.category] = (spending[t.category] || 0) + t.amount;
          });
        return spending;
      },
      getTransactionsByMonth: month => get().transactions.filter(t => t.competenceMonth === month),
      getInvoiceByMonth: month => get().invoices.find(inv => inv.month === month),
      getInstallmentsForInvoice: invoiceId => {
        const invoice = get().invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return [];
        return get().installments.filter(inst => invoice.installmentIds.includes(inst.id));
      },
      addCategory: category => {
        const newCategory = { ...category, id: generateId() };
        set(state => ({
          ...state,
          categories: [...state.categories, newCategory],
        }));
        return newCategory.id;
      },
      addCreditCard: card => {
        const newCard = { ...card, id: generateId() };
        set(state => ({
          ...state,
          creditCards: [...state.creditCards, newCard],
        }));
        return newCard.id;
      },
      updateCreditCard: (id, updates) =>
        set(state => ({
          ...state,
          creditCards: state.creditCards.map(c => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCreditCard: id =>
        set(state => ({
          ...state,
          creditCards: state.creditCards.filter(c => c.id !== id),
        })),
      updateUserSettings: updates =>
        set(state => ({
          ...state,
          userSettings: { ...state.userSettings, ...updates },
          userName: updates.userName !== undefined ? updates.userName : state.userName,
        })),
      loadMockData: mockData => {
        const normalized = normalizeData(mockData);
        set(state => ({
          ...state,
          ...normalized,
          useDemoData: true,
        }));
      },
      setUserName: name =>
        set(state => ({
          ...state,
          userName: name,
          userSettings: { ...state.userSettings, userName: name ?? '' },
        })),
      completeOnboardingWithDemo: (name, mockData) => {
        const normalized = normalizeData(mockData);
        set({
          ...initialState,
          ...normalized,
          userName: name,
          hasCompletedOnboarding: true,
          useDemoData: true,
          userSettings: { ...DEFAULT_USER_SETTINGS, userName: name },
        });
        localStorage.setItem(USER_NAME_KEY, name);
        localStorage.setItem(USE_DEMO_KEY, 'true');
        localStorage.setItem(HAS_ONBOARDED_KEY, 'true');
      },
      completeOnboardingBlank: name => {
        set({
          ...initialState,
          userName: name,
          hasCompletedOnboarding: true,
          useDemoData: false,
          userSettings: { ...DEFAULT_USER_SETTINGS, userName: name },
        });
        localStorage.setItem(USER_NAME_KEY, name);
        localStorage.setItem(USE_DEMO_KEY, 'false');
        localStorage.setItem(HAS_ONBOARDED_KEY, 'true');
      },
      resetData: () =>
        set(state => ({
          ...state,
          transactions: [],
          installments: [],
          invoices: [],
          budgets: [],
          categories: [],
          creditCards: [],
          useDemoData: false,
        })),
      resetApp: () => {
        set({ ...initialState });
        localStorage.removeItem(USER_NAME_KEY);
        localStorage.removeItem(USE_DEMO_KEY);
        localStorage.removeItem(HAS_ONBOARDED_KEY);
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<FinanceStore>;
        const legacy = (persistedState as { transactions?: Transaction[] })?.transactions
          ? (persistedState as Partial<FinanceStore>)
          : state;
        const normalized = normalizeData(legacy as Partial<FinanceData>);
        const userName = legacy.userName ?? legacy.userSettings?.userName ?? null;
        return {
          ...initialState,
          ...normalized,
          userName,
          hasCompletedOnboarding: legacy.hasCompletedOnboarding ?? Boolean(userName),
          useDemoData: legacy.useDemoData ?? false,
          userSettings: legacy.userSettings ?? { ...DEFAULT_USER_SETTINGS, userName: userName ?? '' },
        } as FinanceStore;
      },
      merge: (persistedState, currentState) => {
        const state = (persistedState ?? {}) as Partial<FinanceStore>;
        return {
          ...currentState,
          ...state,
          transactions: state.transactions ?? currentState.transactions,
          installments: state.installments ?? currentState.installments,
          invoices: state.invoices ?? currentState.invoices,
          categories: state.categories ?? currentState.categories,
          budgets: state.budgets ?? currentState.budgets,
          creditCards: state.creditCards ?? currentState.creditCards,
          userSettings: state.userSettings ?? currentState.userSettings,
          userName: state.userName ?? currentState.userName,
          hasCompletedOnboarding:
            state.hasCompletedOnboarding ?? currentState.hasCompletedOnboarding,
          useDemoData: state.useDemoData ?? currentState.useDemoData,
        } as FinanceStore;
      },
    }
  )
);

// Theme is applied in App to avoid duplicating effects per component.
