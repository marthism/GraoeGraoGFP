import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, UserSettings } from '@/types/finance';
import { formatCurrency } from '@/lib/finance-utils';
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
  AlertTriangle,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPageProps {
  creditCards: CreditCard[];
  userSettings: UserSettings;
  onAddCard: (card: Omit<CreditCard, 'id'>) => void;
  onUpdateCard: (id: string, updates: Partial<CreditCard>) => void;
  onDeleteCard: (id: string) => void;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  onLoadMockData: () => void;
  onClearData: () => void;
}

const CARD_COLORS = [
  { name: 'Roxo', value: 'hsl(280, 100%, 60%)' },
  { name: 'Laranja', value: 'hsl(25, 90%, 50%)' },
  { name: 'Amarelo', value: 'hsl(35, 100%, 50%)' },
  { name: 'Azul', value: 'hsl(210, 100%, 50%)' },
  { name: 'Verde', value: 'hsl(150, 70%, 45%)' },
  { name: 'Vermelho', value: 'hsl(0, 80%, 55%)' },
  { name: 'Rosa', value: 'hsl(330, 80%, 55%)' },
  { name: 'Cinza', value: 'hsl(220, 10%, 50%)' },
];

export function SettingsPage({
  creditCards,
  userSettings,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onUpdateSettings,
  onLoadMockData,
  onClearData,
}: SettingsPageProps) {
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Card form state
  const [cardName, setCardName] = useState('');
  const [cardDigits, setCardDigits] = useState('');
  const [cardColor, setCardColor] = useState(CARD_COLORS[0].value);
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

  return (
    <div className="space-y-6">
      {/* User Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Usuário
          </CardTitle>
          <CardDescription>Configure seu nome e preferências</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">Nome</Label>
            <Input
              id="userName"
              value={userSettings.userName}
              onChange={(e) => onUpdateSettings({ userName: e.target.value })}
              placeholder="Seu nome"
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>Escolha o tema da aplicação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Claro', icon: Sun },
              { value: 'dark', label: 'Escuro', icon: Moon },
              { value: 'system', label: 'Sistema', icon: Monitor },
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

      {/* Credit Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Cartões de Crédito
            </CardTitle>
            <CardDescription>Gerencie seus cartões</CardDescription>
          </div>
          <Dialog open={isCardDialogOpen} onOpenChange={(open) => {
            setIsCardDialogOpen(open);
            if (!open) resetCardForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cartão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Cartão</Label>
                  <Input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Últimos 4 dígitos</Label>
                    <Input
                      value={cardDigits}
                      onChange={(e) => setCardDigits(e.target.value.slice(0, 4))}
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
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
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia de Fechamento</Label>
                    <Select value={cardClosingDay} onValueChange={setCardClosingDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dia de Vencimento</Label>
                    <Select value={cardDueDay} onValueChange={setCardDueDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Limite</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      value={cardLimit}
                      onChange={(e) => setCardLimit(e.target.value)}
                      placeholder="5.000,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveCard} 
                  className="w-full"
                  disabled={!cardName || !cardDigits}
                >
                  {editingCard ? 'Salvar Alterações' : 'Adicionar Cartão'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {creditCards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum cartão cadastrado
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
                        •••• {card.lastDigits} • Fecha dia {card.closingDay}, vence dia {card.dueDay}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Limite: {formatCurrency(card.limit)}
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

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gerenciamento de Dados
          </CardTitle>
          <CardDescription>Carregar dados de teste ou limpar tudo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={onLoadMockData}
          >
            <Database className="h-4 w-4" />
            Carregar Dados de Demonstração
          </Button>

          {!confirmClear ? (
            <Button 
              variant="destructive" 
              className="w-full gap-2"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-4 w-4" />
              Limpar Todos os Dados
            </Button>
          ) : (
            <div className="p-4 border border-destructive rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Tem certeza?</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta ação irá apagar todas as transações, faturas, cartões e orçamentos.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => {
                    onClearData();
                    setConfirmClear(false);
                  }}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}