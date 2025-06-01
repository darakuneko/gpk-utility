import { useLanguage } from '../i18n/LanguageContext.jsx';
import { BaseModal } from './BaseModalComponents.jsx';

const UpdatesNotificationModal = ({ isOpen, onClose, updates }) => {
  const { t } = useLanguage();
  
  if (!isOpen || !updates || updates.length === 0) {
    return null;
  }
  
  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';    
      const date = new Date(timestamp._seconds * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('updatesNotification.title')}
    >
      <div className="space-y-4">
        {updates.map((update, index) => (
          <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4 last:border-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {update.title}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(update.publishedAt)}
              </span>
            </div>
            <div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
              {update.body}
            </div>
          </div>
        ))}
      </div>
    </BaseModal>
  );
};

export default UpdatesNotificationModal;
