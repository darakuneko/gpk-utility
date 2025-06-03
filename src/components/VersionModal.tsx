import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';

import { useLanguage } from '../i18n/LanguageContext';
import type { VersionModalProps } from '../types/react';
import type { AppInfo } from '../types/device';

import { BaseModal } from './BaseModalComponents';

const VersionModal: React.FC<VersionModalProps> = ({ isOpen, onClose }): JSX.Element | null => {
  const { t } = useLanguage();
  const [appInfo, setAppInfo] = useState<AppInfo>({
    name: '',
    version: '',
    description: '',
    author: {}
  });
  const [storeFilePath, setStoreFilePath] = useState<string>('');
  
  useEffect((): void => {
    if (isOpen) {
      // Get app information when modal is opened
      window.api.getAppInfo().then((info: AppInfo): void => {
        setAppInfo(info);
      }).catch((err: unknown): void => {
        console.error('Failed to get app info:', err);
      });
      
      // Get store file path
      window.api.getStoreFilePath().then((result: { success: boolean; path?: string }): void => {
        if (result.success && result.path) {
          setStoreFilePath(result.path);
        }
      }).catch((err: unknown): void => {
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
          
          {appInfo.author?.url && (
            <>
              <div className="font-medium">{t('about.homepage')}:</div>
              <div className="col-span-2">
                <a 
                  href="#" 
                  onClick={(e): void => {
                    e.preventDefault();
                    if (appInfo.author?.url) {
                      window.api.openExternalLink(appInfo.author.url);
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {appInfo.author.url}
                </a>
              </div>
            </>
          )}
          
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