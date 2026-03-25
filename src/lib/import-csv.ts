import { useFinanceStore } from '@/hooks/useFinanceStore';
import { generateId } from '@/lib/finance-utils';
import { CATEGORY_COLORS } from '@/constants/categoryColors';
import { isTauri } from '@/desktop/env';
import type { Category, PaymentMethodOption, Transaction, TransactionStatus } from '@/types/finance';

export interface CsvImportResult {
  success: boolean;
  error?: string;
  importedCount?: number;
}

const normalizeText = (value: string) => value.trim().toLowerCase();

const RECURRENCE_LABELS: Record<string, string> = {
  'não': 'none',
  'nao': 'none',
  'sem recorrencia': 'none',
  'semanal': 'weekly',
  'mensal': 'monthly',
  'bimestral': 'bimonthly',
  'trimestral': 'trimonthly',
  'semestral': 'semiannual',
  'anual': 'annual',
};

const parseCurrencyToCents = (raw: string) => {
  const normalized = raw.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const value = Number(normalized || 0);
  return Math.round(value * 100);
};

const parseCsvRows = (content: string) => {
  const text = content.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = lines[0].includes(';') ? ';' : ',';

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === delimiter && !inQuotes) {
        cells.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    cells.push(current);
    return cells.map(cell => cell.trim());
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
};

const findHeaderIndex = (headers: string[], name: string) => {
  const target = normalizeText(name);
  return headers.findIndex(h => normalizeText(h) === target);
};

export async function importTransactionsCsv(): Promise<CsvImportResult> {
  try {
    let content = '';

    if (isTauri()) {
      const { open } = await import('@tauri-apps/api/dialog');
      const { readTextFile } = await import('@tauri-apps/api/fs');

      const filePath = await open({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        multiple: false,
      });

      if (!filePath) {
        return { success: false, error: 'Operacao cancelada pelo usuario' };
      }

      content = await readTextFile(filePath);
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.click();

      const file = await new Promise<File | null>((resolve) => {
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          resolve(target.files?.[0] || null);
        };
        input.oncancel = () => resolve(null);
      });

      if (!file) {
        return { success: false, error: 'Operacao cancelada pelo usuario' };
      }

      content = await file.text();
    }

    const { headers, rows } = parseCsvRows(content);
    if (headers.length === 0) {
      return { success: false, error: 'Arquivo CSV vazio ou invalido' };
    }

    const requiredHeaders = [
      'Tipo',
      'Descricao',
      'Categoria',
      'Metodo de Pagamento',
      'Valor (R$)',
      'Data',
      'Competencia',
      'Status',
    ];

    const headerIndex = Object.fromEntries(
      requiredHeaders.map(name => [name, findHeaderIndex(headers, name)])
    );

    const missing = requiredHeaders.filter(name => headerIndex[name] === -1);
    if (missing.length > 0) {
      return { success: false, error: `CSV invalido. Faltam colunas: ${missing.join(', ')}` };
    }

    const store = useFinanceStore.getState();
    const categories = [...store.categories];
    const paymentMethods = [...store.paymentMethods];

    const getOrCreateCategory = (name: string, type: 'income' | 'expense') => {
      const existing = categories.find(cat => normalizeText(cat.name) === normalizeText(name));
      if (existing) return existing;
      const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length] || 'hsl(0, 0%, 50%)';
      const newCategory: Category = {
        id: generateId(),
        name: name || (type === 'income' ? 'Receita' : 'Despesa'),
        type,
        color,
      };
      categories.push(newCategory);
      return newCategory;
    };

    const getOrCreatePaymentMethod = (name: string, type: 'cash' | 'credit') => {
      const existing = paymentMethods.find(method => normalizeText(method.name) === normalizeText(name));
      if (existing) return existing;
      const newMethod: PaymentMethodOption = {
        id: generateId(),
        name: name || (type === 'credit' ? 'Crédito' : 'Dinheiro/Pix'),
        type,
      };
      paymentMethods.push(newMethod);
      return newMethod;
    };

    const now = new Date().toISOString();
    const transactionsToAdd: Transaction[] = [];

    rows.forEach(row => {
      const tipo = row[headerIndex['Tipo']] || '';
      const descricao = row[headerIndex['Descricao']] || '';
      const categoriaNome = row[headerIndex['Categoria']] || '';
      const metodoNome = row[headerIndex['Metodo de Pagamento']] || '';
      const valorRaw = row[headerIndex['Valor (R$)']] || '0';
      const dataRaw = row[headerIndex['Data']] || '';
      const competencia = row[headerIndex['Competencia']] || '';
      const statusRaw = row[headerIndex['Status']] || '';

      const type = normalizeText(tipo).includes('rece') ? 'income' : 'expense';
      const status: TransactionStatus = normalizeText(statusRaw).includes('pag') ? 'paid' : 'pending';
      const paymentType: 'cash' | 'credit' =
        normalizeText(metodoNome).includes('cr') || normalizeText(metodoNome).includes('cred') ? 'credit' : 'cash';

      const category = getOrCreateCategory(categoriaNome, type);
      const paymentMethod = getOrCreatePaymentMethod(metodoNome, paymentType);

      const amount = parseCurrencyToCents(valorRaw);
      const transactionDate = dataRaw || new Date().toISOString().split('T')[0];
      const competenceMonth =
        competencia || transactionDate.slice(0, 7);

      const dueDateIndexCandidates = [
        findHeaderIndex(headers, 'Vencimento'),
        findHeaderIndex(headers, 'Data de Vencimento'),
      ];
      const dueDateIndex = dueDateIndexCandidates.find(index => index >= 0) ?? -1;
      const dueDateRaw = dueDateIndex >= 0 ? row[dueDateIndex] || '' : '';
      const dueDate = type === 'expense' ? (dueDateRaw || undefined) : undefined;

      const paymentDateIndex = findHeaderIndex(headers, 'Data de Pagamento');
      const paymentDate = paymentDateIndex >= 0 ? row[paymentDateIndex] || undefined : undefined;

      const recurrenceIndex = findHeaderIndex(headers, 'Recorrencia');
      const recurrenceRaw = recurrenceIndex >= 0 ? normalizeText(row[recurrenceIndex] || '') : '';
      const recurrence = RECURRENCE_LABELS[recurrenceRaw] || 'none';

      const installmentsIndex = findHeaderIndex(headers, 'Parcelas');
      const installmentsRaw = installmentsIndex >= 0 ? row[installmentsIndex] || '' : '';
      let installmentIndex: number | undefined;
      let installmentsTotal: number | undefined;
      if (installmentsRaw.includes('/')) {
        const [idx, total] = installmentsRaw.split('/').map(part => Number(part.trim()));
        if (Number.isFinite(idx) && Number.isFinite(total)) {
          installmentIndex = idx;
          installmentsTotal = total;
        }
      }

      transactionsToAdd.push({
        id: generateId(),
        type,
        paymentMethod: paymentMethod.id,
        amount,
        category: category.id,
        description: descricao || 'Importado CSV',
        transactionDate,
        dueDate,
        paymentDate,
        competenceMonth,
        status,
        recurrence,
        installmentIndex,
        installmentsTotal,
        createdAt: now,
        updatedAt: now,
      });
    });

    useFinanceStore.setState(state => ({
      ...state,
      transactions: [...state.transactions, ...transactionsToAdd],
      categories,
      paymentMethods,
    }));

    return { success: true, importedCount: transactionsToAdd.length };
  } catch (error) {
    console.error('Import CSV error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao importar CSV' };
  }
}
