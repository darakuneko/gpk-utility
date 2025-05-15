const { contextBridge, ipcRenderer } = require('electron');

let cachedDeviceRegistry = [];
let keyboardPollingInterval = null;
let windowMonitoringInterval = null;
// Store settings cache
let cachedStoreSettings = {
    autoLayerSettings: {},
    oledSettings: {},
    pomodoroNotificationsSettings: {},
    traySettings: {
        minimizeToTray: true,
        backgroundStart: false
    },
    pollingInterval: 1000, // Default polling interval: 1000ms
    locale: 'en'
};

// Get current polling interval from settings or use default
const getPollingInterval = () => {
    return cachedStoreSettings.pollingInterval || 1000;
};

// Function to start keyboard polling at regular intervals
const startKeyboardPolling = () => {
    if (keyboardPollingInterval) {
        clearInterval(keyboardPollingInterval);
    }
    
    // Set up interval using the current polling interval setting
    keyboardPollingInterval = setInterval(async () => {
        await keyboardSendLoop();
    }, getPollingInterval());
};

// Function to start window monitoring at faster intervals
const startWindowMonitoring = () => {
    if (windowMonitoringInterval) {
        clearInterval(windowMonitoringInterval);
    }
    
    // Set up interval for regular execution (200 milliseconds by default)
    windowMonitoringInterval = setInterval(async () => {
        await command.startWindowMonitoring();
    }, getPollingInterval());
};

// Load store settings from main process
const loadStoreSettings = async () => {
    try {
        const result = await ipcRenderer.invoke('getAllStoreSettings');
        if (result.success) {
            cachedStoreSettings = result.settings;
        }
    } catch (err) {
        console.error("Error loading store settings:", err);
    }
};

// Save store setting and update cache
const saveStoreSetting = async (key, value) => {
    try {
        const result = await ipcRenderer.invoke('saveStoreSetting', { key, value });
        if (result.success) {
            // Update local cache
            cachedStoreSettings[key] = value;
            
            // If polling interval is changed, restart polling with new interval
            if (key === 'pollingInterval') {
                restartPollingWithNewInterval(value);
            }
        }
        return result;
    } catch (err) {
        console.error(`Error saving store setting ${key}:`, err);
        return { success: false, error: err.message };
    }
};

// Function to restart polling with a new interval
const restartPollingWithNewInterval = (newInterval) => {
    // 即時実行フラグを設定
    const immediateExecution = true;
    
    // Restart keyboard polling with new interval
    if (keyboardPollingInterval) {
        clearInterval(keyboardPollingInterval);
    }
    keyboardPollingInterval = setInterval(async () => {
        await keyboardSendLoop();
    }, newInterval);
    
    // Restart window monitoring with new interval (1/5 of keyboard polling)
    if (windowMonitoringInterval) {
        clearInterval(windowMonitoringInterval);
    }
    windowMonitoringInterval = setInterval(async () => {
        await command.startWindowMonitoring();
    }, newInterval);
    
    // 即時実行で一度だけ実行して新しい間隔をすぐに反映
    if (immediateExecution) {
        // 非同期で実行して待機しない
        setTimeout(async () => {
            await keyboardSendLoop();
            await command.startWindowMonitoring();
        }, 0);
    }
};

// Initialize polling and settings when the window is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await loadStoreSettings();
    startKeyboardPolling();
    startWindowMonitoring();
});

