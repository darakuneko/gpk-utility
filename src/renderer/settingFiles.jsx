import React from "react"
import { useLanguage } from "../i18n/LanguageContext.jsx";

const {api} = window

const CustomButton = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="w-[120px] px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-md transition-colors dark:bg-primary dark:hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
  >
    {children}
  </button>
)

const SettingFiles = (() => {
    const { t } = useLanguage();
    
    const handleImport = async (event) => await api.importFile()
    const handleExport = async (event) => await api.exportFile()

    return (
        <div className="pt-4 pl-16 text-text-primary dark:text-white">
            <div className="flex justify-between max-w-[260px]">
                <CustomButton onClick={handleImport}>{t('common.import')}</CustomButton>
                <CustomButton onClick={handleExport}>{t('common.export')}</CustomButton>
            </div>
        </div>
    )
})

export default SettingFiles
