import type { LocaleMessages } from '../types/i18n';

import en from './locales/en';
import ja from './locales/ja';

// Add languages to be supported in the future here
const translations: Record<string, LocaleMessages> = {
  en,
  ja
};

export default translations;