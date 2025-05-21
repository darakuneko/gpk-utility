import { useLanguage } from '../i18n/LanguageContext.js';

const UpdatesNotificationModal = ({ isOpen, onClose, updates }) => {
  const { t } = useLanguage();
  
  if (!isOpen || !updates || updates.length === 0) {
    return null;
  }
  
  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full max-h-[80vh] overflow-auto">
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
        
        <div className="flex justify-end mt-4">
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

export default UpdatesNotificationModal;
