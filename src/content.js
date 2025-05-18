import React, {useEffect, useState, useRef} from 'react'
import SettingsContainer from "./renderer/SettingsContainer.js"
import {useStateContext} from "./context.js"
import { useLanguage } from "./i18n/LanguageContext.js"

const api = window.api;
const hasApi = !!api;

const Content = () => {
    const {state, setState} = useStateContext()
    const stateRef = useRef(state);
    const { t } = useLanguage(); // Hook for internationalization

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        if (!hasApi) return;
        
        const handleDeviceChange = (dat) => {
            if (!dat || !Array.isArray(dat)) return;

            setState(prev => ({
                ...prev,
                init: false,
                devices: dat
            }));
        };

        api.on("changeConnectDevice", handleDeviceChange);
        
        return () => {
            if (api.off) {
                api.off("changeConnectDevice", handleDeviceChange);
            }
        };
    }, [setState]);

    useEffect(() => {
        if (!hasApi) return;
        
        const handleActiveWindow = async (dat) => {
            if (!dat) return;
            
            setState(prev => {
                if (!prev.activeWindow.includes(dat)) {
                    const activeWindows = [...prev.activeWindow, dat];
                    if (activeWindows.length > 10) activeWindows.shift();
                    
                    return {
                        ...prev,
                        activeWindow: activeWindows
                    };
                }
                return prev;
            });
        };
        
        api.on("activeWindow", handleActiveWindow);
        
        return () => {
            if (api.off) {
                api.off("activeWindow", handleActiveWindow);
            }
        };
    }, [setState]);

    // Monitor config save completion event
    const [saveStatus, setSaveStatus] = useState({
        visible: false,
        success: false,
        timestamp: null
    });

    useEffect(() => {
        if (!hasApi || !api.onConfigSaveComplete) return;
        
        api.onConfigSaveComplete(({ success, timestamp }) => {
            // Ignore updates within 500ms of the previous notification to prevent continuous notifications
            if (saveStatus.timestamp && timestamp - saveStatus.timestamp < 500) {
                return;
            }
            
            setSaveStatus({
                visible: true,
                success,
                timestamp
            });
            
            setTimeout(() => {
                setSaveStatus(prev => ({ ...prev, visible: false }));
            }, 3000); // Reduced display time from 3000ms to 1500ms
        });
    }, []);

    return (
        <div className="min-h-screen bg-background overflow-auto p-4">
            <div className="max-w-7xl mx-auto">
                <SettingsContainer/>
                {saveStatus.visible && (
                    <div className={`fixed bottom-4 right-4 p-3 rounded-md shadow-md text-sm transition-opacity duration-300 ${
                        saveStatus.success 
                            ? "text-green-800 dark:text-green-200" 
                            : "text-red-800 dark:text-red-200"
                    }`}>
                        {saveStatus.success 
                            ? t('common.saveComplete') 
                            : t('common.saveError')}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Content
