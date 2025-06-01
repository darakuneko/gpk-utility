import React, { useState, useEffect } from "react"
import SettingEdit from "./settingEdit.js"
import { useStateContext, useDeviceType } from "../context.js"
import { useLanguage } from "../i18n/LanguageContext.js"
import { CustomSlider } from "../components/CustomComponents.js"
import UpdatesNotificationModal from "../components/UpdatesNotificationModal.js"
import VersionModal from "../components/VersionModal.js"
import { HamburgerIcon, MenuItem, LeftMenuItem } from "./SettingsUIComponents.js"
import { getSupportedSettingTabs } from "./SettingsDeviceUtils.js"

const SettingsContainer = () => {
    const {state, dispatch} = useStateContext();
    const DeviceType = useDeviceType();
    const { t, locale, changeLocale, isLoading } = useLanguage();
    
    const [activeDeviceId, setActiveDeviceId] = useState(null)
    const [activeSettingTab, setActiveSettingTab] = useState("mouse")
    const [userSelectedTab, setUserSelectedTab] = useState(false) // Flag to track manual tab selection
    const [menuOpen, setMenuOpen] = useState(false)
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
    const [traySettings, setTraySettings] = useState({
        minimizeToTray: true,
        backgroundStart: false
    })
    const [pollingInterval, setPollingInterval] = useState(() => window.api.getStoreSetting('pollingInterval') || 1000)
    const [isUpdatesNotificationModalOpen, setIsUpdatesNotificationModalOpen] = useState(false)
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
    const [updates, setUpdates] = useState([])

    // Available languages
    const availableLanguages = {
        en: 'English',
        ja: '日本語'
    };

    // Filter connected devices only
    const allDevices = state.devices || [];
    const connectedDevices = allDevices.filter(d => d.connected);
    
    // Load tray settings on component mount
    useEffect(() => {
        const loadTraySettings = async () => {
            try {
                const settings = await window.api.loadTraySettings();
                if (settings && settings.success) {
                    setTraySettings({
                        minimizeToTray: settings.minimizeToTray,
                        backgroundStart: settings.backgroundStart
                    });
                }
            } catch (error) {
                console.error("Failed to load tray settings:", error);
            }
        };
        
        loadTraySettings();
    }, []);
    
    // Set active tab on initial display or when connected devices change
    useEffect(() => {
        const checkDevices = () => {
            if (connectedDevices.length > 0) {
                // Check if current activeDeviceId belongs to a connected device when device list changes
                const currentDeviceIsConnected = connectedDevices.some(d => d.id === activeDeviceId);
                // If currently selected device is not connected or no device is selected, select the first device
                if (!currentDeviceIsConnected) {
                    setActiveDeviceId(connectedDevices[0].id);
                    setUserSelectedTab(false); // Reset flag when switching devices
                    const supportedTabs = getSupportedSettingTabs(connectedDevices[0], t, DeviceType);
                    // For TP devices, prioritize mouse tab if available, otherwise use first tab
                    const preferredTab = supportedTabs.find(tab => tab.id === "mouse") || supportedTabs[0];
                    setActiveSettingTab(preferredTab?.id || "layer");
                }
                
                // Check if active device's deviceType has been updated and current tab is not appropriate
                const activeDevice = connectedDevices.find(d => d.id === activeDeviceId);
                if (activeDevice && activeDevice.deviceType) {
                    const supportedTabs = getSupportedSettingTabs(activeDevice, t, DeviceType);
                    const currentTabSupported = supportedTabs.some(tab => tab.id === activeSettingTab);
                    
                    // For TP devices, always prefer mouse tab even if current tab is supported
                    const isTPDevice = activeDevice.deviceType === 'macropad_tp' || 
                                     activeDevice.deviceType === 'macropad_tp_btns' || 
                                     activeDevice.deviceType === 'keyboard_tp';
                    
                    // Only auto-switch if current tab is not supported or if we should prioritize mouse tab for TP devices
                    const shouldSwitchTab = !currentTabSupported || 
                                          (isTPDevice && 
                                           activeSettingTab === "layer" && 
                                           supportedTabs.find(tab => tab.id === "mouse") && 
                                           !userSelectedTab &&
                                           activeDevice.config?.trackpad?.default_speed > 0);
                    
                    if (shouldSwitchTab) {
                        // Current tab is not supported by this device type, or switch from layer to mouse for TP devices (only if not manually selected)
                        const preferredTab = supportedTabs.find(tab => tab.id === "mouse") || supportedTabs[0];
                        setActiveSettingTab(preferredTab?.id || "layer");
                        if (preferredTab) {
                            window.api.setActiveTab(activeDevice, preferredTab.id);
                        }
                    }
                }
            } else if (connectedDevices.length === 0 && activeDeviceId) {
                // Reset activeDeviceId if there are no connected devices
                setActiveDeviceId(null);
            }
        };

        checkDevices();
    }, [connectedDevices, activeDeviceId, activeSettingTab, userSelectedTab, t, DeviceType]);

    // Monitor trackpad config changes to update tab visibility with enhanced debouncing
    useEffect(() => {
        const activeDevice = connectedDevices.find(d => d.id === activeDeviceId);
        if (!activeDevice || !activeDevice.deviceType) return;

        // Enhanced debounce with longer delay to handle unstable device communication
        const timeoutId = setTimeout(() => {
            const supportedTabs = getSupportedSettingTabs(activeDevice, t, DeviceType);
            const currentTabSupported = supportedTabs.some(tab => tab.id === activeSettingTab);
            
            if (!currentTabSupported) {
                // Current tab is no longer supported due to trackpad config changes
                const preferredTab = supportedTabs.find(tab => tab.id === "mouse") || supportedTabs[0];
                setActiveSettingTab(preferredTab?.id || "layer");
                if (preferredTab) {
                    window.api.setActiveTab(activeDevice, preferredTab.id);
                }
            }
        }, 5000); // Increased to 5000ms debounce delay to handle unstable device communication

        return () => clearTimeout(timeoutId);
    }, [
        connectedDevices.find(d => d.id === activeDeviceId)?.config?.trackpad?.default_speed, 
        connectedDevices.find(d => d.id === activeDeviceId)?.connected,
        connectedDevices.find(d => d.id === activeDeviceId)?.initialized,
        connectedDevices.find(d => d.id === activeDeviceId)?.deviceType, // Add deviceType to dependencies
        activeDeviceId, 
        activeSettingTab, 
        t, 
        DeviceType
    ]);

    // Setup API event listeners
    useEffect(() => {
        window.api.on("configUpdated", ({ deviceId, config }) => {
            dispatch({
                type: "UPDATE_DEVICE_CONFIG",
                payload: { deviceId, config }
            });
        });
        
        window.api.on("changeConnectDevice", (devices) => {
            dispatch({
                type: "SET_DEVICES",
                payload: devices
            });
        });
        
        // Listen for showUpdatesNotificationModal event
        const handleUpdatesNotificationModalEvent = (event) => {
            setUpdates(event.detail.notifications);
            setIsUpdatesNotificationModalOpen(true);
        };

        window.addEventListener('showUpdatesNotificationModal', handleUpdatesNotificationModalEvent);
        
        return () => {
            window.removeEventListener('showUpdatesNotificationModal', handleUpdatesNotificationModalEvent);
        };
    }, [dispatch]);

    // Toggle menu open/close
    const toggleMenu = () => {
        setMenuOpen(!menuOpen)
    }

    // Close menu
    const closeMenu = () => {
        setMenuOpen(false)
    }

    // Import function
    const handleImport = async () => {
        await window.api.importFile()
        closeMenu()
    }

    // Export function
    const handleExport = async () => {
        await window.api.exportFile()
        closeMenu()
    }

    // Tray setting change handler
    const handleTraySettingChange = async (key, value) => {
        try {
            // Update local state
            setTraySettings(prev => ({ ...prev, [key]: value }));
            
            // Call API to persist setting
            await window.api.saveTraySettings({ [key]: value });
            
            // No longer closing menu after toggling settings
        } catch (error) {
            console.error(`Failed to update ${key} setting:`, error);
        }
    }

    // Handle language change
    const handleLanguageChange = (languageCode) => {
        changeLocale(languageCode);
        setLanguageMenuOpen(false);
        setMenuOpen(false);
    };

    // Toggle language submenu
    const toggleLanguageMenu = (e) => {
        e.stopPropagation();
        setLanguageMenuOpen(!languageMenuOpen);
    };

    // Get current active device
    const getActiveDevice = () => {
        return connectedDevices.find(d => d.id === activeDeviceId) || null;
    }

    // Get setting tabs for current device
    const getSettingTabs = () => {
        const device = getActiveDevice();
        return getSupportedSettingTabs(device, t, DeviceType);
    }

    // Handler to close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuOpen && !event.target.closest('.menu-container')) {
                setMenuOpen(false);
                setLanguageMenuOpen(false);
            }
        }
        
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [menuOpen]);

    // Show updates notifications modal
    const handleShowUpdatesNotifications = async () => {
        try {
            const result = await window.api.getCachedNotifications();
            if (result && result.length > 0) {
                setUpdates(result);
                setIsUpdatesNotificationModalOpen(true);
                setMenuOpen(false);
            } else {
                // No updates to show
                alert(t('updatesNotification.noNotification'));
                setMenuOpen(false);
            }
        } catch (error) {
            console.error("Failed to load updates:", error);
        }
    };

    // Show version modal
    const handleShowVersion = () => {
        setIsVersionModalOpen(true);
        setMenuOpen(false);
    };

    // Set active setting tab and notify API
    const handleSettingTabChange = (tabId) => {
        setActiveSettingTab(tabId);
        setUserSelectedTab(true); // Mark that user has manually selected a tab
        const device = getActiveDevice();
        if (device) {
            window.api.setActiveTab(device, tabId);
        }
    }

    // Check if no devices at all (not even attempting to connect)
    const hasNoDevicesAtAll = !state.devices || state.devices.length === 0;

    return (
        <div className="bg-card-bg dark:bg-card-bg rounded-lg shadow-sm">
            {/* Tab Header - Device selection tabs at the top */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 relative">
                <div className="flex-grow flex justify-start">
                    {connectedDevices.map((device, index) => (
                        <button
                            key={`${device.id}-tab-${index}`}
                            className={`py-3 px-6 text-sm font-medium ${
                                activeDeviceId === device.id
                                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                            onClick={() => {
                                setActiveDeviceId(device.id);
                                setUserSelectedTab(false); // Reset flag when switching devices
                                // When switching devices, select the first available settings tab for that device
                                const supportedTabs = getSupportedSettingTabs(device, t, DeviceType);
                                if (supportedTabs.length > 0) {
                                    // For TP devices, only prioritize mouse tab if trackpad config is available
                                    const isTPDevice = device.deviceType === 'macropad_tp' || 
                                                     device.deviceType === 'macropad_tp_btns' || 
                                                     device.deviceType === 'keyboard_tp';
                                    const hasTrackpadConfig = device.config?.trackpad?.default_speed > 0;
                                    
                                    const preferredTab = (isTPDevice && hasTrackpadConfig && supportedTabs.find(tab => tab.id === "mouse")) 
                                                       ? supportedTabs.find(tab => tab.id === "mouse")
                                                       : supportedTabs[0];
                                    setActiveSettingTab(preferredTab.id);
                                    window.api.setActiveTab(device, preferredTab.id);
                                }
                            }}
                        >
                            {device.product}
                        </button>
                    ))}
                </div>
                
                {/* Hamburger Menu */}
                <div className="menu-container relative flex items-center px-4">
                    <button 
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1"
                        onClick={toggleMenu}
                        aria-label="Menu"
                    >
                        <HamburgerIcon />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-gray-800 shadow-lg rounded-md z-10 border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Language Settings */}
                            <div className="relative">
                                <MenuItem onClick={toggleLanguageMenu}>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="mr-2">{t('settings.language')}</span>
                                        <span className="text-sm text-gray-900 dark:text-gray-100 ml-auto font-medium">{availableLanguages[locale]}</span>
                                    </div>
                                </MenuItem>
                                
                                {/* Language Submenu */}
                                {languageMenuOpen && (
                                    <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md z-20 border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        {Object.entries(availableLanguages).map(([code, name]) => (
                                            <MenuItem 
                                                key={code}
                                                onClick={() => handleLanguageChange(code)}
                                            >
                                                <div className="flex items-center">
                                                    <span className={locale === code ? "font-semibold" : ""}>{name}</span>
                                                    {locale === code && (
                                                        <svg className="ml-2 h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </MenuItem>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <MenuItem onClick={handleImport}>{t('settings.import')}</MenuItem>
                            <MenuItem onClick={handleExport}>{t('settings.export')}</MenuItem>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            
                            {/* Polling interval settings */}
                            <div className="px-4 py-3">
                                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-gray-300">
                                    {t('settings.pollingInterval')}
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 font-normal">
                                        {pollingInterval} ms
                                    </span>
                                </label>
                                <div className="mb-2">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>{t('settings.faster')}</span>
                                        <span>{t('settings.slower')}</span>
                                    </div>
                                    <CustomSlider
                                        id="settings-polling-interval"
                                        value={pollingInterval}
                                        min={200}
                                        step={100}
                                        max={2000}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value, 10);
                                            // Immediately update local state
                                            setPollingInterval(value);
                                            
                                            // Save settings to backend
                                            window.api.saveStoreSetting('pollingInterval', value);
                                            
                                            // Update slider UI
                                            window.requestAnimationFrame(() => {
                                                const element = document.getElementById('settings-polling-interval');
                                                if (element) {
                                                    element.dispatchEvent(new Event('update'));
                                                }
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            <MenuItem 
                                isToggle={true} 
                                isChecked={traySettings.minimizeToTray}
                                onClick={() => handleTraySettingChange('minimizeToTray', !traySettings.minimizeToTray)}
                            >
                                {t('settings.minimizeToTray')}
                            </MenuItem>
                            <MenuItem 
                                isToggle={true} 
                                isChecked={traySettings.backgroundStart}
                                onClick={() => handleTraySettingChange('backgroundStart', !traySettings.backgroundStart)}
                            >
                                {t('settings.startInTray')}
                            </MenuItem>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            <MenuItem onClick={handleShowUpdatesNotifications}>{t('updatesNotification.title')}</MenuItem>
                            <MenuItem onClick={handleShowVersion}>{t('about.title')}</MenuItem>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Two-column layout */}
            <div className="flex">            {/* Left navigation menu */}
            <div className="w-64 p-4 border-r border-gray-200 dark:border-gray-700">
                <div className="space-y-1">
                    {connectedDevices.length > 0 ? (
                        getSettingTabs().map((tab) => (
                            <LeftMenuItem 
                                key={tab.id}
                                active={activeSettingTab === tab.id}
                                onClick={() => handleSettingTabChange(tab.id)}
                            >
                                {tab.label}
                            </LeftMenuItem>
                        ))
                    ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400 px-4 py-3">
                            {t('header.noSettingsAvailable')}
                        </div>
                    )}
                </div>
            </div>
                
                {/* Right settings content area */}
                <div className="flex-1 p-4">
                    {hasNoDevicesAtAll ? (
                        <div className="text-center text-gray-600 dark:text-gray-400">
                            <p className="text-lg mb-2">{t('header.noDevices')}</p>
                            <p className="text-sm">
                                {t('header.connectionMessage')}
                            </p>
                        </div>
                    ) : connectedDevices.length === 0 ? (
                        <div className="text-center text-gray-600 dark:text-gray-400">
                            <p className="text-lg mb-2">{t('header.connecting')}</p>
                            <p className="text-sm">
                                {t('header.pleaseConnect')}
                            </p>
                        </div>
                    ) : getSettingTabs().length === 0 ? (
                        <div className="text-center text-gray-600 dark:text-gray-400">
                            <p className="text-lg mb-2">{t('header.initializingDevice')}</p>
                            <p className="text-sm mb-4">
                                {t('header.deviceConfigLoading')}
                            </p>
                            <div className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                                {t('header.deviceCommunicationProgress')}
                            </div>
                        </div>
                    ) : (
                        connectedDevices.map((device, index) => (
                            <div 
                                key={`${device.id}-content-${index}`} 
                                className={activeDeviceId === device.id ? "block" : "hidden"}
                            >
                                <SettingEdit 
                                    device={device} 
                                    activeTab={activeSettingTab}
                                    setActiveTab={handleSettingTabChange}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            {/* Updates Notification Modal */}
            <UpdatesNotificationModal 
                isOpen={isUpdatesNotificationModalOpen}
                onClose={() => setIsUpdatesNotificationModalOpen(false)}
                updates={updates}
            />
            
            {/* Version Modal */}
            <VersionModal
                isOpen={isVersionModalOpen}
                onClose={() => setIsVersionModalOpen(false)}
            />
        </div>
    )
}

export default SettingsContainer
