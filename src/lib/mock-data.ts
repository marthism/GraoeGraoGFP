import { Transaction, Installment, CreditCardInvoice, CreditCard, MonthlyBudget } from '@/types/finance';
import { generateId, getCurrentMonth } from './finance-utils';
import { format, subMonths, addMonths } from 'date-fns';

const currentMonth = getCurrentMonth();
const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM');
const twoMonthsAgo = format(subMonths(new Date(), 2), 'yyyy-MM');

export const MOCK_CREDIT_CARDS: CreditCard[] = [
  { 
    id: 'nubank', 
    name: 'Nubank', 
    lastDigits: '4532', 
    color: 'hsl(280, 100%, 60%)', 
    closingDay: 3, 
    dueDay: 10, 
    limit: 800000 // R$ 8.000,00
  },
  { 
    id: 'itau', 
    name: 'Itaú Platinum', 
    lastDigits: '7891', 
    color: 'hsl(25, 90%, 50%)', 
    closingDay: 15, 
    dueDay: 22, 
    limit: 1200000 // R$ 12.000,00
  },
  { 
    id: 'inter', 
    name: 'Inter', 
    lastDigits: '2468', 
    color: 'hsl(35, 100%, 50%)', 
    closingDay: 20, 
    dueDay: 27, 
    limit: 500000 // R$ 5.000,00
  },
];

