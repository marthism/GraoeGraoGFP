import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreditCard, UserSettings, Category, PaymentMethodOption, Transaction } from '@/types/finance';
import { formatCurrency } from '@/lib/finance-utils';
import { AppLocale, DisplayMode, ResolutionOption, RESOLUTION_PRESETS } from '@/types/app-settings';
import { enableAutostart, disableAutostart } from '@/desktop/autostart';
import { isTauri } from '@/desktop/env';
import { getCurrencySymbol, t } from '@/i18n';
import { 
  CreditCard as CreditCardIcon, 
  User, 
  Palette, 
  Plus, 
  Pencil, 
  Trash2,
  Moon,
  Sun,
  Monitor,
  Wallet,
  AlertTriangle,
  Database,
  Download,
  Upload,
  RotateCcw,
  FileJson,
  Shield,
  Merge,
  Replace
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_COLORS } from '@/constants/categoryColors';
import { toast } from 'sonner';
import { exportBackup, importBackup, createAutoBackup } from '@/lib/backup';
import { importTransactionsCsv } from '@/lib/import-csv';
import { exportTransactionsCsv } from '@/lib/export-csv';

interface SettingsPageProps {
  transactions: Transaction[];
  creditCards: CreditCard[];
  userSettings: UserSettings;
  displayMode: DisplayMode;
  resolution: ResolutionOption;
  locale: AppLocale;
  autostart: boolean;
  onAddCard: (card: Omit<CreditCard, 'id'>) => void;
  onUpdateCard: (id: string, updates: Partial<CreditCard>) => void;
  onDeleteCard: (id: string) => void;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onUpdateDisplayMode: (mode: DisplayMode) => void;
  onUpdateResolution: (resolution: ResolutionOption) => void;
  onUpdateLocale: (locale: AppLocale) => void;
  onUpdateAutostart: (autostart: boolean) => void;
  categories: Category[];
  paymentMethods: PaymentMethodOption[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onAddPaymentMethod: (method: Omit<PaymentMethodOption, 'id'>) => void;
  onUpdatePaymentMethod: (id: string, updates: Partial<PaymentMethodOption>) => void;
  onDeletePaymentMethod: (id: string) => void;
  onLoadMockData: () => void;
  onClearData: () => void;
  onResetOnboarding: () => void;
}

const CARD_COLORS = [
  { key: 'colors.purple', value: 'hsl(280, 100%, 60%)' },
  { key: 'colors.orange', value: 'hsl(25, 90%, 50%)' },
  { key: 'colors.yellow', value: 'hsl(35, 100%, 50%)' },
  { key: 'colors.blue', value: 'hsl(210, 100%, 50%)' },
  { key: 'colors.green', value: 'hsl(150, 70%, 45%)' },
  { key: 'colors.red', value: 'hsl(0, 80%, 55%)' },
  { key: 'colors.pink', value: 'hsl(330, 80%, 55%)' },
  { key: 'colors.gray', value: 'hsl(220, 10%, 50%)' },
] as const;

export function SettingsPage({
  transactions,
  creditCards,
  userSettings,
  displayMode,
  resolution,
  locale,
  autostart,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onUpdateSettings,
  onUpdateDisplayMode,
  onUpdateResolution,
  onUpdateLocale,
  onUpdateAutostart,
  onLoadMockData,
  onClearData,
  onResetOnboarding,
  categories,
  paymentMethods,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddPaymentMethod,
  onUpdatePaymentMethod,
  onDeletePaymentMethod,
}: SettingsPageProps) {
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);

  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodOption | null>(null);
  const [methodName, setMethodName] = useState('');
  const [methodType, setMethodType] = useState<'cash' | 'credit'>('cash');

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [autostartBusy, setAutostartBusy] = useState(false);
  
  // Backup states
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const isDesktop = useMemo(() => isTauri(), []);
  const currencySymbol = getCurrencySymbol();

  const getLeastUsedCategoryColor = () => {
    const counts = new Map(CATEGORY_COLORS.map(color => [color, 0]));
    categories.forEach(cat => {
      counts.set(cat.color, (counts.get(cat.color) ?? 0) + 1);
    });
    let selected = CATEGORY_COLORS[0];
    let minCount = Number.POSITIVE_INFINITY;
    counts.forEach((count, color) => {
      if (count < minCount) {
        minCount = count;
        selected = color;
      }
    });
    return selected;
  };

