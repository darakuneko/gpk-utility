import React, { useState, useEffect } from "react"
import SettingEdit from "./settingEdit.js"
import { useStateContext } from "../context.js"

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

const getSupportedSettingTabs = (device) => {
    if (!device) return [];   

    const isTrackpad = device.deviceType === "trackpad"
    if (isTrackpad) {
        const eixst_pomodoro_work_time = device.config?.pomodoro_work_time 
        return [
            { id: "mouse", label: "Mouse" },
            { id: "scroll", label: "Scroll" },
            ...(device.product !== "NumNum Bento MAX" ? [{ id: "dragdrop", label: "Drag & Drop" }] : []),
            { id: "layer", label: "Layer" },
            ...(eixst_pomodoro_work_time ? [ { id: "timer", label: "Timer" }] : []),
        ];
    } else {
        return [
            { id: "layer", label: "Layer" },
            { id: "oled", label: "OLED" }
        ];
    }
};

const Setting = (() => {
    const {state, dispatch} = useStateContext()
    const [activeDeviceId, setActiveDeviceId] = useState(null)
    const [activeSettingTab, setActiveSettingTab] = useState("mouse")
    const [menuOpen, setMenuOpen] = useState(false) 
    const [isLoading, setIsLoading] = useState(true)
    const [retryCount, setRetryCount] = useState(0)
    const [traySettings, setTraySettings] = useState({
        minimizeToTray: true,
        backgroundStart: false
    })

    // Filter connected devices only
    const connectedDevices = state.devices ? state.devices.filter(d => d.connected && d.gpkRCVersion === 1) : []
    
    // Loading state management
    useEffect(() => {
        if (state.devices) {
            setIsLoading(false);
        }
    }, [state.devices]);
    
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
                    setActiveSettingTab(getSupportedSettingTabs(connectedDevices[0])[0]?.id || "layer");
                }
            } else if (state.devices && state.devices.length > 0 && retryCount < 3) {
                setRetryCount(prev => prev + 1);
                setTimeout(() => {
                    if (window.api && window.api.keyboardSendLoop) {
                        window.api.keyboardSendLoop().then(devices => {
                            if (Array.isArray(devices) && devices.some(d => d.connected)) {
                                dispatch({
                                    type: "SET_DEVICES",
                                    payload: devices
                                });
                            }
                        }).catch(err => {
                            // Error handling
                        });
                    }
                }, 1000);
            } else if (connectedDevices.length === 0 && activeDeviceId) {
                // Reset activeDeviceId if there are no connected devices
                setActiveDeviceId(null);
            }
        };
        
        checkDevices();
    }, [connectedDevices, activeDeviceId, state.devices, retryCount, dispatch]);

    // Setup listeners for configUpdated event
    useEffect(() => {
        
        window.api.on("configUpdated", ({ deviceId, config }) => {
            dispatch({
                type: "UPDATE_DEVICE_CONFIG",
                payload: { deviceId, config }
            });
        });
        
        window.api.on("pomodoroStateUpdated", ({ deviceId, config }) => {
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

    // Get current active device
    const getActiveDevice = () => {
        return connectedDevices.find(d => d.id === activeDeviceId) || null;
    }

    // Get setting tabs for current device
    const getSettingTabs = () => {
        const device = getActiveDevice();
        return getSupportedSettingTabs(device);
    }

    // Handler to close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuOpen && !event.target.closest('.menu-container')) {
                setMenuOpen(false)
            }
        }
        
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [menuOpen])

    // Set active setting tab and notify API
    const handleSettingTabChange = (tabId) => {
        setActiveSettingTab(tabId);
        const device = getActiveDevice();
        if (device) {
            window.api.setActiveTab(device, tabId);
            
            if (activeSettingTab === "timer" && tabId !== "timer") {
                window.api.setEditingPomodoro(device, false);
            }
        }
    }

    if (!state.devices || state.devices.length === 0) {
        return (
            <div className="bg-card-bg dark:bg-card-bg rounded-lg shadow-sm p-8">
                <div className="text-center text-gray-600 dark:text-gray-400">
                    <p className="text-lg mb-2">No devices found</p>
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
                    <p className="text-lg mb-2">No connected devices</p>
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
                                const supportedTabs = getSupportedSettingTabs(device);
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
                            <MenuItem onClick={handleImport}>Import Settings</MenuItem>
                            <MenuItem onClick={handleExport}>Export Settings</MenuItem>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            <MenuItem 
                                isToggle={true} 
                                isChecked={traySettings.minimizeToTray}
                                onClick={() => handleTraySettingChange('minimizeToTray', !traySettings.minimizeToTray)}
                            >
                                Minimize to tray when closed
                            </MenuItem>
                            <MenuItem 
                                isToggle={true} 
                                isChecked={traySettings.backgroundStart}
                                onClick={() => handleTraySettingChange('backgroundStart', !traySettings.backgroundStart)}
                            >
                                Start minimized to tray
                            </MenuItem>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Two-column layout */}
            <div className="flex">
                {/* Left navigation menu */}
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

export default Setting
