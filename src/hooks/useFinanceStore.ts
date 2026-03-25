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
  PaymentMethodOption,
  DEFAULT_USER_SETTINGS,
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  TransactionStatus,
  RecurrenceType,
} from '@/types/finance';
import { AppLocale, DisplayMode, ResolutionOption } from '@/types/app-settings';
import { generateId, calculateInstallments, getNextRecurringDate, addMonthsPreserveDay } from '@/lib/finance-utils';
import { addMonths, format, parseISO } from 'date-fns';

interface FinanceData {
  transactions: Transaction[];
  installments: Installment[];
  invoices: CreditCardInvoice[];
  categories: Category[];
  paymentMethods: PaymentMethodOption[];
  budgets: MonthlyBudget[];
  creditCards: CreditCard[];
  userSettings: UserSettings;
}

interface FinanceStore extends FinanceData {
  userName: string | null;
  hasCompletedOnboarding: boolean;
  useDemoData: boolean;
  displayMode: DisplayMode;
  resolution: ResolutionOption;
  locale: AppLocale;
  autostart: boolean;
  hasMigratedInstallmentIds: boolean;
  addTransaction: (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    installmentCount?: number,
    recurrenceCount?: number
  ) => string;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  updateTransactionStatus: (id: string, status: TransactionStatus, paymentDate?: string) => void;
  deleteTransaction: (id: string) => void;
  payInvoice: (invoiceId: string, paymentDate?: string) => void;
  setBudget: (categoryId: string, month: string, amount: number) => void;
  getBudget: (categoryId: string, month: string) => number;
  getSpendingByCategory: (month: string) => Record<string, number>;
  getTransactionsByMonth: (month: string) => Transaction[];
  getInvoiceByMonth: (month: string) => CreditCardInvoice | undefined;
  getInstallmentsForInvoice: (invoiceId: string) => Installment[];
  addCategory: (category: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addPaymentMethod: (method: Omit<PaymentMethodOption, 'id'>) => string;
  updatePaymentMethod: (id: string, updates: Partial<PaymentMethodOption>) => void;
  deletePaymentMethod: (id: string) => void;
  addCreditCard: (card: Omit<CreditCard, 'id'>) => string;
  updateCreditCard: (id: string, updates: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  updateUserSettings: (updates: Partial<UserSettings>) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setResolution: (resolution: ResolutionOption) => void;
  setLocale: (locale: AppLocale) => void;
  setAutostart: (autostart: boolean) => void;
  loadMockData: (mockData: Partial<FinanceData>) => void;
  setUserName: (name: string | null) => void;
  completeOnboardingWithDemo: (name: string, mockData: Partial<FinanceData>) => void;
  completeOnboardingBlank: (name: string) => void;
  clearBudgets: () => void;
  resetData: () => void;
  resetApp: () => void;
  migrateInstallmentGroups: () => void;
}

export const STORAGE_KEY = 'finance-manager-data';

const USER_NAME_KEY = 'app.userName';
const USE_DEMO_KEY = 'app.useDemoData';
const HAS_ONBOARDED_KEY = 'app.hasOnboarded';

const initialData: FinanceData = {
  transactions: [],
  installments: [],
  invoices: [],
  categories: DEFAULT_CATEGORIES,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  budgets: [],
  creditCards: [],
  userSettings: DEFAULT_USER_SETTINGS,
};

const initialState = {
  ...initialData,
  userName: null as string | null,
  hasCompletedOnboarding: false,
  useDemoData: false,
  displayMode: 'window' as DisplayMode,
  resolution: 'auto' as ResolutionOption,
  locale: 'pt-BR' as AppLocale,
  autostart: false,
  hasMigratedInstallmentIds: false,
};

const normalizeData = (data?: Partial<FinanceData>): FinanceData => ({
  transactions: data?.transactions ?? [],
  installments: data?.installments ?? [],
  invoices: data?.invoices ?? [],
  categories: data?.categories && data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES,
  paymentMethods: data?.paymentMethods && data.paymentMethods.length > 0 ? data.paymentMethods : DEFAULT_PAYMENT_METHODS,
  budgets: data?.budgets ?? [],
  creditCards: data?.creditCards ?? [],
  userSettings: data?.userSettings ?? DEFAULT_USER_SETTINGS,
});

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      addTransaction: (data, installmentCount = 1, recurrenceCount) => {
        // Allow recurrenceCount from either the explicit arg or embedded in data
        const effectiveRecurrenceCount = recurrenceCount ?? (data as any).recurrenceCount ?? 1;
        const now = new Date().toISOString();
        const recurrenceId = data.recurrence && data.recurrence !== 'none' ? generateId() : undefined;
        const transactionsToCreate: Transaction[] = [];

        const baseTransactionDate = data.type === 'income'
          ? (data.date || data.transactionDate)
          : data.transactionDate;
        const baseDueDate = data.type === 'expense' ? data.dueDate : undefined;

        for (let i = 0; i < effectiveRecurrenceCount; i++) {
          const tDate = getNextRecurringDate(baseTransactionDate, i, data.recurrence || 'none');
          const tDateStr = format(tDate, 'yyyy-MM-dd');
          const dueDateStr = baseDueDate
            ? format(getNextRecurringDate(baseDueDate, i, data.recurrence || 'none'), 'yyyy-MM-dd')
            : undefined;
          let cMonth = format(tDate, 'yyyy-MM');

          if (data.paymentMethod === 'credit' && data.creditCardId) {
            const card = get().creditCards.find(c => c.id === data.creditCardId);
            if (card) {
              const closingDate = new Date(tDate.getFullYear(), tDate.getMonth(), card.closingDay);
              const compDate = tDate > closingDate ? addMonths(tDate, 1) : tDate;
              cMonth = format(compDate, 'yyyy-MM');
            }
          }

          if (data.paymentMethod === 'credit' && installmentCount && installmentCount > 1) {
            const { amounts, months } = calculateInstallments(
              data.amount,
              installmentCount,
              cMonth
            );

            const parentId = generateId();
            const installmentGroupId = parentId;

            amounts.forEach((amount, index) => {
              const instMonth = months[index];
              const [year, month] = instMonth.split('-').map(Number);
              const instDate = new Date(year, month - 1, parseISO(data.transactionDate).getDate());
              const instDueDate = dueDateStr
                ? format(addMonthsPreserveDay(parseISO(dueDateStr), index), 'yyyy-MM-dd')
                : undefined;

              transactionsToCreate.push({
                ...data,
                id: generateId(),
                amount: amount,
                transactionDate: format(instDate, 'yyyy-MM-dd'),
                date: data.type === 'income' ? tDateStr : data.date,
                dueDate: instDueDate,
                competenceMonth: instMonth,
                installmentIndex: index + 1,
                installmentsTotal: installmentCount,
                installmentGroupId,
                parentId: parentId,
                recurrenceId,
                createdAt: now,
                updatedAt: now,
              });
            });
          } else {
            transactionsToCreate.push({
              ...data,
              id: generateId(),
              transactionDate: tDateStr,
              date: data.type === 'income' ? tDateStr : data.date,
              dueDate: dueDateStr,
              competenceMonth: cMonth,
              recurrenceId,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        set(state => {
          let newTransactions = [...state.transactions];
          let newInstallments = [...state.installments];
          let newInvoices = [...state.invoices];

          transactionsToCreate.forEach(tx => {
            newTransactions.push(tx);

            const creditCard = tx.creditCardId
              ? state.creditCards.find(c => c.id === tx.creditCardId)
              : state.creditCards[0];

            if (tx.paymentMethod === 'credit') {
              const dueMonth = tx.competenceMonth;
              const cardId = tx.creditCardId || state.creditCards[0]?.id;
              if (!cardId) {
                // No credit card available – skip installment/invoice creation to avoid data corruption
                return;
              }
              const existingInvoice = newInvoices.find(
                inv => inv.month === dueMonth && inv.creditCardId === cardId
              );

              const installment: Installment = {
                id: generateId(),
                transactionId: tx.id,
                installmentNumber: tx.installmentIndex || 1,
                totalInstallments: tx.installmentsTotal || 1,
                amount: tx.amount,
                dueMonth,
                status: tx.status || 'pending',
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
          });

          return {
            ...state,
            transactions: newTransactions,
            installments: newInstallments,
            invoices: newInvoices,
          };
        });

        return transactionsToCreate[0].id;
      },
      updateTransaction: (id, updates) =>
        set(state => {
          const existing = state.transactions.find(t => t.id === id);
          if (!existing) return state;

          const updatedTransactions = state.transactions.map(t => {
            if (t.id !== id) return t;
            return { ...t, ...updates, updatedAt: new Date().toISOString() };
          });

          let updatedInstallments = state.installments;
          let updatedInvoices = state.invoices;

          const relatedInstallment = state.installments.find(inst => inst.transactionId === id);
          if (relatedInstallment && updates.amount !== undefined) {
            const diff = updates.amount - relatedInstallment.amount;
            updatedInstallments = state.installments.map(inst =>
              inst.transactionId === id ? { ...inst, amount: updates.amount ?? inst.amount } : inst
            );
            if (diff !== 0) {
              updatedInvoices = state.invoices.map(inv =>
                inv.installmentIds.includes(relatedInstallment.id)
                  ? { ...inv, totalAmount: inv.totalAmount + diff }
                  : inv
              );
            }
          }

          return {
            ...state,
            transactions: updatedTransactions,
            installments: updatedInstallments,
            invoices: updatedInvoices,
          };
        }),
      updateTransactionStatus: (id, status, paymentDate) =>
        set(state => {
          const updatedTransactions = state.transactions.map(t =>
            t.id === id ? {
              ...t,
              status,
              paymentDate: status === 'paid' ? (paymentDate || new Date().toISOString().split('T')[0]) : undefined,
              updatedAt: new Date().toISOString()
            } : t
          );

          const updatedInstallments = state.installments.map(inst =>
            inst.transactionId === id ? { ...inst, status } : inst
          );

          return {
            ...state,
            transactions: updatedTransactions,
            installments: updatedInstallments,
          };
        }),
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
      payInvoice: (invoiceId, paymentDate) =>
        set(state => {
          const invoice = state.invoices.find(inv => inv.id === invoiceId);
          if (!invoice) return state;

          const finalPaymentDate = paymentDate || new Date().toISOString().split('T')[0];

          const updatedInvoices = state.invoices.map(inv =>
            inv.id === invoiceId ? { ...inv, status: 'paid' as TransactionStatus } : inv
          );

          const updatedInstallments = state.installments.map(inst => {
            if (invoice.installmentIds.includes(inst.id)) {
              return { ...inst, status: 'paid' as TransactionStatus };
            }
            return inst;
          });

          const paidInstallmentTxIds = state.installments
            .filter(inst => invoice.installmentIds.includes(inst.id))
            .map(inst => inst.transactionId);

          const updatedTransactions = state.transactions.map(tx => {
            if (paidInstallmentTxIds.includes(tx.id)) {
              return {
                ...tx,
                status: 'paid' as TransactionStatus,
                paymentDate: tx.paymentDate || finalPaymentDate,
                updatedAt: new Date().toISOString()
              };
            }
            return tx;
          });

          return {
            ...state,
            invoices: updatedInvoices,
            installments: updatedInstallments,
            transactions: updatedTransactions,
          };
        }),
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
      updateCategory: (id, updates) =>
        set(state => ({
          ...state,
          categories: state.categories.map(c => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCategory: id =>
        set(state => ({
          ...state,
          categories: state.categories.filter(c => c.id !== id),
        })),
      addPaymentMethod: method => {
        const id = generateId();
        set(state => ({
          ...state,
          paymentMethods: [...state.paymentMethods, { ...method, id }],
        }));
        return id;
      },
      updatePaymentMethod: (id, updates) =>
        set(state => ({
          ...state,
          paymentMethods: state.paymentMethods.map(m => (m.id === id ? { ...m, ...updates } : m)),
        })),
      deletePaymentMethod: id =>
        set(state => ({
          ...state,
          paymentMethods: state.paymentMethods.filter(m => m.id !== id),
        })),
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
      setDisplayMode: mode =>
        set(state => (state.displayMode === mode ? state : { ...state, displayMode: mode })),
      setResolution: resolution =>
        set(state => (state.resolution === resolution ? state : { ...state, resolution })),
      setLocale: locale =>
        set(state => (state.locale === locale ? state : { ...state, locale })),
      setAutostart: autostart =>
        set(state => (state.autostart === autostart ? state : { ...state, autostart })),
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
      clearBudgets: () =>
        set(state => ({
          ...state,
          budgets: [],
        })),
      resetData: () =>
        set(state => ({
          ...state,
          transactions: [],
          installments: [],
          invoices: [],
          budgets: [],
          categories: DEFAULT_CATEGORIES,
          paymentMethods: DEFAULT_PAYMENT_METHODS,
          creditCards: [],
          useDemoData: false,
        })),
      resetApp: () => {
        // Limpar localStorage explicitamente
        localStorage.clear();

        // Resetar estado para o inicial
        set({
          ...initialState,
          userName: null,
          hasCompletedOnboarding: false,
          useDemoData: false
        });

        // Se estiver no Tauri, relança o app para uma limpeza completa
        const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
        if (isTauri) {
          void (async () => {
            const { relaunch } = await import('@tauri-apps/api/process');
            await relaunch();
          })();
          return;
        }

        // Fallback para Web: recarrega a página
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      },
      migrateInstallmentGroups: () => {
        const state = get();
        if (state.hasMigratedInstallmentIds) return;

        const transactions = [...state.transactions];
        let changed = false;

        const groupMap = new Map<string, string>();

        const makeGroupKey = (tx: Transaction) => {
          const desc = tx.description.toLowerCase().trim().replace(/\s+/g, ' ');
          const amount = tx.amount;
          const total = tx.installmentsTotal || 0;
          const card = tx.creditCardId || "";
          return `${card}|${desc}|${total}|${amount}`;
        };

        const updatedTransactions = transactions.map(tx => {
          if (tx.installmentsTotal && tx.installmentsTotal > 1) {
            if (!tx.installmentGroupId) {
              if (tx.parentId) {
                changed = true;
                return { ...tx, installmentGroupId: tx.parentId };
              } else {
                const key = makeGroupKey(tx);
                let groupId = groupMap.get(key);
                if (!groupId) {
                  groupId = generateId();
                  groupMap.set(key, groupId);
                }
                changed = true;
                return { ...tx, installmentGroupId: groupId };
              }
            }
          }
          return tx;
        });

        if (changed) {
          set({
            transactions: updatedTransactions,
            hasMigratedInstallmentIds: true
          });
        } else {
          set({ hasMigratedInstallmentIds: true });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Partial<FinanceStore>;
        const legacy = (persistedState as { transactions?: Transaction[] })?.transactions
          ? (persistedState as Partial<FinanceStore>)
          : state;
        const normalized = normalizeData(legacy as Partial<FinanceData>);
        const userName = legacy.userName ?? legacy.userSettings?.userName ?? null;

        // Forçar onboarding se o nome for o padrão ou nulo
        const isNewUser = !userName || userName === 'Usuário';

        const displayMode = legacy.displayMode ?? 'window';
        const resolution = legacy.resolution ?? 'auto';
        const locale = legacy.locale ?? 'pt-BR';
        const autostart = legacy.autostart ?? false;
        return {
          ...initialState,
          ...normalized,
          userName: isNewUser ? null : userName,
          hasCompletedOnboarding: isNewUser ? false : (legacy.hasCompletedOnboarding ?? false),
          useDemoData: legacy.useDemoData ?? false,
          userSettings: legacy.userSettings ?? { ...DEFAULT_USER_SETTINGS, userName: userName ?? '' },
          displayMode,
          resolution,
          locale,
          autostart,
          hasMigratedInstallmentIds: legacy.hasMigratedInstallmentIds ?? false,
        } as FinanceStore;
      },
      merge: (persistedState, currentState) => {
        const state = (persistedState ?? {}) as Partial<FinanceStore>;

        // Sanitize potentially corrupted data from previous versions
        const rawTransactions = state.transactions ?? currentState.transactions;
        const rawInvoices = state.invoices ?? currentState.invoices;
        const rawInstallments = state.installments ?? currentState.installments;

        // Remove invoices with missing creditCardId or invalid dueDate
        const cleanInvoices = rawInvoices.filter(
          inv => inv.creditCardId && inv.dueDate && !isNaN(Date.parse(inv.dueDate))
        );

        // Collect valid invoice installment IDs
        const validInstallmentIds = new Set(
          cleanInvoices.flatMap(inv => inv.installmentIds)
        );

        // Remove orphaned installments (linked to removed invoices) that have no valid card
        const cleanInstallments = rawInstallments.filter(
          inst => inst.creditCardId || validInstallmentIds.has(inst.id)
        );

        // Remove credit transactions that reference non-existent cards and have no installment
        const installmentTxIds = new Set(cleanInstallments.map(inst => inst.transactionId));
        const cleanTransactions = rawTransactions.filter(
          t => t.paymentMethod !== 'credit' || t.creditCardId || installmentTxIds.has(t.id)
        );

        return {
          ...currentState,
          ...state,
          transactions: cleanTransactions,
          installments: cleanInstallments,
          invoices: cleanInvoices,
          categories: state.categories ?? currentState.categories,
          budgets: state.budgets ?? currentState.budgets,
          creditCards: state.creditCards ?? currentState.creditCards,
          userSettings: state.userSettings ?? currentState.userSettings,
          userName: state.userName ?? currentState.userName,
          hasCompletedOnboarding:
            state.hasCompletedOnboarding ?? currentState.hasCompletedOnboarding,
          useDemoData: state.useDemoData ?? currentState.useDemoData,
          displayMode: state.displayMode ?? currentState.displayMode,
          resolution: state.resolution ?? currentState.resolution,
          locale: state.locale ?? currentState.locale,
          autostart: state.autostart ?? currentState.autostart,
          hasMigratedInstallmentIds: state.hasMigratedInstallmentIds ?? currentState.hasMigratedInstallmentIds,
        } as FinanceStore;
      },
    }
  )
);
