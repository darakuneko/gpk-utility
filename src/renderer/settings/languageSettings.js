import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext.js';
import translations from '../../i18n/index.js';

export default function LanguageSettings() {
  const { locale, changeLocale, t } = useLanguage();
  const [selectedLocale, setSelectedLocale] = useState(locale);

  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  const handleChange = (e) => {
    const newLocale = e.target.value;
    setSelectedLocale(newLocale);
    changeLocale(newLocale);
  };

  const availableLanguages = {
    en: 'English'
  };

  return (
    <div className="setting-section">
      <h3 className="text-lg font-semibold mb-2">{t('settings.language')}</h3>
      <div className="mb-4">
        <label className="text-sm text-gray-600 block mb-2">
          {t('settings.selectLanguage')}
        </label>
        <select
          className="w-full p-2 border border-gray-300 rounded-md"
          value={selectedLocale}
          onChange={handleChange}
        >
          {Object.keys(availableLanguages).map((code) => (
            <option key={code} value={code}>
              {availableLanguages[code]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}