const command = {
    start: async (device) => await ipcRenderer.invoke('start', device),
    stop: async (device) => await ipcRenderer.invoke('stop', device),
    close: async () => await ipcRenderer.invoke('close'),
    sleep: async (msec) => await ipcRenderer.invoke('sleep', msec),
    encodeDeviceId: async (device) => await ipcRenderer.invoke('encodeDeviceId', device),
    getKBDList: async () => await ipcRenderer.invoke('getKBDList'),
    changeConnectDevice: (dat) => ipcRenderer.send("changeConnectDevice", dat),
    getConnectKbd: async (id) => await ipcRenderer.invoke('getConnectKbd', id),
    getDeviceConfig: async (device) => await ipcRenderer.invoke('getDeviceConfig', device),
    getPomodoroConfig: async (device) => await ipcRenderer.invoke('getPomodoroConfig', device),
    setActiveTab: async (device, tabName) => await ipcRenderer.invoke('setActiveTab', device, tabName),
    setEditingPomodoro: async (device, isEditing) => await ipcRenderer.invoke('setEditingPomodoro', device, isEditing),
    startWindowMonitoring: async () => await ipcRenderer.invoke('startWindowMonitoring'),
    getActiveWindows: async () => await ipcRenderer.invoke('getActiveWindows'),
    dateTimeOledWrite: async (device) => await ipcRenderer.invoke('dateTimeOledWrite', device),
    getGpkRCInfo: async (device) => await ipcRenderer.invoke('getGpkRCInfo', device),
    sendDeviceConfig: async (device) => await ipcRenderer.invoke('sendDeviceConfig', device),
    setSliderActive: (active) => {
        isSliderActive = active;
        if (active) {
            activeSliderDeviceId = null;
        }
    },
    exportFile: async (data) => await ipcRenderer.invoke('exportFile', data),
    importFile: async (filename) => await ipcRenderer.invoke('importFile', filename),
}

const keyboardSendLoop = async () => {
    try {
        const kbdList = await command.getKBDList();
        const connectedIds = new Set(kbdList.map(device => device.id));
        
        // Filter out disconnected devices from cachedDeviceRegistry
        const disconnectedDeviceIds = [];
        cachedDeviceRegistry.forEach(device => {
            if (device.connected && !connectedIds.has(device.id)) {
                ipcRenderer.send('deviceDisconnected', device.id);
                disconnectedDeviceIds.push(device.id);
            }
        });
        
        // Remove disconnected devices from cachedDeviceRegistry
        if (disconnectedDeviceIds.length > 0) {
            cachedDeviceRegistry = cachedDeviceRegistry.filter(device => !disconnectedDeviceIds.includes(device.id));
            // Notify UI of the updated device list
            command.changeConnectDevice(cachedDeviceRegistry);
        }
        
        // Add new devices
        kbdList.forEach(device => {
            if (!cachedDeviceRegistry.find(cd => cd.id === device.id)) {
                cachedDeviceRegistry.push(device);
            }
        });       

        // Process each device
        const results = await Promise.all(cachedDeviceRegistry.map(async (device) => {
            const connectKbd = await command.getConnectKbd(device.id);

            // Handle disconnected device - remove it completely
            if (!connectKbd && device.connected) {
                ipcRenderer.send('deviceDisconnected', device.id);
                // Device will be removed on the next loop iteration
                device.checkDevice = false;
                return device;
            }

            // Handle device that needs initialization
            if (!connectKbd) {
                await command.start(device);
            } else {
                const existConfingInit = device.config?.init;
                const existConfingOledEnabled = device.config?.oled_enabled;
                const existCheckDevice = device.checkDevice

                if(!existConfingOledEnabled && !existConfingInit && !existCheckDevice) {
                    device.checkDevice = true
                    await command.getDeviceConfig(device);
                }
                // Handle connected device with configuration
                if (device.config) {
                    const oled_enabled = device.config?.oled_enabled === 1;
                    const pomodoro_timer_active = device.config?.pomodoro_timer_active === 1;
                    if (oled_enabled) {
                        await command.dateTimeOledWrite(device);
                    }
                    if (pomodoro_timer_active) {
                        await command.getPomodoroConfig(device);
                    }
                }
            }
            return device;
        })) 
        cachedDeviceRegistry = results        
    } catch (err) {
        console.error("Error in keyboardSendLoop:", err);
    }
}

