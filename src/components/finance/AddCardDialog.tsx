import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard as CreditCardIcon, Plus } from 'lucide-react';
import type { CreditCard } from '@/types/finance';
import { getCurrencySymbol, t } from '@/i18n';

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

interface AddCardDialogProps {
  onAddCard: (card: Omit<CreditCard, 'id'>) => void;
}

export function AddCardDialog({ onAddCard }: AddCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardDigits, setCardDigits] = useState('');
  const [cardColor, setCardColor] = useState<string>(CARD_COLORS[0].value);
  const [cardClosingDay, setCardClosingDay] = useState('3');
  const [cardDueDay, setCardDueDay] = useState('10');
  const [cardLimit, setCardLimit] = useState('');

  const currencySymbol = getCurrencySymbol();
  const canSave = cardName.trim().length > 0 && cardDigits.trim().length === 4;

  const resetForm = () => {
    setCardName('');
    setCardDigits('');
    setCardColor(CARD_COLORS[0].value);
    setCardClosingDay('3');
    setCardDueDay('10');
    setCardLimit('');
  };

  const handleSave = () => {
    const limitInCents = Math.round(
      parseFloat(cardLimit.replace(',', '.').replace(/[^\d.]/g, '')) * 100
    ) || 0;

    onAddCard({
      name: cardName.trim(),
      lastDigits: cardDigits.trim(),
      color: cardColor,
      closingDay: parseInt(cardClosingDay) || 3,
      dueDay: parseInt(cardDueDay) || 10,
      limit: limitInCents,
    });

    setOpen(false);
    resetForm();
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          {t('settings.addCard')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.newCard')}</DialogTitle>
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
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cardColor }} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {CARD_COLORS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.value }} />
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

          <Button onClick={handleSave} className="w-full" disabled={!canSave}>
            {t('settings.addCardAction')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
