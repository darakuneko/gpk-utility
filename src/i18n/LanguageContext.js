import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const defaultLocale = 'en';

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(defaultLocale);
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    // Load previously selected language from localStorage
    const savedLocale = localStorage.getItem('locale') || defaultLocale;
    setLocale(savedLocale);
  }, []);

  useEffect(() => {
    // Update language files
    import(`./locales/${locale}.js`)
      .then(module => {
        setTranslations(module.default);
        localStorage.setItem('locale', locale);
      })
      .catch(() => {
        console.error(`Could not load locale: ${locale}`);
        // If loading fails, revert to default language
        if (locale !== defaultLocale) {
          setLocale(defaultLocale);
        }
      });
  }, [locale]);

  const t = (key, ...args) => {
    if (!key) return '';
    
    // Use dot notation to access nested keys
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && Object.prototype.hasOwnProperty.call(value, k)) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    // Placeholder replacement processing
    if (typeof value === 'string' && args.length > 0 && typeof args[0] === 'object') {
      const params = args[0];
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return value || key;
  };

  const changeLocale = (newLocale) => {
    setLocale(newLocale);
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}