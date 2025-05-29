import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const defaultLocale = 'en';

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(defaultLocale);
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load previously selected language from localStorage
    const savedLocale = localStorage.getItem('locale') || defaultLocale;
    setLocale(savedLocale);
  }, []);

  useEffect(() => {
    // Set loading state to true when starting to load new translations
    setIsLoading(true);
    
    // Update language files
    import(`./locales/${locale}.js`)
      .then(module => {
        setTranslations(module.default);
        localStorage.setItem('locale', locale);
        
        // Notify main process about locale change
        if (window.api && window.api.setAppLocale) {
          window.api.setAppLocale(locale).catch(err => {
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

  const t = (key, params = {}) => {
    if (!key) return '';
    
    // If translations are not yet loaded, return the key without warning
    if (!translations || Object.keys(translations).length === 0) {
      return key;
    }
    
    // Use dot notation to access nested keys
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && Object.prototype.hasOwnProperty.call(value, k)) {
        value = value[k];
      } else {
        // Only log warning if we actually have translations loaded
        // This prevents warning spam during initial load
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    let result = value || key;
    
    // Replace parameters in the translation string
    if (typeof result === 'string' && params && typeof params === 'object') {
      Object.keys(params).forEach(paramKey => {
        const placeholder = `{{${paramKey}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), params[paramKey]);
      });
    }

    return result;
  };

  const changeLocale = (newLocale) => {
    setLocale(newLocale);
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLocale, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}