import { STORAGE_KEY, useFinanceStore } from '@/hooks/useFinanceStore';
import type { FinanceData } from '@/types/finance';
import type { DisplayMode, ResolutionOption, AppLocale } from '@/types/app-settings';
import { isTauri } from '@/desktop/env';

// Backup file version - increment when schema changes
export const BACKUP_VERSION = '1';
export const BACKUP_SCHEMA_VERSION = 1;

// Maximum backup file size (10MB)
const MAX_BACKUP_SIZE = 10 * 1024 * 1024;

export interface BackupData {
  version: string;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  payload: {
    // Zustand persist storage
    storage: Record<string, unknown>;
    // App state data
    data: FinanceData;
    // App settings
    userName: string | null;
    hasCompletedOnboarding: boolean;
    useDemoData: boolean;
    displayMode: DisplayMode;
    resolution: ResolutionOption;
    locale: AppLocale;
    autostart: boolean;
    hasMigratedInstallmentIds: boolean;
  };
}

export interface BackupResult {
  success: boolean;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  importedCount?: number;
}

/**
 * Get current app version from package.json
 */
function getAppVersion(): string {
  try {
    // @ts-ignore - VITE_APP_VERSION is set by Vite
    return import.meta.env.VITE_APP_VERSION || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Export current app data to a backup file
 */
export async function exportBackup(): Promise<BackupResult> {
  try {
    // Get current state from store
    const state = useFinanceStore.getState();

    const backupData: BackupData = {
      version: BACKUP_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: getAppVersion(),
      exportedAt: new Date().toISOString(),
      payload: {
        storage: {}, // We'll read from localStorage directly
        data: {
          transactions: state.transactions,
          installments: state.installments,
          invoices: state.invoices,
          categories: state.categories,
          paymentMethods: state.paymentMethods,
          budgets: state.budgets,
          creditCards: state.creditCards,
          userSettings: state.userSettings,
        },
        userName: state.userName,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        useDemoData: state.useDemoData,
        displayMode: state.displayMode,
        resolution: state.resolution,
        locale: state.locale,
        autostart: state.autostart,
        hasMigratedInstallmentIds: state.hasMigratedInstallmentIds,
      },
    };

    // Also include raw localStorage data for full restore
    const storageData: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          storageData[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          storageData[key] = localStorage.getItem(key);
        }
      }
    }
    backupData.payload.storage = storageData;

    const jsonString = JSON.stringify(backupData, null, 2);

    if (isTauri()) {
      // Use Tauri dialog and fs
      const { save } = await import('@tauri-apps/api/dialog');
      const { writeTextFile } = await import('@tauri-apps/api/fs');

      const filePath = await save({
        filters: [{ name: 'GFP Backup', extensions: ['json'] }],
        defaultPath: `gfp-backup-${new Date().toISOString().split('T')[0]}.json`,
      });

      if (!filePath) {
        return { success: false, error: 'Operacao cancelada pelo usuario' };
      }

      await writeTextFile(filePath, jsonString);
      return { success: true };
    } else {
      // Web fallback - download as blob
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `gfp-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    }
  } catch (error) {
    console.error('Export backup error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao exportar backup' };
  }
}

/**
 * Validate backup file structure
 */
function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const backup = data as Record<string, unknown>;

  // Check required fields
  if (typeof backup.version !== 'string') return false;
  if (typeof backup.schemaVersion !== 'number') return false;
  if (typeof backup.exportedAt !== 'string') return false;
  if (!backup.payload || typeof backup.payload !== 'object') return false;

  return true;
}

/**
 * Migrate backup data if schema version is old
 */
function migrateBackupData(data: BackupData): BackupData {
  // Currently we only have version 1, so no migration needed
  // This function is prepared for future schema changes
  return data;
}

/**
 * Merge two arrays of entities by ID, preferring the more recent one
 */
function mergeEntities<T extends { id: string; updatedAt?: string }>(
  current: T[],
  incoming: T[],
  onMerge?: (current: T, incoming: T) => T
): T[] {
  const currentMap = new Map(current.map(item => [item.id, item]));
  const result = [...current];

  for (const incomingItem of incoming) {
    const existingItem = currentMap.get(incomingItem.id);

    if (!existingItem) {
      // Item doesn't exist, add it
      result.push(incomingItem);
    } else {
      // Item exists, decide which to keep based on updatedAt
      const currentUpdated = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const incomingUpdated = incomingItem.updatedAt ? new Date(incomingItem.updatedAt).getTime() : 0;

      if (incomingUpdated > currentUpdated) {
        // Incoming is more recent, replace
        const index = result.findIndex(item => item.id === incomingItem.id);
        if (index !== -1) {
          result[index] = onMerge ? onMerge(existingItem, incomingItem) : incomingItem;
        }
      }
      // else: current is more recent or equal, keep it
    }
  }

  return result;
}

/**
 * Import backup data with merge or replace strategy
 */
export async function importBackup(mode: 'replace' | 'merge'): Promise<ImportResult> {
  try {
    let backupData: BackupData;

    if (isTauri()) {
      // Use Tauri dialog and fs
      const { open } = await import('@tauri-apps/api/dialog');
      const { readTextFile } = await import('@tauri-apps/api/fs');

      const filePath = await open({
        filters: [{ name: 'GFP Backup', extensions: ['json'] }],
        multiple: false,
      });

      if (!filePath) {
        return { success: false, error: 'Operacao cancelada pelo usuario' };
      }

      const fileContent = await readTextFile(filePath);

      // Check file size
      if (fileContent.length > MAX_BACKUP_SIZE) {
        return { success: false, error: 'Arquivo de backup muito grande (maximo 10MB)' };
      }

      try {
        backupData = JSON.parse(fileContent);
      } catch {
        return { success: false, error: 'Arquivo de backup invalido - JSON mal formatado' };
      }
    } else {
      // Web fallback - file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.gfpbackup.json';
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

      // Check file size
      if (file.size > MAX_BACKUP_SIZE) {
        return { success: false, error: 'Arquivo de backup muito grande (maximo 10MB)' };
      }

      const fileContent = await file.text();

      try {
        backupData = JSON.parse(fileContent);
      } catch {
        return { success: false, error: 'Arquivo de backup invalido - JSON mal formatado' };
      }
    }

    // Validate backup structure
    if (!validateBackup(backupData)) {
      return { success: false, error: 'Arquivo de backup invalido - estrutura incorreta' };
    }

    // Check schema version compatibility
    if (backupData.schemaVersion > BACKUP_SCHEMA_VERSION) {
      return { 
        success: false, 
        error: `Backup de versao mais recente (schema ${backupData.schemaVersion}) nao pode ser restaurado nesta versao do app (schema ${BACKUP_SCHEMA_VERSION}). Atualize o app.` 
      };
    }

    // Migrate if needed
    const migratedData = migrateBackupData(backupData);
    const { payload } = migratedData;

    // Apply backup based on mode
    if (mode === 'replace') {
      // Replace all data with backup
      
      // Restore localStorage first (for persist middleware)
      if (payload.storage && Object.keys(payload.storage).length > 0) {
        // Clear current storage
        localStorage.clear();
        
        // Restore storage items
        for (const [key, value] of Object.entries(payload.storage)) {
          if (value !== undefined) {
            if (typeof value === 'string') {
              localStorage.setItem(key, value);
            } else {
              localStorage.setItem(key, JSON.stringify(value));
            }
          }
        }
      }

      // Apply state immediately to avoid relying on window reload
      useFinanceStore.setState({
        transactions: payload.data.transactions,
        installments: payload.data.installments,
        invoices: payload.data.invoices,
        categories: payload.data.categories,
        paymentMethods: payload.data.paymentMethods,
        budgets: payload.data.budgets,
        creditCards: payload.data.creditCards,
        userSettings: payload.data.userSettings,
        userName: payload.userName,
        hasCompletedOnboarding: payload.hasCompletedOnboarding,
        useDemoData: payload.useDemoData,
        displayMode: payload.displayMode,
        resolution: payload.resolution,
        locale: payload.locale,
        autostart: payload.autostart,
        hasMigratedInstallmentIds: payload.hasMigratedInstallmentIds,
      });

      // Reload to rehydrate persisted state (safe on Tauri too)
      if (typeof window !== 'undefined') {
        window.location.reload();
      }

      return { success: true, importedCount: payload.data.transactions.length };
    } else {
      // Merge mode - merge entities intelligently
      
      const state = useFinanceStore.getState();
      let totalImported = 0;

      // Merge transactions
      const mergedTransactions = mergeEntities(state.transactions, payload.data.transactions);
      totalImported += mergedTransactions.length - state.transactions.length;

      // Merge installments
      const mergedInstallments = mergeEntities(state.installments, payload.data.installments);
      totalImported += mergedInstallments.length - state.installments.length;

      // Merge invoices
      const mergedInvoices = mergeEntities(state.invoices, payload.data.invoices);
      totalImported += mergedInvoices.length - state.invoices.length;

      // Merge categories (keep user categories, add new ones from backup)
      const mergedCategories = mergeEntities(state.categories, payload.data.categories);
      totalImported += mergedCategories.length - state.categories.length;

      // Merge payment methods
      const mergedPaymentMethods = mergeEntities(state.paymentMethods, payload.data.paymentMethods);
      totalImported += mergedPaymentMethods.length - state.paymentMethods.length;

      // Merge budgets
      const mergedBudgets = mergeEntities(state.budgets, payload.data.budgets);
      totalImported += mergedBudgets.length - state.budgets.length;

      // Merge credit cards
      const mergedCreditCards = mergeEntities(state.creditCards, payload.data.creditCards);
      totalImported += mergedCreditCards.length - state.creditCards.length;

      // Update store with merged data
      useFinanceStore.setState({
        transactions: mergedTransactions,
        installments: mergedInstallments,
        invoices: mergedInvoices,
        categories: mergedCategories,
        paymentMethods: mergedPaymentMethods,
        budgets: mergedBudgets,
        creditCards: mergedCreditCards,
        userSettings: payload.data.userSettings,
        userName: payload.userName,
        hasCompletedOnboarding: payload.hasCompletedOnboarding,
        useDemoData: payload.useDemoData,
        displayMode: payload.displayMode,
        resolution: payload.resolution,
        locale: payload.locale,
        autostart: payload.autostart,
        hasMigratedInstallmentIds: payload.hasMigratedInstallmentIds,
      });

      return { success: true, importedCount: totalImported };
    }
  } catch (error) {
    console.error('Import backup error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao importar backup' };
  }
}

/**
 * Create a backup of current state before import (for rollback)
 */
export async function createAutoBackup(): Promise<string | null> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData: BackupData = {
      version: BACKUP_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: getAppVersion(),
      exportedAt: new Date().toISOString(),
      payload: {
        storage: {},
        data: {
          transactions: useFinanceStore.getState().transactions,
          installments: useFinanceStore.getState().installments,
          invoices: useFinanceStore.getState().invoices,
          categories: useFinanceStore.getState().categories,
          paymentMethods: useFinanceStore.getState().paymentMethods,
          budgets: useFinanceStore.getState().budgets,
          creditCards: useFinanceStore.getState().creditCards,
          userSettings: useFinanceStore.getState().userSettings,
        },
        userName: useFinanceStore.getState().userName,
        hasCompletedOnboarding: useFinanceStore.getState().hasCompletedOnboarding,
        useDemoData: useFinanceStore.getState().useDemoData,
        displayMode: useFinanceStore.getState().displayMode,
        resolution: useFinanceStore.getState().resolution,
        locale: useFinanceStore.getState().locale,
        autostart: useFinanceStore.getState().autostart,
        hasMigratedInstallmentIds: useFinanceStore.getState().hasMigratedInstallmentIds,
      },
    };

    // Store in localStorage as auto-backup (limited to last one)
    localStorage.setItem('gfp-auto-backup', JSON.stringify(backupData));
    
    return timestamp;
  } catch {
    console.error('Failed to create auto backup');
    return null;
  }
}

/**
 * Restore from auto backup
 */
export function restoreAutoBackup(): boolean {
  try {
    const autoBackup = localStorage.getItem('gfp-auto-backup');
    if (!autoBackup) return false;

    const backupData: BackupData = JSON.parse(autoBackup);
    if (!validateBackup(backupData)) return false;

    const { payload } = backupData;

    useFinanceStore.setState({
      transactions: payload.data.transactions,
      installments: payload.data.installments,
      invoices: payload.data.invoices,
      categories: payload.data.categories,
      paymentMethods: payload.data.paymentMethods,
      budgets: payload.data.budgets,
      creditCards: payload.data.creditCards,
      userSettings: payload.data.userSettings,
      userName: payload.userName,
      hasCompletedOnboarding: payload.hasCompletedOnboarding,
      useDemoData: payload.useDemoData,
      displayMode: payload.displayMode,
      resolution: payload.resolution,
      locale: payload.locale,
      autostart: payload.autostart,
      hasMigratedInstallmentIds: payload.hasMigratedInstallmentIds,
    });

    // Clear auto backup after restore
    localStorage.removeItem('gfp-auto-backup');
    
    return true;
  } catch {
    console.error('Failed to restore auto backup');
    return false;
  }
}
