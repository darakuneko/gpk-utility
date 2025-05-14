import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const defaultLocale = 'en';

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(defaultLocale);
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    // localStorage から前回選択した言語を読み込む
    const savedLocale = localStorage.getItem('locale') || defaultLocale;
    setLocale(savedLocale);
  }, []);

  useEffect(() => {
    // 言語ファイルを更新
    import(`./locales/${locale}.js`)
      .then(module => {
        setTranslations(module.default);
        localStorage.setItem('locale', locale);
      })
      .catch(() => {
        console.error(`Could not load locale: ${locale}`);
        // 読み込みに失敗した場合、デフォルト言語に戻す
        if (locale !== defaultLocale) {
          setLocale(defaultLocale);
        }
      });
  }, [locale]);

  const t = (key) => {
    if (!key) return '';
    
    // ドット記法を使ってネストされたキーにアクセスする
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