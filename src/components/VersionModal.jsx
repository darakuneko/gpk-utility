import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModalComponents.jsx';

const VersionModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [appInfo, setAppInfo] = useState({
    name: '',
    version: '',
    description: '',
    author: {},
    homepage: ''
  });
  const [storeFilePath, setStoreFilePath] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      // Get app information when modal is opened
      window.api.getAppInfo().then(info => {
        setAppInfo(info);
      }).catch(err => {
        console.error('Failed to get app info:', err);
      });
      
      // Get store file path
      window.api.getStoreFilePath().then(result => {
        if (result.success && result.path) {
          setStoreFilePath(result.path);
        }
      }).catch(err => {
        console.error('Failed to get store file path:', err);
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
      title={`${t('about.title')} ${appInfo.name}`}
      showCloseIcon={true}
    >
      <div className="space-y-2 text-gray-700 dark:text-gray-300">
        <div className="grid grid-cols-3 gap-4">
          <div className="font-medium">{t('about.version')}:</div>
          <div className="col-span-2">{appInfo.version}</div>
          
          <div className="font-medium">{t('about.author')}:</div>
          <div className="col-span-2">
            {appInfo.author ? `${appInfo.author.name}` : ''}
          </div>
          
          <div className="font-medium">{t('about.homepage')}:</div>
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
          
          <div className="font-medium">{t('about.configPath')}:</div>
          <div className="col-span-2">
            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
              {storeFilePath || 'Loading...'}
            </span>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default VersionModal;
