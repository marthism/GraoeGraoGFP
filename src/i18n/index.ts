import enUS from './locales/en-US';
import ptBR from './locales/pt-BR';

const dictionaries = {
  'pt-BR': ptBR,
  'en-US': enUS,
} as const;

export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof typeof ptBR;

type Dictionary = typeof ptBR;
type TemplateVars = Record<string, string | number>;

const currencyByLocale: Record<Locale, string> = {
  'pt-BR': 'BRL',
  'en-US': 'USD',
};

let currentLocale: Locale = 'pt-BR';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey, vars?: TemplateVars): string {
  const dictionary = dictionaries[currentLocale] as Dictionary;
  const fallback = dictionaries['pt-BR'] as Dictionary;
  const template = dictionary[key] ?? fallback[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, varName: string) => {
    const value = vars[varName];
    return value === undefined || value === null ? match : String(value);
  });
}

export function formatCurrency(cents: number): string {
  const currency = currencyByLocale[currentLocale];
  return new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function getCurrencySymbol(): string {
  const currency = currencyByLocale[currentLocale];
  const parts = new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency,
  }).formatToParts(0);
  return parts.find(part => part.type === 'currency')?.value ?? '';
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat(currentLocale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
