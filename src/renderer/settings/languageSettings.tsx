import React, { useState, useEffect } from 'react';

import { useLanguage } from '../../i18n/LanguageContext';

interface AvailableLanguages {
  [key: string]: string;
}

const LanguageSettings: React.FC = (): React.ReactElement => {
  const { locale, changeLocale, t } = useLanguage();
  const [selectedLocale, setSelectedLocale] = useState<string>(locale);

  useEffect((): void => {
    setSelectedLocale(locale);
  }, [locale]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const newLocale: string = e.target.value;
    setSelectedLocale(newLocale);
    changeLocale(newLocale);
  };

  const availableLanguages: AvailableLanguages = {
    en: 'English',
    ja: '日本語'
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
          {Object.keys(availableLanguages).map((code: string) => (
            <option key={code} value={code}>
              {availableLanguages[code]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LanguageSettings;