export function generateMockData() {
  const transactions: Transaction[] = [];
  const installments: Installment[] = [];
  const invoices: CreditCardInvoice[] = [];
  const budgets: MonthlyBudget[] = [];

  // Helper to create transaction
  const createTransaction = (
    type: 'income' | 'expense',
    amount: number,
    category: string,
    description: string,
    date: string,
    competence: string,
    status: 'paid' | 'pending',
    paymentMethod: 'cash' | 'credit' = 'cash',
    creditCardId?: string
  ): Transaction => ({
    id: generateId(),
    type,
    paymentMethod,
    amount,
    category,
    description,
    transactionDate: date,
    competenceMonth: competence,
    status,
    creditCardId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // ============ INCOME TRANSACTIONS ============
  // Salários
  transactions.push(
    createTransaction('income', 850000, 'salary', 'Salário - Empresa XYZ', `${twoMonthsAgo}-05`, twoMonthsAgo, 'paid'),
    createTransaction('income', 850000, 'salary', 'Salário - Empresa XYZ', `${lastMonth}-05`, lastMonth, 'paid'),
    createTransaction('income', 850000, 'salary', 'Salário - Empresa XYZ', `${currentMonth}-05`, currentMonth, 'paid'),
  );

  // Freelance
  transactions.push(
    createTransaction('income', 250000, 'freelance', 'Projeto de Design - Cliente A', `${lastMonth}-15`, lastMonth, 'paid'),
    createTransaction('income', 180000, 'freelance', 'Consultoria - Cliente B', `${currentMonth}-10`, currentMonth, 'paid'),
    createTransaction('income', 320000, 'freelance', 'Desenvolvimento App - Cliente C', `${currentMonth}-25`, currentMonth, 'pending'),
  );

  // Investimentos
  transactions.push(
    createTransaction('income', 45000, 'investments', 'Dividendos ITUB4', `${lastMonth}-18`, lastMonth, 'paid'),
    createTransaction('income', 38000, 'investments', 'Rendimento Tesouro Selic', `${currentMonth}-01`, currentMonth, 'paid'),
  );

  // ============ EXPENSE TRANSACTIONS - CASH/DEBIT ============
  // Moradia
  transactions.push(
    createTransaction('expense', 180000, 'housing', 'Aluguel Apartamento', `${twoMonthsAgo}-10`, twoMonthsAgo, 'paid'),
    createTransaction('expense', 180000, 'housing', 'Aluguel Apartamento', `${lastMonth}-10`, lastMonth, 'paid'),
    createTransaction('expense', 180000, 'housing', 'Aluguel Apartamento', `${currentMonth}-10`, currentMonth, 'paid'),
    createTransaction('expense', 15500, 'housing', 'Conta de Luz', `${currentMonth}-15`, currentMonth, 'paid'),
    createTransaction('expense', 8900, 'housing', 'Conta de Água', `${currentMonth}-20`, currentMonth, 'pending'),
  );

  // Alimentação
  transactions.push(
    createTransaction('expense', 45000, 'food', 'Supermercado - Compra mensal', `${lastMonth}-08`, lastMonth, 'paid'),
    createTransaction('expense', 52000, 'food', 'Supermercado - Compra mensal', `${currentMonth}-07`, currentMonth, 'paid'),
    createTransaction('expense', 3500, 'food', 'iFood - Jantar', `${currentMonth}-12`, currentMonth, 'paid'),
    createTransaction('expense', 4200, 'food', 'Restaurante - Almoço trabalho', `${currentMonth}-14`, currentMonth, 'paid'),
  );

  // Transporte
  transactions.push(
    createTransaction('expense', 35000, 'transport', 'Combustível', `${lastMonth}-12`, lastMonth, 'paid'),
    createTransaction('expense', 38000, 'transport', 'Combustível', `${currentMonth}-11`, currentMonth, 'paid'),
    createTransaction('expense', 12000, 'transport', 'Uber - Corridas do mês', `${currentMonth}-20`, currentMonth, 'paid'),
  );

  // Saúde
  transactions.push(
    createTransaction('expense', 45000, 'health', 'Plano de Saúde', `${currentMonth}-05`, currentMonth, 'paid'),
    createTransaction('expense', 18500, 'health', 'Farmácia - Medicamentos', `${currentMonth}-08`, currentMonth, 'paid'),
  );

  // Contas Fixas
  transactions.push(
    createTransaction('expense', 12990, 'bills', 'Internet Fibra', `${currentMonth}-15`, currentMonth, 'paid'),
    createTransaction('expense', 5990, 'bills', 'Streaming - Netflix', `${currentMonth}-12`, currentMonth, 'paid'),
    createTransaction('expense', 2190, 'bills', 'Streaming - Spotify', `${currentMonth}-12`, currentMonth, 'paid'),
    createTransaction('expense', 8990, 'bills', 'Academia', `${currentMonth}-01`, currentMonth, 'paid'),
  );

  // ============ EXPENSE TRANSACTIONS - CREDIT CARD ============
  
  // iPhone 15 Pro - 12x no Nubank
  const iphoneId = generateId();
  transactions.push({
    id: iphoneId,
    type: 'expense',
    paymentMethod: 'credit',
    amount: 899900, // R$ 8.999,00
    category: 'shopping',
    description: 'iPhone 15 Pro Max - 12x',
    transactionDate: `${twoMonthsAgo}-20`,
    competenceMonth: twoMonthsAgo,
    status: 'pending',
    creditCardId: 'nubank',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Create 12 installments for iPhone
  const iphoneInstallmentValue = Math.floor(899900 / 12);
  const iphoneRemainder = 899900 - (iphoneInstallmentValue * 12);
  for (let i = 0; i < 12; i++) {
    const dueMonth = format(addMonths(new Date(`${twoMonthsAgo}-01`), i), 'yyyy-MM');
    installments.push({
      id: generateId(),
      transactionId: iphoneId,
      installmentNumber: i + 1,
      totalInstallments: 12,
      amount: i === 0 ? iphoneInstallmentValue + iphoneRemainder : iphoneInstallmentValue,
      dueMonth,
      status: i < 2 ? 'paid' : 'pending',
      creditCardId: 'nubank',
    });
  }

  // TV 65" - 10x no Itaú
  const tvId = generateId();
  transactions.push({
    id: tvId,
    type: 'expense',
    paymentMethod: 'credit',
    amount: 499900, // R$ 4.999,00
    category: 'shopping',
    description: 'Smart TV 65" Samsung - 10x',
    transactionDate: `${lastMonth}-10`,
    competenceMonth: lastMonth,
    status: 'pending',
    creditCardId: 'itau',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Create 10 installments for TV
  const tvInstallmentValue = Math.floor(499900 / 10);
  const tvRemainder = 499900 - (tvInstallmentValue * 10);
  for (let i = 0; i < 10; i++) {
    const dueMonth = format(addMonths(new Date(`${lastMonth}-01`), i), 'yyyy-MM');
    installments.push({
      id: generateId(),
      transactionId: tvId,
      installmentNumber: i + 1,
      totalInstallments: 10,
      amount: i === 0 ? tvInstallmentValue + tvRemainder : tvInstallmentValue,
      dueMonth,
      status: i < 1 ? 'paid' : 'pending',
      creditCardId: 'itau',
    });
  }

  // Curso de React - 6x no Inter
  const courseId = generateId();
  transactions.push({
    id: courseId,
    type: 'expense',
    paymentMethod: 'credit',
    amount: 149700, // R$ 1.497,00
    category: 'education',
    description: 'Curso Fullstack - Rocketseat - 6x',
    transactionDate: `${currentMonth}-05`,
    competenceMonth: currentMonth,
    status: 'pending',
    creditCardId: 'inter',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Create 6 installments for course
  const courseInstallmentValue = Math.floor(149700 / 6);
  const courseRemainder = 149700 - (courseInstallmentValue * 6);
  for (let i = 0; i < 6; i++) {
    const dueMonth = format(addMonths(new Date(`${currentMonth}-01`), i), 'yyyy-MM');
    installments.push({
      id: generateId(),
      transactionId: courseId,
      installmentNumber: i + 1,
      totalInstallments: 6,
      amount: i === 0 ? courseInstallmentValue + courseRemainder : courseInstallmentValue,
      dueMonth,
      status: 'pending',
      creditCardId: 'inter',
    });
  }

  // Compras avulsas no crédito
  const singleCreditPurchases = [
    { amount: 15990, category: 'food', desc: 'Restaurante Japonês', card: 'nubank', month: currentMonth },
    { amount: 8990, category: 'entertainment', desc: 'Cinema + pipoca', card: 'nubank', month: currentMonth },
    { amount: 24900, category: 'shopping', desc: 'Tênis Nike', card: 'itau', month: currentMonth },
    { amount: 19900, category: 'shopping', desc: 'Camisa Social', card: 'itau', month: currentMonth },
    { amount: 35000, category: 'food', desc: 'Churrascaria', card: 'inter', month: currentMonth },
    { amount: 12500, category: 'transport', desc: 'Uber Premium', card: 'nubank', month: currentMonth },
    { amount: 45000, category: 'health', desc: 'Consulta Dentista', card: 'itau', month: lastMonth },
    { amount: 28000, category: 'entertainment', desc: 'Show Rock in Rio', card: 'nubank', month: lastMonth },
  ];

  singleCreditPurchases.forEach(purchase => {
    const txId = generateId();
    transactions.push({
      id: txId,
      type: 'expense',
      paymentMethod: 'credit',
      amount: purchase.amount,
      category: purchase.category,
      description: purchase.desc,
      transactionDate: `${purchase.month}-15`,
      competenceMonth: purchase.month,
      status: 'pending',
      creditCardId: purchase.card,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    installments.push({
      id: generateId(),
      transactionId: txId,
      installmentNumber: 1,
      totalInstallments: 1,
      amount: purchase.amount,
      dueMonth: purchase.month,
      status: purchase.month === currentMonth ? 'pending' : 'paid',
      creditCardId: purchase.card,
    });
  });

  // ============ GROUP INSTALLMENTS INTO INVOICES ============
  const invoiceMap = new Map<string, CreditCardInvoice>();

  installments.forEach(inst => {
    const key = `${inst.creditCardId}-${inst.dueMonth}`;
    const card = MOCK_CREDIT_CARDS.find(c => c.id === inst.creditCardId);
    
    if (invoiceMap.has(key)) {
      const invoice = invoiceMap.get(key)!;
      invoice.installmentIds.push(inst.id);
      invoice.totalAmount += inst.amount;
    } else {
      const [year, month] = inst.dueMonth.split('-').map(Number);
      const dueDay = card?.dueDay || 10;
      
      invoiceMap.set(key, {
        id: generateId(),
        creditCardId: inst.creditCardId || 'nubank',
        month: inst.dueMonth,
        dueDate: format(new Date(year, month - 1, dueDay), 'yyyy-MM-dd'),
        totalAmount: inst.amount,
        status: inst.status,
        installmentIds: [inst.id],
      });
    }
  });

  invoices.push(...invoiceMap.values());

  // ============ BUDGETS ============
  const budgetCategories = [
    { categoryId: 'food', amount: 80000 },
    { categoryId: 'transport', amount: 50000 },
    { categoryId: 'housing', amount: 220000 },
    { categoryId: 'health', amount: 80000 },
    { categoryId: 'entertainment', amount: 30000 },
    { categoryId: 'shopping', amount: 50000 },
    { categoryId: 'education', amount: 30000 },
    { categoryId: 'bills', amount: 40000 },
  ];

  budgetCategories.forEach(b => {
    budgets.push({
      id: generateId(),
      categoryId: b.categoryId,
      month: currentMonth,
      budgetAmount: b.amount,
    });
  });

  return {
    transactions,
    installments,
    invoices,
    creditCards: MOCK_CREDIT_CARDS,
    budgets,
  };
}