  // Card form state
  const [cardName, setCardName] = useState('');
  const [cardDigits, setCardDigits] = useState('');
  const [cardColor, setCardColor] = useState<string>(CARD_COLORS[0].value);
  const [cardClosingDay, setCardClosingDay] = useState('3');
  const [cardDueDay, setCardDueDay] = useState('10');
  const [cardLimit, setCardLimit] = useState('');

  const resetCardForm = () => {
    setCardName('');
    setCardDigits('');
    setCardColor(CARD_COLORS[0].value);
    setCardClosingDay('3');
    setCardDueDay('10');
    setCardLimit('');
    setEditingCard(null);
  };

  const openEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setCardName(card.name);
    setCardDigits(card.lastDigits);
    setCardColor(card.color);
    setCardClosingDay(card.closingDay.toString());
    setCardDueDay(card.dueDay.toString());
    setCardLimit((card.limit / 100).toFixed(2).replace('.', ','));
    setIsCardDialogOpen(true);
  };

  const handleSaveCard = () => {
    const limitInCents = Math.round(
      parseFloat(cardLimit.replace(',', '.').replace(/[^\d.]/g, '')) * 100
    ) || 0;

    const cardData = {
      name: cardName,
      lastDigits: cardDigits,
      color: cardColor,
      closingDay: parseInt(cardClosingDay) || 3,
      dueDay: parseInt(cardDueDay) || 10,
      limit: limitInCents,
    };

    if (editingCard) {
      onUpdateCard(editingCard.id, cardData);
    } else {
      onAddCard(cardData);
    }

    setIsCardDialogOpen(false);
    resetCardForm();
  };

  const handleSaveCategory = () => {
    if (editingCategory) {
      onUpdateCategory(editingCategory.id, { name: catName, type: catType, color: catColor });
    } else {
      onAddCategory({ name: catName, type: catType, color: catColor });
    }
    setIsCategoryDialogOpen(false);
    setCatName('');
  };

  const handleSaveMethod = () => {
    if (editingMethod) {
      onUpdatePaymentMethod(editingMethod.id, { name: methodName, type: methodType });
    } else {
      onAddPaymentMethod({ name: methodName, type: methodType });
    }
    setIsMethodDialogOpen(false);
    setMethodName('');
  };

  const handleAutostartToggle = async (checked: boolean) => {
    if (!isDesktop) return;
    setAutostartBusy(true);
    const result = checked ? await enableAutostart() : await disableAutostart();
    if (!result.ok) {
      toast.error(t(checked ? 'toast.autostartEnableFailed' : 'toast.autostartDisableFailed'));
      setAutostartBusy(false);
      return;
    }
    onUpdateAutostart(checked);
    toast.success(t(checked ? 'toast.autostartEnabled' : 'toast.autostartDisabled'));
    setAutostartBusy(false);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    const result = await exportBackup();
    setIsExporting(false);
    
    if (result.success) {
      toast.success('Backup exportado com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao exportar backup');
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    const result = await exportTransactionsCsv({
      transactions,
      categories,
      paymentMethods,
      creditCards,
    });
    setIsExportingCsv(false);

    if (result.success) {
      toast.success('CSV exportado com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao exportar CSV');
    }
  };

  const handleImportCsv = async () => {
    setIsImportingCsv(true);
    await createAutoBackup();
    const result = await importTransactionsCsv();
    setIsImportingCsv(false);

    if (result.success) {
      toast.success(`${result.importedCount || 0} transações importadas com sucesso!`);
    } else {
      toast.error(result.error || 'Erro ao importar CSV');
    }
  };

  const handleImportBackup = async (mode: 'replace' | 'merge') => {
    setIsImporting(true);
    setShowImportDialog(false);
    
    // Create auto-backup before import
    await createAutoBackup();
    
    const result = await importBackup(mode);
    setIsImporting(false);
    
    if (result.success) {
      if (mode === 'replace') {
        // Reload will happen automatically
      } else {
        toast.success(`${result.importedCount || 0} itens importados com sucesso!`);
      }
    } else {
      toast.error(result.error || 'Erro ao importar backup');
    }
  };

  return (
    <div className="space-y-6">
      {/* User Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('settings.userProfile')}
          </CardTitle>
          <CardDescription>{t('settings.userProfileDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">{t('settings.userName')}</Label>
            <Input
              id="userName"
              value={userSettings.userName}
              onChange={(e) => onUpdateSettings({ userName: e.target.value })}
              placeholder={t('settings.userNamePlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('settings.appearance')}
          </CardTitle>
          <CardDescription>{t('settings.appearanceDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: t('settings.theme.light'), icon: Sun },
              { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
              { value: 'system', label: t('settings.theme.system'), icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => onUpdateSettings({ theme: value as UserSettings['theme'] })}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                  userSettings.theme === value
                    ? 'border-primary bg-accent'
                    : 'border-border hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* App Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {t('settings.appPreferences')}
          </CardTitle>
          <CardDescription>{t('settings.appPreferencesDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.language')}</Label>
            <Select value={locale} onValueChange={(value) => onUpdateLocale(value as AppLocale)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">{t('settings.language.pt')}</SelectItem>
                <SelectItem value="en-US">{t('settings.language.en')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isDesktop && (
            <>
              <div className="space-y-2">
                <Label>{t('settings.displayMode')}</Label>
                <Select
                  value={displayMode}
                  onValueChange={(value) => onUpdateDisplayMode(value as DisplayMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="window">{t('settings.displayMode.window')}</SelectItem>
                    <SelectItem value="fullscreen">{t('settings.displayMode.fullscreen')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('settings.resolution')}</Label>
                <Select
                  value={resolution}
                  onValueChange={(value) => onUpdateResolution(value as ResolutionOption)}
                  disabled={displayMode === 'fullscreen'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_PRESETS.map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {preset === 'auto' ? t('settings.resolution.auto') : preset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('settings.resolutionHint')}</p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{t('settings.autostart')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.autostartHint')}</p>
                </div>
                <Switch
                  checked={autostart}
                  onCheckedChange={handleAutostartToggle}
                  disabled={autostartBusy}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Categorias */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Categorias
            </CardTitle>
            <CardDescription>Gerencie as categorias de receitas e despesas.</CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={() => {
            setEditingCategory(null);
            setCatName('');
            setCatType('expense');
            setCatColor(getLeastUsedCategoryColor());
            setIsCategoryDialogOpen(true);
          }}>
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-[10px] uppercase opacity-50">{cat.type === 'income' ? 'Receita' : 'Despesa'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditingCategory(cat);
                    setCatName(cat.name);
                    setCatType(cat.type);
                    setCatColor(cat.color);
                    setIsCategoryDialogOpen(true);
                  }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeleteCategory(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formas de Pagamento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Formas de Pagamento
            </CardTitle>
            <CardDescription>Personalize como você paga ou recebe.</CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={() => {
            setEditingMethod(null);
            setMethodName('');
            setMethodType('cash');
            setIsMethodDialogOpen(true);
          }}>
            <Plus className="h-4 w-4" />
            Nova Forma
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paymentMethods.map(method => (
              <div key={method.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded bg-muted">
                    {method.type === 'credit' ? <CreditCardIcon className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{method.name}</p>
                    <p className="text-[10px] uppercase opacity-50">{method.type === 'credit' ? 'Crédito' : 'Dinheiro/Débito'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setEditingMethod(method);
                    setMethodName(method.name);
                    setMethodType(method.type);
                    setIsMethodDialogOpen(true);
                  }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeletePaymentMethod(method.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Credit Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              {t('settings.creditCards')}
            </CardTitle>
            <CardDescription>{t('settings.creditCardsDescription')}</CardDescription>
          </div>
          <Dialog open={isCardDialogOpen} onOpenChange={(open) => {
            setIsCardDialogOpen(open);
            if (!open) resetCardForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('settings.addCard')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCard ? t('settings.editCard') : t('settings.newCard')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.cardName')}</Label>
                  <Input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder={t('settings.cardNamePlaceholder')}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.cardDigits')}</Label>
                    <Input
                      value={cardDigits}
                      onChange={(e) => setCardDigits(e.target.value.slice(0, 4))}
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.cardColor')}</Label>
                    <Select value={cardColor} onValueChange={setCardColor}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: cardColor }} 
                          />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_COLORS.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: color.value }} 
                              />
                              {t(color.key)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('settings.cardClosingDay')}</Label>
                    <Select value={cardClosingDay} onValueChange={setCardClosingDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            {t('settings.day', { day })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.cardDueDay')}</Label>
                    <Select value={cardDueDay} onValueChange={setCardDueDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            {t('settings.day', { day })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('settings.cardLimit')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {currencySymbol || 'R$'}
                    </span>
                    <Input
                      value={cardLimit}
                      onChange={(e) => setCardLimit(e.target.value)}
                      placeholder={t('settings.cardLimitPlaceholder')}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveCard} 
                  className="w-full"
                  disabled={!cardName || !cardDigits}
                >
                  {editingCard ? t('settings.saveChanges') : t('settings.addCardAction')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {creditCards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('settings.noCards')}
            </p>
          ) : (
            <div className="space-y-3">
              {creditCards.map(card => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  style={{ borderLeftColor: card.color, borderLeftWidth: 4 }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: card.color }}
                    >
                      <CreditCardIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{card.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.cardDetails', {
                          digits: card.lastDigits,
                          closingDay: card.closingDay,
                          dueDay: card.dueDay,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.cardLimitLabel', { amount: formatCurrency(card.limit) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditCard(card)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteCard(card.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Backup e Restauracao */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Backup e Restauracao
          </CardTitle>
          <CardDescription>
            Exporte seus dados para um arquivo ou restaure de um backup anterior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O backup inclui todas as suas transacoes, categorias, cartoes, formas de pagamento e configuracoes.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  className="gap-2"
                  disabled={isExporting || isExportingCsv}
                >
                  <Download className="h-4 w-4" />
                  {isExporting || isExportingCsv ? 'Exportando...' : 'Exportar'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleExportBackup} disabled={isExporting}>
                  Exportar JSON (Backup)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv} disabled={isExportingCsv}>
                  Exportar CSV (Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  disabled={isImporting || isImportingCsv}
                >
                  <Upload className="h-4 w-4" />
                  {isImporting || isImportingCsv ? 'Importando...' : 'Importar'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setShowImportDialog(true)} disabled={isImporting}>
                  Importar JSON (Backup)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportCsv} disabled={isImportingCsv}>
                  Importar CSV (Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    Importar Backup
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>Escolha como deseja importar os dados do arquivo de backup:</p>
                    <div className="p-3 bg-muted rounded-lg space-y-3">
                      <div className="flex items-start gap-2">
                        <Replace className="h-4 w-4 mt-0.5 text-primary" />
                        <div>
                          <span className="font-medium">Substituir Tudo</span>
                          <p className="text-xs text-muted-foreground">
                            Apaga todos os dados atuais e restaura o backup. Recomendado para restauracao completa.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Merge className="h-4 w-4 mt-0.5 text-primary" />
                        <div>
                          <span className="font-medium">Mesclar</span>
                          <p className="text-xs text-muted-foreground">
                            Mantem os dados atuais e adiciona os do backup. Em caso de conflito, prevalece o mais recente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleImportBackup('replace')}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Substituir Tudo
                  </AlertDialogAction>
                  <Button 
                    variant="default"
                    onClick={() => handleImportBackup('merge')}
                  >
                    Mesclar
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('settings.dataManagement')}
          </CardTitle>
          <CardDescription>{t('settings.dataManagementDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={onLoadMockData}
          >
            <Database className="h-4 w-4" />
            {t('settings.loadDemo')}
          </Button>

          {!confirmClear ? (
            <Button 
              variant="destructive" 
              className="w-full gap-2"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-4 w-4" />
              {t('settings.clearAll')}
            </Button>
          ) : (
            <div className="p-4 border border-destructive rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{t('settings.confirmTitle')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('settings.confirmClearDescription')}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setConfirmClear(false)}
                >
                  {t('settings.cancel')}
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => {
                    onClearData();
                    setConfirmClear(false);
                  }}
                >
                  {t('settings.confirm')}
                </Button>
              </div>
            </div>
          )}

          <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settings.resetTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('settings.resetDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('settings.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    onResetOnboarding();
                    setConfirmReset(false);
                  }}
                >
                  {t('settings.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            className="w-full gap-2 border-destructive/60 text-destructive hover:text-destructive"
            onClick={() => setConfirmReset(true)}
          >
            <AlertTriangle className="h-4 w-4" />
            {t('settings.resetAction')}
          </Button>
        </CardContent>
      </Card>

      {/* Dialog Categoria */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Categoria</Label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Assinaturas" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={catType} onValueChange={v => setCatType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label="Selecionar cor"
                    className={cn(
                      "w-7 h-7 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-shadow",
                      catColor === color ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-slate-400/60 hover:ring-offset-2 hover:ring-offset-background"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setCatColor(color)}
                  />
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveCategory} disabled={!catName}>Salvar Categoria</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Forma de Pagamento */}
      <Dialog open={isMethodDialogOpen} onOpenChange={setIsMethodDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Forma</Label>
              <Input value={methodName} onChange={e => setMethodName(e.target.value)} placeholder="Ex: Pix" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Lógica</Label>
              <Select value={methodType} onValueChange={v => setMethodType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro / Débito / Pix</SelectItem>
                  <SelectItem value="credit">Cartão de Crédito (Gera Faturas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveMethod} disabled={!methodName}>Salvar Forma</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
