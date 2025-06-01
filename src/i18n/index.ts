import en from './locales/en';
import ja from './locales/ja';
import type { LocaleMessages } from '../types/i18n';

// Add languages to be supported in the future here
const translations: Record<string, LocaleMessages> = {
  en,
  ja
};

export default translations;