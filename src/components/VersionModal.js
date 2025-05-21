import { useLanguage } from '../i18n/LanguageContext.js';
import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModalComponents.js';

const VersionModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [appInfo, setAppInfo] = useState({
    name: '',
    version: '',
    description: '',
    author: {},
    homepage: ''
  });
  
  useEffect(() => {
    if (isOpen) {
      // Get app information when modal is opened
      window.api.getAppInfo().then(info => {
        setAppInfo(info);
      }).catch(err => {
        console.error('Failed to get app info:', err);
      });
    }
  }, [isOpen]);
  
  if (!isOpen) {
    return null;
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('about.title', 'About')} ${appInfo.name}`}
      showCloseIcon={true}
    >
      <div className="space-y-2 text-gray-700 dark:text-gray-300">
        <div className="grid grid-cols-3 gap-4">
          <div className="font-medium">{t('about.version', 'Version')}:</div>
          <div className="col-span-2">{appInfo.version}</div>
          
          <div className="font-medium">{t('about.author', 'Author')}:</div>
          <div className="col-span-2">
            {appInfo.author ? `${appInfo.author.name}` : ''}
          </div>
          
          <div className="font-medium">{t('about.homepage', 'Homepage')}:</div>
          <div className="col-span-2">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                window.api.openExternalLink(appInfo.homepage);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {appInfo.homepage}
            </a>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default VersionModal;
