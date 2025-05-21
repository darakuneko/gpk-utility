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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* 固定ヘッダー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('updatesNotification.title')}
          </h2>
        </div>
        
        {/* スクロール可能なコンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-4">
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
        </div>
        
        {/* 固定フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
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
