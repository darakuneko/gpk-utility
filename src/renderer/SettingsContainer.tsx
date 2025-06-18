import React, { useState, useEffect } from "react"
import type { JSX } from 'react';

import { useStateContext, useDeviceType } from "../context.tsx"
import type { Device } from "../types/device"
import { useLanguage } from "../i18n/LanguageContext.tsx"
import { CustomSlider } from "../components/CustomComponents.tsx"
import UpdatesNotificationModal from "../components/UpdatesNotificationModal.tsx"
import VersionModal from "../components/VersionModal.tsx"

import SettingEdit from "./settingEdit.tsx"
import { HamburgerIcon, MenuItem, LeftMenuItem } from "./SettingsUIComponents.tsx"
import { getSupportedSettingTabs } from "./SettingsDeviceUtils.ts"

interface SettingsContainerProps {
    saveStatus?: {
        visible: boolean;
        success: boolean;
    };
}

const SettingsContainer: React.FC<SettingsContainerProps> = ({ saveStatus }): JSX.Element => {
    const {state, dispatch} = useStateContext();
    const DeviceType = useDeviceType();
    const { t, locale, changeLocale, isLoading: _isLoading } = useLanguage();
    
    const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
    const [activeSettingTab, setActiveSettingTab] = useState("mouse")
    const [userSelectedTab, setUserSelectedTab] = useState(false) // Flag to track manual tab selection
    const [menuOpen, setMenuOpen] = useState(false)
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
    const [traySettings, setTraySettings] = useState({
        minimizeToTray: true,
        backgroundStart: false
    })
    const [pollingInterval, setPollingInterval] = useState((): number => {
        const setting = window.api.getStoreSetting('pollingInterval');
        return typeof setting === 'number' ? setting : 1000;
    })
    const [isUpdatesNotificationModalOpen, setIsUpdatesNotificationModalOpen] = useState(false)
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
    const [updates, setUpdates] = useState<Array<{ title: string; body: string; publishedAt: { _seconds: number } }>>([])

    // Available languages
    const availableLanguages = {
        en: 'English',
        ja: '日本語'
    };

    // Filter connected devices only
    const allDevices = state.devices || [];
    const connectedDevices = allDevices.filter((d): boolean => d.connected ?? false);
    
    // Load tray settings on component mount
    useEffect((): void => {
        const loadTraySettings = async (): Promise<void> => {
            try {
                const settings = await window.api.loadTraySettings();
                if (settings && settings.success) {
                    setTraySettings({
                        minimizeToTray: settings.minimizeToTray ?? true,
                        backgroundStart: settings.backgroundStart ?? false
                    });
                }
            } catch (error) {
                console.error("Failed to load tray settings:", error);
            }
        };
        
        void loadTraySettings();
    }, []);
    
    // Set active tab on initial display or when connected devices change
    useEffect((): void => {
        const checkDevices = (): void => {
            if (connectedDevices.length > 0) {
                // Check if current activeDeviceId belongs to a connected device when device list changes
                const currentDeviceIsConnected = connectedDevices.some((d): boolean => d.id === activeDeviceId);
                // If currently selected device is not connected or no device is selected, select the first device
                if (!currentDeviceIsConnected) {
                    setActiveDeviceId(connectedDevices[0]?.id || null);
                    setUserSelectedTab(false); // Reset flag when switching devices
                    const supportedTabs = getSupportedSettingTabs(connectedDevices[0] || null, t, DeviceType);
                    // For TP devices, prioritize mouse tab if available, otherwise use first tab
                    const preferredTab = supportedTabs.find((tab): boolean => tab.id === "mouse") || supportedTabs[0];
                    setActiveSettingTab(preferredTab?.id || "layer");
                }
                
                // Check if active device's deviceType has been updated and current tab is not appropriate
                const activeDevice = connectedDevices.find((d): boolean => d.id === activeDeviceId);
                if (activeDevice && activeDevice.deviceType) {
                    const supportedTabs = getSupportedSettingTabs(activeDevice, t, DeviceType);
                    const currentTabSupported = supportedTabs.some((tab): boolean => tab.id === activeSettingTab);
                    
                    // For TP devices, always prefer mouse tab even if current tab is supported
                    const isTPDevice = activeDevice.deviceType === 'macropad_tp' || 
                                     activeDevice.deviceType === 'macropad_tp_btns' || 
                                     activeDevice.deviceType === 'keyboard_tp';

                                     // Only auto-switch if current tab is not supported or if we should prioritize mouse tab for TP devices
                    const shouldSwitchTab = !currentTabSupported || 
                                          (isTPDevice && 
                                           activeSettingTab === "layer" && 
                                           supportedTabs.find((tab): boolean => tab.id === "mouse") && 
                                           !userSelectedTab &&
                                           (activeDevice.config?.trackpad?.default_speed || 0) > 0);
                    
                    if (shouldSwitchTab) {
                        // Current tab is not supported by this device type, or switch from layer to mouse for TP devices (only if not manually selected)
                        const preferredTab = supportedTabs.find((tab): boolean => tab.id === "mouse") || supportedTabs[0];
                        setActiveSettingTab(preferredTab?.id || "layer");
                        if (preferredTab) {
                            void window.api.setActiveTab(activeDevice.id, preferredTab.id);
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
    useEffect((): (() => void) | void => {
        const activeDevice = connectedDevices.find((d): boolean => d.id === activeDeviceId);
        if (!activeDevice || !activeDevice.deviceType) return;

        // Enhanced debounce with longer delay to handle unstable device communication
        const timeoutId = setTimeout((): void => {
            const supportedTabs = getSupportedSettingTabs(activeDevice, t, DeviceType);
            const currentTabSupported = supportedTabs.some((tab): boolean => tab.id === activeSettingTab);
            
            if (!currentTabSupported) {
                // Current tab is no longer supported due to trackpad config changes
                const preferredTab = supportedTabs.find((tab): boolean => tab.id === "mouse") || supportedTabs[0];
                setActiveSettingTab(preferredTab?.id || "layer");
                if (preferredTab) {
                    void window.api.setActiveTab(activeDevice.id, preferredTab.id);
                }
            }
        }, 5000); // Increased to 5000ms debounce delay to handle unstable device communication

        return (): void => {
            clearTimeout(timeoutId);
        };
    }, [
        connectedDevices.find((d): boolean => d.id === activeDeviceId)?.config?.trackpad?.default_speed, 
        connectedDevices.find((d): boolean => d.id === activeDeviceId)?.connected,
        connectedDevices.find((d): boolean => d.id === activeDeviceId)?.initializing,
        connectedDevices.find((d): boolean => d.id === activeDeviceId)?.deviceType, // Add deviceType to dependencies
        activeDeviceId, 
        activeSettingTab, 
        t, 
        DeviceType
    ]);

    // Setup API event listeners
    useEffect((): (() => void) => {
        window.api.on("configUpdated", (data: { deviceId: string; config: Record<string, unknown> }): void => {
            dispatch({
                type: "UPDATE_DEVICE_CONFIG",
                payload: { deviceId: data.deviceId, config: data.config }
            });
        });
        
        window.api.on("changeConnectDevice", (devices: Device[]): void => {
            dispatch({
                type: "SET_DEVICES",
                payload: devices
            });
        });
        
        // Listen for showUpdatesNotificationModal event
        const handleUpdatesNotificationModalEvent = (event: CustomEvent<{ notifications: Array<{ title: string; body: string; publishedAt: { _seconds: number } }> }>): void => {
            setUpdates(event.detail.notifications);
            setIsUpdatesNotificationModalOpen(true);
        };

        window.addEventListener('showUpdatesNotificationModal', handleUpdatesNotificationModalEvent);
        
        return (): void => {
            window.removeEventListener('showUpdatesNotificationModal', handleUpdatesNotificationModalEvent);
        };
    }, [dispatch]);

    // Toggle menu open/close
    const toggleMenu = (): void => {
        setMenuOpen(!menuOpen)
    }

    // Close menu
    const closeMenu = (): void => {
        setMenuOpen(false)
    }

    // Import function
    const handleImport = async (): Promise<void> => {
        await window.api.importFile()
        closeMenu()
    }

    // Export function
    const handleExport = async (): Promise<void> => {
        await window.api.exportFile()
        closeMenu()
    }

    // Tray setting change handler
    const handleTraySettingChange = async (key: string, value: boolean): Promise<void> => {
        try {
            // Update local state
            setTraySettings((prev): typeof prev => ({ ...prev, [key]: value }));
            
            // Call API to persist setting
            await window.api.saveTraySettings({ [key]: value });
            
            // No longer closing menu after toggling settings
        } catch (error) {
            console.error(`Failed to update ${key} setting:`, error);
        }
    }

    // Handle language change
    const handleLanguageChange = (languageCode: string): void => {
        changeLocale(languageCode);
        setLanguageMenuOpen(false);
        setMenuOpen(false);
    };

    // Toggle language submenu
    const toggleLanguageMenu = (e: React.MouseEvent): void => {
        e.stopPropagation();
        setLanguageMenuOpen(!languageMenuOpen);
    };

    // Get current active device
    const getActiveDevice = (): Device | null => {
        return connectedDevices.find((d): boolean => d.id === activeDeviceId) || null;
    }

    // Get setting tabs for current device
    const getSettingTabs = (): Array<{ id: string; label: string }> => {
        const device = getActiveDevice();
        return getSupportedSettingTabs(device, t, DeviceType);
    }

    // Handler to close menu when clicking outside
    useEffect((): (() => void) => {
        const handleClickOutside = (event: MouseEvent): void => {
            const target = event.target as Element;
            if (menuOpen && target && !target.closest('.menu-container')) {
                setMenuOpen(false);
                setLanguageMenuOpen(false);
            }
        }
        
        document.addEventListener('mousedown', handleClickOutside)
        return (): void => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [menuOpen]);

    // Show updates notifications modal
    const handleShowUpdatesNotifications = async (): Promise<void> => {
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
    const handleShowVersion = (): void => {
        setIsVersionModalOpen(true);
        setMenuOpen(false);
    };

    // Set active setting tab and notify API
    const handleSettingTabChange = (tabId: string): void => {
        setActiveSettingTab(tabId);
        setUserSelectedTab(true); // Mark that user has manually selected a tab
        const device = getActiveDevice();
        if (device) {
            void window.api.setActiveTab(device.id, tabId);
        }
    }

    // Check if no devices at all (not even attempting to connect)
    const hasNoDevicesAtAll = !state.devices || state.devices.length === 0;

    return (
        <div className="bg-card-bg dark:bg-card-bg rounded-lg shadow-xs">
            {/* Tab Header - Device selection tabs at the top */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 relative">
                <div className="flex-grow flex justify-start">
                    {connectedDevices.map((device, index): JSX.Element => (
                        <button
                            key={`${device.id}-tab-${index}`}
                            className={`py-3 px-6 text-sm font-medium ${
                                activeDeviceId === device.id
                                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                            onClick={(): void => {
                                setActiveDeviceId(device.id);
                                setUserSelectedTab(false); // Reset flag when switching devices
                                // When switching devices, select the first available settings tab for that device
                                const supportedTabs = getSupportedSettingTabs(device, t, DeviceType);
                                if (supportedTabs.length > 0) {
                                    // For TP devices, only prioritize mouse tab if trackpad config is available
                                    const isTPDevice = device.deviceType === 'macropad_tp' || 
                                                     device.deviceType === 'macropad_tp_btns' || 
                                                     device.deviceType === 'keyboard_tp';
                                    const hasTrackpadConfig = (device.config?.trackpad?.default_speed || 0) > 0;
                                    
                                    const preferredTab = (isTPDevice && hasTrackpadConfig && supportedTabs.find((tab): boolean => tab.id === "mouse")) 
                                                       ? supportedTabs.find((tab): boolean => tab.id === "mouse")
                                                       : supportedTabs[0];
                                    if (preferredTab) {
                                        setActiveSettingTab(preferredTab.id);
                                        void window.api.setActiveTab(device.id, preferredTab.id);
                                    }
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
                                <MenuItem onClick={(): void => toggleLanguageMenu({} as React.MouseEvent)}>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="mr-2">{t('settings.language')}</span>
                                        <span className="text-sm text-gray-900 dark:text-gray-100 ml-auto font-medium">{availableLanguages[locale as keyof typeof availableLanguages]}</span>
                                    </div>
                                </MenuItem>
                                
                                {/* Language Submenu */}
                                {languageMenuOpen && (
                                    <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md z-20 border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        {Object.entries(availableLanguages).map(([code, name]): JSX.Element => (
                                            <MenuItem 
                                                key={code}
                                                onClick={(): void => handleLanguageChange(code)}
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
                                        onChange={(e): void => {
                                            const value = parseInt(e.target.value, 10);
                                            // Immediately update local state
                                            setPollingInterval(value);
                                            
                                            // Save settings to backend
                                            void window.api.saveStoreSetting('pollingInterval', value);
                                            
                                            // Update slider UI
                                            window.requestAnimationFrame((): void => {
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
                                onClick={(): Promise<void> => handleTraySettingChange('minimizeToTray', !traySettings.minimizeToTray)}
                            >
                                {t('settings.minimizeToTray')}
                            </MenuItem>
                            <MenuItem 
                                isToggle={true} 
                                isChecked={traySettings.backgroundStart}
                                onClick={(): Promise<void> => handleTraySettingChange('backgroundStart', !traySettings.backgroundStart)}
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
            <div className="flex relative">            {/* Left navigation menu */}
            <div className="w-64 p-4 border-r border-gray-200 dark:border-gray-700">
                <div className="space-y-1">
                    {connectedDevices.length > 0 ? (
                        getSettingTabs().map((tab): JSX.Element => (
                            <LeftMenuItem 
                                key={tab.id}
                                active={activeSettingTab === tab.id}
                                onClick={(): void => handleSettingTabChange(tab.id)}
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
                        connectedDevices.map((device, index): JSX.Element => (
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
                
                {/* Save status display - positioned absolutely on top-right of content */}
                {saveStatus?.visible && (
                    <div className={`absolute top-1 right-4 p-2 text-sm transition-opacity duration-300 z-10 ${
                        saveStatus.success 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                    }`}>
                        {saveStatus.success 
                            ? t('common.saveComplete') 
                            : t('common.saveError')}
                    </div>
                )}
            </div>
            
            {/* Updates Notification Modal */}
            <UpdatesNotificationModal 
                isOpen={isUpdatesNotificationModalOpen}
                onClose={(): void => setIsUpdatesNotificationModalOpen(false)}
                updates={updates}
            />
            
            {/* Version Modal */}
            <VersionModal
                isOpen={isVersionModalOpen}
                onClose={(): void => setIsVersionModalOpen(false)}
            />
        </div>
    )
}

export default SettingsContainer
