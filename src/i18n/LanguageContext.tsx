import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

import type { LocaleMessages } from '../types/i18n';

interface LanguageContextType {
  locale: string;
  changeLocale: (newLocale: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const defaultLocale = 'en';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocale] = useState<string>(defaultLocale);
  const [translations, setTranslations] = useState<LocaleMessages>({} as LocaleMessages);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load previously selected language from localStorage
    const savedLocale = localStorage.getItem('locale') || defaultLocale;
    setLocale(savedLocale);
  }, []);

  useEffect(() => {
    // Set loading state to true when starting to load new translations
    setIsLoading(true);
    
    // Update language files
    import(`./locales/${locale}.ts`)
      .then(module => {
        setTranslations(module.default);
        localStorage.setItem('locale', locale);
        
        // Notify main process about locale change
        if (window.api && window.api.setAppLocale) {
          window.api.setAppLocale(locale).catch((err: unknown) => {
            console.error('Error updating app locale:', err);
          });
        }
        
        // Set loading to false when translations are loaded
        setIsLoading(false);
      })
      .catch(() => {
        console.error(`Could not load locale: ${locale}`);
        // If loading fails, revert to default language
        if (locale !== defaultLocale) {
          setLocale(defaultLocale);
        } else {
          // If even default locale fails, still need to set loading to false
          setIsLoading(false);
        }
      });
  }, [locale]);

  const t = (key: string, params: Record<string, string | number> = {}): string => {
    if (!key) return '';
    
    // If translations are not yet loaded, return the key without warning
    if (!translations || Object.keys(translations).length === 0) {
      return key;
    }
    
    // Use dot notation to access nested keys
    const keys = key.split('.');
    let value: unknown = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, k)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Only log warning if we actually have translations loaded
        // This prevents warning spam during initial load
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    let result: string = typeof value === 'string' ? value : key;
    
    // Replace parameters in the translation string
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(paramKey => {
        const placeholder = `{{${paramKey}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(params[paramKey]));
      });
    }

    return result;
  };

  const changeLocale = (newLocale: string): void => {
    setLocale(newLocale);
  };

  const contextValue: LanguageContextType = {
    locale,
    changeLocale,
    t,
    isLoading
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}