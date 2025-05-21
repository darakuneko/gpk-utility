import { useLanguage } from '../i18n/LanguageContext.js';
import { useState, useEffect } from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('about.title', 'About')} {appInfo.name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
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
        
        <div className="flex justify-end mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            {t('common.ok', 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionModal;
