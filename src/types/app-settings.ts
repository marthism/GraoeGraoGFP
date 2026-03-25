import type { Locale } from '@/i18n';

export type DisplayMode = 'window' | 'fullscreen';
export type ResolutionOption =
  | 'auto'
  | '1280x720'
  | '1366x768'
  | '1600x900'
  | '1920x1080'
  | '2560x1440';

export type AppLocale = Locale;

export const RESOLUTION_PRESETS: ResolutionOption[] = [
  'auto',
  '1280x720',
  '1366x768',
  '1600x900',
  '1920x1080',
  '2560x1440',
];
