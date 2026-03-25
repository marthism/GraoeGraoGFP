import { isTauri } from '@/desktop/env';
import type { Category, CreditCard, PaymentMethodOption, Transaction } from '@/types/finance';

export interface CsvExportResult {
  success: boolean;
  error?: string;
}

const formatCurrencyCsv = (cents: number) =>
  (cents / 100).toFixed(2).replace('.', ',');

const escapeCsvCell = (value: string) => {
  const needsQuotes = /[;"\n\r]/.test(value);
  if (!needsQuotes) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const RECURRENCE_LABELS: Record<string, string> = {
  none: 'Não',
  weekly: 'Semanal',
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  trimonthly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

export async function exportTransactionsCsv(params: {
  transactions: Transaction[];
  categories: Category[];
  paymentMethods: PaymentMethodOption[];
  creditCards: CreditCard[];
}): Promise<CsvExportResult> {
  try {
    const { transactions, categories, paymentMethods, creditCards } = params;
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const paymentMap = new Map(paymentMethods.map(m => [m.id, m.name]));
    const cardMap = new Map(creditCards.map(c => [c.id, c.name]));

    const header = [
      'Tipo',
      'Descricao',
      'Categoria',
      'Metodo de Pagamento',
      'Cartao',
      'Valor (R$)',
      'Data',
      'Vencimento',
      'Data de Pagamento',
      'Competencia',
      'Status',
      'Parcelas',
      'Recorrencia',
    ];

    const rows = transactions.map(tx => {
      const typeLabel = tx.type === 'income' ? 'Receita' : 'Despesa';
      const statusLabel = tx.status === 'paid' ? 'Pago' : 'Pendente';
      const categoryLabel = categoryMap.get(tx.category) || tx.category || '';
      const methodLabel = paymentMap.get(tx.paymentMethod) || tx.paymentMethod || '';
      const cardLabel = tx.creditCardId ? cardMap.get(tx.creditCardId) || tx.creditCardId : '';
      const installmentsLabel =
        tx.installmentsTotal && tx.installmentsTotal > 1
          ? `${tx.installmentIndex || 1}/${tx.installmentsTotal}`
          : '';
      const recurrenceLabel = tx.recurrence ? RECURRENCE_LABELS[tx.recurrence] || tx.recurrence : 'Não';

      const cells = [
        typeLabel,
        tx.description || '',
        categoryLabel,
        methodLabel,
        cardLabel,
        formatCurrencyCsv(tx.amount),
        tx.transactionDate || '',
        tx.dueDate || '',
        tx.paymentDate || '',
        tx.competenceMonth || '',
        statusLabel,
        installmentsLabel,
        recurrenceLabel,
      ];

      return cells.map(cell => escapeCsvCell(String(cell))).join(';');
    });

    const csvContent = '\uFEFF' + [header.join(';'), ...rows].join('\r\n');
    const filename = `gfp-transacoes-${new Date().toISOString().split('T')[0]}.csv`;

    if (isTauri()) {
      const { save } = await import('@tauri-apps/api/dialog');
      const { writeTextFile } = await import('@tauri-apps/api/fs');

      const filePath = await save({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        defaultPath: filename,
      });

      if (!filePath) {
        return { success: false, error: 'Operacao cancelada pelo usuario' };
      }

      await writeTextFile(filePath, csvContent);
      return { success: true };
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Export CSV error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao exportar CSV' };
  }
}