ipcRenderer.on("deviceConnectionStateChanged", (event, { deviceId, connected, gpkRCVersion, deviceType, config }) => {
    const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
    const device = cachedDeviceRegistry[deviceIndex];

    // Only update if connection status changes or command version changes
    let changed = false;
    if(device) {
        if (device.connected !== connected){
            cachedDeviceRegistry[deviceIndex].connected = connected;
            changed = true;
        } 
        if(device.gpkRCVersion !== gpkRCVersion) {
            cachedDeviceRegistry[deviceIndex].gpkRCVersion = gpkRCVersion;
            changed = true;
        }
        if(device.deviceType !== deviceType) {
            cachedDeviceRegistry[deviceIndex].deviceType = deviceType;
            changed = true;
        }
        if(device.config !== config) {
            cachedDeviceRegistry[deviceIndex].config = config;
            changed = true;
        }
    }
    if(changed) {
        command.changeConnectDevice(cachedDeviceRegistry);
    }
});

// Event listener for when OLED settings are changed
ipcRenderer.on("oledSettingsChanged", (event, { deviceId, enabled }) => {
    const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
    if (deviceIndex !== -1) {
        if (!cachedDeviceRegistry[deviceIndex].config) {
            cachedDeviceRegistry[deviceIndex].config = {};
        }
        cachedDeviceRegistry[deviceIndex].config.oled_enabled = enabled ? 1 : 0;
        command.changeConnectDevice(cachedDeviceRegistry);
        // Send device configuration update to server
        command.sendDeviceConfig(cachedDeviceRegistry[deviceIndex]);
    }
});

ipcRenderer.on("deviceConnectionStatePomodoroChanged", (event, { deviceId, pomodoroConfig, stateChanged }) => {     
    const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
    if (deviceIndex === -1) return;
    
    // Save existing notification settings before updating other values
    const notificationsEnabled = cachedDeviceRegistry[deviceIndex].config.pomodoro_notifications_enabled;
    
    // Check old timer active state
    const oldTimerActive = cachedDeviceRegistry[deviceIndex].config.pomodoro_timer_active;

    // Update cached values
    cachedDeviceRegistry[deviceIndex].config.pomodoro_work_time = pomodoroConfig.pomodoro_work_time;
    cachedDeviceRegistry[deviceIndex].config.pomodoro_break_time = pomodoroConfig.pomodoro_break_time;
    cachedDeviceRegistry[deviceIndex].config.pomodoro_long_break_time = pomodoroConfig.pomodoro_long_break_time;
    cachedDeviceRegistry[deviceIndex].config.pomodoro_cycles = pomodoroConfig.pomodoro_cycles;
    cachedDeviceRegistry[deviceIndex].config.pomodoro_timer_active = pomodoroConfig.pomodoro_timer_active;    
    cachedDeviceRegistry[deviceIndex].config.pomodoro_state = pomodoroConfig.pomodoro_state;
    cachedDeviceRegistry[deviceIndex].config.pomodoro_minutes = pomodoroConfig.pomodoro_minutes;
    cachedDeviceRegistry[deviceIndex].config.pomodoro_seconds = pomodoroConfig.pomodoro_seconds;
    cachedDeviceRegistry[deviceIndex].config.pomodoro_current_cycle = pomodoroConfig.pomodoro_current_cycle;  
    
    // Restore notification settings
    if (notificationsEnabled !== undefined) {
        cachedDeviceRegistry[deviceIndex].config.pomodoro_notifications_enabled = notificationsEnabled;
    } else if (pomodoroConfig.pomodoro_notifications_enabled !== undefined) {
        cachedDeviceRegistry[deviceIndex].config.pomodoro_notifications_enabled = pomodoroConfig.pomodoro_notifications_enabled;
    }

    command.changeConnectDevice(cachedDeviceRegistry);
    
    // Check if timer active state changed
    const newTimerActive = pomodoroConfig.pomodoro_timer_active === 1;
    const timerActiveStateChanged = (oldTimerActive === 1) !== newTimerActive;

    // Send notification to main process when state changes and timer is active
    // Only trigger notification if stateChanged flag is true and timer is active
    if (stateChanged && pomodoroConfig.pomodoro_timer_active === 1) {
        // Immediately get fresh notification setting from stored config
        (async () => {
            try {
                // Get real deviceId for proper settings lookup
                const result = await ipcRenderer.invoke('loadPomodoroNotificationSettings', deviceId);
                const notificationsEnabled = result.success ? result.enabled : true;
                
                // Only send notification if notifications are enabled
                if (notificationsEnabled) {
                    // Get device name properly, fallback to product name or 'Keyboard'
                    const deviceName = cachedDeviceRegistry[deviceIndex].product || cachedDeviceRegistry[deviceIndex].name || 'Keyboard';
                    const newState = pomodoroConfig.pomodoro_state;
                    let minutes = 0;
                    
                    // Determine the phase minutes
                    switch (newState) {
                        case 1: // Work state
                            minutes = pomodoroConfig.pomodoro_work_time;
                            break;
                        case 2: // Break state
                            minutes = pomodoroConfig.pomodoro_break_time;
                            break;
                        case 3: // Long break state
                            minutes = pomodoroConfig.pomodoro_long_break_time;
                            break;
                    }
                    
                    ipcRenderer.send('pomodoroStateChanged', {
                        deviceName: deviceName,
                        deviceId: deviceId,
                        state: newState,
                        minutes: minutes
                    });
                }
            } catch (error) {
                console.error("Error checking notification settings:", error);
            }
        })();
    }
    
    // Forward the pomodoro state change to main process for tray updates
    // Make sure to use stateChanged here to match the parameter name in index.js
    ipcRenderer.send('deviceConnectionStatePomodoroChanged', {
        deviceId: deviceId,
        pomodoroConfig: pomodoroConfig,
        stateChanged: stateChanged || timerActiveStateChanged  // Include timer active state changes
    });
});

