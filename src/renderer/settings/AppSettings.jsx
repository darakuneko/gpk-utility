import React from 'react';
import LanguageSettings from './languageSettings.jsx';
import SettingFiles from '../settingFiles.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function AppSettings() {
  const { t } = useLanguage();

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('settings.appSettings')}</h2>
        
        <div className="mb-6">
          <LanguageSettings />
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{t('settings.import')}/{t('settings.export')}</h3>
          <SettingFiles />
        </div>
      </div>
    </div>
  );
}