import { TransactionType } from '@/types/finance';

export function getTransactionDateValidation(params: {
  type: TransactionType;
  date?: string;
  dueDate?: string;
}) {
  const { type, date, dueDate } = params;
  return {
    missingIncomeDate: type === 'income' && !date,
    missingExpenseDueDate: type === 'expense' && !dueDate,
  };
}