ipcRenderer.on("configUpdated", (event, { deviceId, config, identifier }) => {
    const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
    if (deviceIndex !== -1) {
        cachedDeviceRegistry[deviceIndex].config = { ...config };
        command.changeConnectDevice(cachedDeviceRegistry);
    }
});

contextBridge.exposeInMainWorld("api", {
    // Core device functions
    start: async (device) => await command.start(device),
    stop: async (device) => await command.stop(device),
    getGpkRCInfo: async (device) => await command.getGpkRCInfo(device),
    sendDeviceConfig: async (device) => await command.sendDeviceConfig(device),
    getDeviceConfig: async (device) => await ipcRenderer.invoke('getDeviceConfig', device),
    getPomodoroConfig: async (device) => await ipcRenderer.invoke('getPomodoroConfig', device),
    sleep: async (msec) => await ipcRenderer.invoke('sleep', msec),
    setActiveTab: async (device, tabName) => await ipcRenderer.invoke('setActiveTab', device, tabName),
    setEditingPomodoro: async (device, isEditing) => await ipcRenderer.invoke('setEditingPomodoro', device, isEditing),
    getActiveWindows: async () => await command.getActiveWindows(),
    setSliderActive: (active) => command.setSliderActive(active),
    
    // Import/Export
    exportFile: async () => {
        try {
            // Create a copy of the device registry to modify
            const devicesToExport = JSON.parse(JSON.stringify(cachedDeviceRegistry));
            
            // Apply store settings to each device
            await Promise.all(devicesToExport.map(async (device) => {
                if (!device.config) {
                    device.config = {};
                }
                
                // Apply auto layer settings if they exist for this device
                const autoLayerSettings = cachedStoreSettings.autoLayerSettings || {};
                if (autoLayerSettings[device.id]) {
                    device.config.auto_layer_enabled = autoLayerSettings[device.id].enabled ? 1 : 0;
                    device.config.auto_layer_settings = autoLayerSettings[device.id].layerSettings || [];
                }
                
                // Apply OLED settings
                const oledSettings = cachedStoreSettings.oledSettings || {};
                if (oledSettings[device.id]) {
                    device.config.oled_enabled = oledSettings[device.id].enabled ? 1 : 0;
                }
                
                // Apply pomodoro notification settings
                const pomodoroNotifSettings = cachedStoreSettings.pomodoroNotificationsSettings || {};
                if (pomodoroNotifSettings[device.id] !== undefined) {
                    device.config.pomodoro_notifications_enabled = pomodoroNotifSettings[device.id];
                }
            }));
            
            // Create a complete export object with all settings
            const exportData = {
                devices: devicesToExport,
                appSettings: {
                    traySettings: cachedStoreSettings.traySettings || {},
                    locale: cachedStoreSettings.locale || 'en'
                }
            };
            
            // Export the enhanced data
            return await command.exportFile(exportData);
        } catch (err) {
            console.error("Error in exportFile:", err);
            return { success: false, error: err.message };
        }
    },
    importFile: async () => {
        try {
            const dat = await command.importFile();
            if (!dat) {
                return { success: false, message: "No file was imported" };
            }
            
            try {
                let json = JSON.parse(dat);
                
                // Handle new format (object with devices and appSettings) or legacy format (array of devices)
                const isNewFormat = json.devices && Array.isArray(json.devices);
                const devices = isNewFormat ? json.devices : json;
                const appSettings = isNewFormat ? json.appSettings : null;
                
                if (!Array.isArray(devices)) {
                    return { success: false, error: "Invalid file format: devices data must be an array" };
                }
                
                // Process application settings if available
                if (appSettings) {
                    try {
                        // Import tray settings
                        if (appSettings.traySettings) {
                            await saveStoreSetting('traySettings', appSettings.traySettings);
                        }
                        
                        // Import locale
                        if (appSettings.locale) {
                            await saveStoreSetting('locale', appSettings.locale);
                        }
                    } catch (appSettingsErr) {
                        console.error("Error importing application settings:", appSettingsErr);
                    }
                }
                
                // Extract store settings from imported devices
                let autoLayerSettings = { ...cachedStoreSettings.autoLayerSettings } || {};
                let oledSettings = { ...cachedStoreSettings.oledSettings } || {};
                let pomodoroNotifSettings = { ...cachedStoreSettings.pomodoroNotificationsSettings } || {};
                
                // Process each device
                const updatedDevices = await Promise.all(cachedDeviceRegistry.map(async (cd) => {
                    const matchingConfig = devices.find((j) =>
                        j.id === cd.id &&
                        j.manufacturer === cd.manufacturer &&
                        j.product === cd.product &&
                        j.productId === cd.productId &&
                        j.vendorId === cd.vendorId
                    );
                    
                    if (matchingConfig) {
                        try {
                            // Extract settings before sending to device
                            if (matchingConfig.config) {
                                // Process auto layer settings
                                if (matchingConfig.config.auto_layer_enabled !== undefined ||
                                    matchingConfig.config.auto_layer_settings) {
                                    
                                    // Initialize settings object for this device if needed
                                    if (!autoLayerSettings[cd.id]) {
                                        autoLayerSettings[cd.id] = {
                                            enabled: false,
                                            layerSettings: []
                                        };
                                    }
                                    
                                    // Update settings if they exist in the imported file
                                    if (matchingConfig.config.auto_layer_enabled !== undefined) {
                                        autoLayerSettings[cd.id].enabled = 
                                            matchingConfig.config.auto_layer_enabled === 1;
                                    }
                                    
                                    if (matchingConfig.config.auto_layer_settings) {
                                        autoLayerSettings[cd.id].layerSettings = 
                                            matchingConfig.config.auto_layer_settings;
                                    }
                                }
                                
                                // Process OLED settings
                                if (matchingConfig.config.oled_enabled !== undefined) {
                                    if (!oledSettings[cd.id]) {
                                        oledSettings[cd.id] = {};
                                    }
                                    oledSettings[cd.id].enabled = matchingConfig.config.oled_enabled === 1;
                                }
                                
                                // Process pomodoro notification settings
                                if (matchingConfig.config.pomodoro_notifications_enabled !== undefined) {
                                    pomodoroNotifSettings[cd.id] = matchingConfig.config.pomodoro_notifications_enabled;
                                }
                            }
                            
                            // Send device config (device hardware settings only)
                            await command.sendDeviceConfig(matchingConfig);
                            
                            // Return the updated device config
                            return matchingConfig;
                        } catch (err) {
                            console.error(`Error applying config to device ${cd.id}:`, err);
                            return cd;
                        }
                    }
                    
                    return cd;
                }));
                
                // Save all updated settings at once
                await saveStoreSetting('autoLayerSettings', autoLayerSettings);
                await saveStoreSetting('oledSettings', oledSettings);
                await saveStoreSetting('pomodoroNotificationsSettings', pomodoroNotifSettings);
                
                // Update cached device registry
                cachedDeviceRegistry = updatedDevices;
                command.changeConnectDevice(cachedDeviceRegistry);
                
                return { success: true, devicesUpdated: updatedDevices.length };
            } catch (parseErr) {
                console.error("JSON parse error:", parseErr);
                return { success: false, error: "Invalid JSON format" };
            }
        } catch (err) {
            console.error("Import file error:", err);
            return { success: false, error: err.message || "Unknown error during import" };
        }
    },
    
    // Unified store settings API
    getStoreSetting: (key) => {
        return cachedStoreSettings[key];
    },
    saveStoreSetting: async (key, value) => {
        return await saveStoreSetting(key, value);
    },
    getAllStoreSettings: () => {
        return cachedStoreSettings;
    },
    
    // Legacy API for backward compatibility
    saveAutoLayerSettings: async (settings) => {
        return await saveStoreSetting('autoLayerSettings', settings);
    },
    loadAutoLayerSettings: async () => {
        return { success: true, settings: cachedStoreSettings.autoLayerSettings || {} };
    },
    saveOledSettings: async (deviceId, enabled) => {
        const current = cachedStoreSettings.oledSettings || {};
        current[deviceId] = { enabled };
        return await saveStoreSetting('oledSettings', current);
    },
    loadOledSettings: async (deviceId) => {
        const settings = cachedStoreSettings.oledSettings || {};
        return { success: true, enabled: settings[deviceId]?.enabled };
    },
    saveTraySettings: async (settings) => {
        return await saveStoreSetting('traySettings', settings);
    },
    loadTraySettings: async () => {
        return { 
            success: true, 
            minimizeToTray: cachedStoreSettings.traySettings?.minimizeToTray,
            backgroundStart: cachedStoreSettings.traySettings?.backgroundStart
        };
    },
    setAppLocale: async (locale) => {
        return await saveStoreSetting('locale', locale);
    },
    savePomodoroNotificationSettings: async (deviceId, enabled) => {
        const current = cachedStoreSettings.pomodoroNotificationsSettings || {};
        current[deviceId] = enabled;
        return await saveStoreSetting('pomodoroNotificationsSettings', current);
    },
    loadPomodoroNotificationSettings: async (deviceId) => {
        const settings = cachedStoreSettings.pomodoroNotificationsSettings || {};
        return { 
            success: true, 
            enabled: settings[deviceId] !== undefined ? settings[deviceId] : true
        };
    },
    on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    off: (channel, func) => {
        ipcRenderer.removeListener(channel, func);
    }
});

// Cleanup handlers
process.on('exit', () => {
    if (keyboardPollingInterval) {
        clearInterval(keyboardPollingInterval);
    }
    if (windowMonitoringInterval) {
        clearInterval(windowMonitoringInterval);
    }
});