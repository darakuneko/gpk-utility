import React, { useState, useEffect, useRef } from "react"
import SettingEdit from "./settingEdit.js"
import { useStateContext, useDeviceType } from "../context.js"
import { useLanguage } from "../i18n/LanguageContext.js"
import { CustomSlider } from "../components/CustomComponents.js"

// Hamburger menu icon component
const HamburgerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
)

// Menu item component with optional toggle support
const MenuItem = ({ onClick, children, isToggle = false, isChecked = false }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
  >
    <span>{children}</span>
    {isToggle && (
      <div className={`w-10 h-5 rounded-full p-1 ${isChecked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} transition-colors duration-200 ease-in-out`}>
        <div className={`bg-white dark:bg-gray-200 w-3 h-3 rounded-full transform transition-transform duration-200 ease-in-out ${isChecked ? 'translate-x-5' : 'translate-x-0'}`}></div>
      </div>
    )}
  </button>
)

// Left menu item component
const LeftMenuItem = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 mb-1 text-sm font-medium rounded-md transition-colors ${
      active 
        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" 
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
    }`}
  >
    {children}
  </button>
)

const getSupportedSettingTabs = (device, t, DeviceType) => {
    if (!device || !DeviceType) return [];

    const tabs = {
        layer: { id: "layer", label: t('tabs.layer') },
        oled: { id: "oled", label: t('tabs.oled') },
        mouse: { id: "mouse", label: t('tabs.mouse') },
        scroll: { id: "scroll", label: t('tabs.scroll') },
        dragdrop: { id: "dragdrop", label: t('tabs.dragDrop') },
        gesture: { id: "gesture", label: t('tabs.gesture') },
        timer: { id: "timer", label: t('tabs.timer') }
    };

    // 共通セット
    const tpTabs = [
        tabs.mouse, tabs.scroll, tabs.dragdrop, tabs.gesture, tabs.layer, tabs.timer
    ];

    const tabDefinitions = {
        [DeviceType.MACROPAD_TP]: tpTabs,
        [DeviceType.MACROPAD_TP_BTNS]: [...tpTabs.slice(0, 2), tabs.dragdrop, ...tpTabs.slice(2)],
        [DeviceType.KEYBOARD_TP]: tpTabs,
        [DeviceType.KEYBOARD_OLED]: [tabs.layer, tabs.oled]
    };
    return tabDefinitions[device.deviceType] || [tabs.layer];
};

const SettingsContainer = (() => {
    const {state, dispatch} = useStateContext();
    const DeviceType = useDeviceType();
    const { t, locale, changeLocale, isLoading } = useLanguage();
    
    const [activeDeviceId, setActiveDeviceId] = useState(null)
    const [activeSettingTab, setActiveSettingTab] = useState("mouse")
    const [menuOpen, setMenuOpen] = useState(false)
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
    const [traySettings, setTraySettings] = useState({
        minimizeToTray: true,
        backgroundStart: false
    })
    const [pollingInterval, setPollingInterval] = useState(() => window.api.getStoreSetting('pollingInterval') || 1000)
    const pollingIntervalRef = useRef(pollingInterval)

    // Available languages
    const availableLanguages = {
        en: 'English'
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
                    setActiveSettingTab(getSupportedSettingTabs(connectedDevices[0], t)[0]?.id || "layer");
                }
            } else if (connectedDevices.length === 0 && activeDeviceId) {
                // Reset activeDeviceId if there are no connected devices
                setActiveDeviceId(null);
            }
        };
        
        checkDevices();
    }, [connectedDevices, activeDeviceId, state.devices, dispatch, t]);

    // Setup listeners for configUpdated event
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
        
        return () => {};
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

    // Set active setting tab and notify API
    const handleSettingTabChange = (tabId) => {
        setActiveSettingTab(tabId);
        const device = getActiveDevice();
        if (device) {
            window.api.setActiveTab(device, tabId);
        }
    }

    if (!state.devices || state.devices.length === 0) {
        return (
            <div className="bg-card-bg dark:bg-card-bg rounded-lg shadow-sm p-8">
                <div className="text-center text-gray-600 dark:text-gray-400">
                    <p className="text-lg mb-2">
                        {isLoading 
                            ? "No devices connected" 
                            : t('header.noDevices', "No devices connected")
                        }
                    </p>
                    <p className="text-sm">
                        Please connect a compatible device and ensure it is recognized by your system.
                    </p>
                </div>
            </div>
        )
    }

    if (connectedDevices.length === 0) {
        return (
            <div className="bg-card-bg dark:bg-card-bg rounded-lg shadow-sm p-8">
                <div className="text-center text-gray-600 dark:text-gray-400">
                    <p className="text-lg mb-2">{t('header.connecting')}</p>
                    <p className="text-sm">
                        Please connect a compatible device to configure settings.
                    </p>
                </div>
            </div>
        )
    }

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
                                // When switching devices, select the first available settings tab for that device
                                const supportedTabs = getSupportedSettingTabs(device, t);
                                if (supportedTabs.length > 0) {
                                    setActiveSettingTab(supportedTabs[0].id);
                                    window.api.setActiveTab(device, supportedTabs[0].id);
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
                                        <span className="text-sm text-gray-500 ml-auto">{availableLanguages[locale]}</span>
                                    </div>
                                </MenuItem>
                                
                                {/* Language Submenu */}
                                {languageMenuOpen && (
                                    <div className="absolute left-full top-0 mt-0 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md z-20 border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                                            pollingIntervalRef.current = value;
                                            
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
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('settings.pollingIntervalDescription')}
                                </p>
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
                        </div>
                    )}
                </div>
            </div>
            
            {/* Two-column layout */}
            <div className="flex">            {/* Left navigation menu */}
            <div className="w-64 p-4 border-r border-gray-200 dark:border-gray-700">
                <div className="space-y-1">
                    {getSettingTabs().map((tab) => (
                        <LeftMenuItem 
                            key={tab.id}
                            active={activeSettingTab === tab.id}
                            onClick={() => handleSettingTabChange(tab.id)}
                        >
                            {tab.label}
                        </LeftMenuItem>
                    ))}
                </div>
            </div>
                
                {/* Right settings content area */}
                <div className="flex-1 p-4">
                    {connectedDevices.map((device, index) => (
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
                    ))}
                </div>
            </div>
        </div>
    )
})

export default SettingsContainer
