const { contextBridge, ipcRenderer } = require('electron');

let cachedDeviceRegistry = [];
let keyboardPollingInterval = null;
let windowMonitoringInterval = null;

// Device processing lock mechanism to prevent concurrent processing
const deviceProcessingLocks = new Map();

// Store settings cache
let cachedStoreSettings = {
    autoLayerSettings: {},
    oledSettings: {},
    pomodoroDesktopNotificationsSettings: {},
    savedNotifications: [],
    traySettings: {
        minimizeToTray: true,
        backgroundStart: false
    },
    pollingInterval: 1000, // Default polling interval: 1000ms
    locale: 'en'
};

// Device processing lock functions to prevent concurrent processing
const lockDeviceProcessing = (deviceId) => {
    if (deviceProcessingLocks.has(deviceId)) {
        return false; // Already locked
    }
    deviceProcessingLocks.set(deviceId, true);
    return true; // Lock successful
};

const unlockDeviceProcessing = (deviceId) => {
    deviceProcessingLocks.delete(deviceId);
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
    
    const interval = getPollingInterval();
    
    // Set up interval using the current polling interval setting
    keyboardPollingInterval = setInterval(async () => {
        await keyboardSendLoop();
    }, interval);
};

// Function to start window monitoring at faster intervals
const startWindowMonitoring = () => {
    if (windowMonitoringInterval) {
        clearInterval(windowMonitoringInterval);
    }
    
    const interval = getPollingInterval();
    
    // Set up interval for regular execution
    windowMonitoringInterval = setInterval(async () => {
        await command.startWindowMonitoring();
    }, interval);
};

// Load store settings from main process
const loadStoreSettings = async () => {
    try {
        const result = await ipcRenderer.invoke('getAllStoreSettings');
        if (result.success) {
            cachedStoreSettings = result.settings;
        } else {
            console.error('[ERROR] loadStoreSettings: Failed to load settings');
        }
    } catch (err) {
        console.error("[ERROR] loadStoreSettings:", err);
    }
};

// Save store setting and update cache
const saveStoreSetting = async (key, value, deviceId = null) => {
    try {
        const result = await ipcRenderer.invoke('saveStoreSetting', { key, value });
        if (result.success) {
            // Update local cache
            cachedStoreSettings[key] = value;
            
            // Handle polling interval changes
            if (key === 'pollingInterval') {
                // Clear existing intervals
                if (keyboardPollingInterval) {
                    clearInterval(keyboardPollingInterval);
                }
                
                if (windowMonitoringInterval) {
                    clearInterval(windowMonitoringInterval);
                }
                
                // Restart polling with new interval
                startKeyboardPolling();
                startWindowMonitoring();
            }
            
            // If deviceId is provided, dispatch configSaveComplete event
            if (deviceId) {
                window.dispatchEvent(new CustomEvent('configSaveComplete', {
                    detail: {
                        deviceId,
                        success: true,
                        timestamp: Date.now()
                    }
                }));
            }
        }
        return result;
    } catch (err) {
        console.error(`[ERROR] saveStoreSetting ${key}:`, err);
        return { success: false, error: err.message };
    }
};

// Initialize polling and settings when the window is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadStoreSettings();
        startKeyboardPolling();
        startWindowMonitoring();
        
        const result = await command.getNotifications();
        const latestNotification = result?.notifications[0] || [];
        const savedNotifications = cachedStoreSettings?.savedNotifications || [];

        if (latestNotification?.id) {
            const isDifferent = !savedNotifications.length || !savedNotifications.some(n => n.id === latestNotification.id);
            if (isDifferent) {       
                await saveStoreSetting('savedNotifications', result.notifications);
                window.dispatchEvent(new CustomEvent('showUpdatesNotificationModal', {
                    detail: {
                        notifications: [latestNotification]
                    }
                }));
            }
        }
    } catch (error) {
        console.error("Error during initialization:", error);
    }
});

const command = {
    start: async (device) => {
        return await ipcRenderer.invoke('start', device);
    },
    stop: async (device) => {
        return await ipcRenderer.invoke('stop', device);
    },
    close: async () => await ipcRenderer.invoke('close'),
    sleep: async (msec) => await ipcRenderer.invoke('sleep', msec),
    encodeDeviceId: async (device) => await ipcRenderer.invoke('encodeDeviceId', device),
    getKBDList: async () => {
        const result = await ipcRenderer.invoke('getKBDList');
        return result;
    },
    changeConnectDevice: (dat) => {
        ipcRenderer.send("changeConnectDevice", dat);
    },
    getConnectKbd: async (id) => {
        return await ipcRenderer.invoke('getConnectKbd', id);
    },
    getDeviceConfig: async (device) => {
        return await ipcRenderer.invoke('getDeviceConfig', device);
    },
    getPomodoroConfig: async (device) => {
        return await ipcRenderer.invoke('getPomodoroConfig', device);
    },
    getPomodoroActiveStatus: async (device) => {
        return await ipcRenderer.invoke('getPomodoroActiveStatus', device);
    },
    getTrackpadConfigData: async (device) => {
        return await ipcRenderer.invoke('getTrackpadConfigData', device);
    },
    
    setActiveTab: async (device, tabName) => await ipcRenderer.invoke('setActiveTab', device, tabName),
    startWindowMonitoring: async () => await ipcRenderer.invoke('startWindowMonitoring'),
    getActiveWindows: async () => await ipcRenderer.invoke('getActiveWindows'),
    dateTimeOledWrite: async (device, forceWrite) => await ipcRenderer.invoke('dateTimeOledWrite', device, forceWrite),
    getDeviceInitConfig: async (device) => await ipcRenderer.invoke('getDeviceInitConfig', device),
    dispatchSaveDeviceConfig: async (deviceWithConfig, configTypes) => await ipcRenderer.invoke('dispatchSaveDeviceConfig', deviceWithConfig, configTypes),
    saveTrackpadConfig: async (device) => {
        if (device && device.config && device.config.trackpad) {
            try {
                return await ipcRenderer.invoke('saveTrackpadConfig', device);
            } catch (error) {
                console.error("Error sending trackpad config:", error);
                return { success: false, error: error.message };
            }
        } else {
            return { success: false, error: "Invalid device or missing trackpad configuration" };
        }
    },
    savePomodoroConfigData: async (device, pomodoroDataBytes) => {
        return await ipcRenderer.invoke('savePomodoroConfigData', device, pomodoroDataBytes);
    },

    setSliderActive: (active) => {
        isSliderActive = active;
        if (active) {
            activeSliderDeviceId = null;
        }
    },
    exportFile: async (data) => await ipcRenderer.invoke('exportFile', data),
    importFile: async (filename) => await ipcRenderer.invoke('importFile', filename),
    getNotifications: () => ipcRenderer.invoke('getNotifications')
}

const keyboardSendLoop = async () => {
    try {
        const kbdList = await command.getKBDList();
        const connectedIds = new Set(kbdList.map(device => device.id));

        // Update existing devices and add new ones
        kbdList.forEach(device => {
            const existingDevice = cachedDeviceRegistry.find(cd => cd.id === device.id);
            if (!existingDevice) {
                // New device detected - mark as connected
                device.connected = true;
                cachedDeviceRegistry.push(device);

            } else {
                // Check if device was previously disconnected and now reconnected
                if (existingDevice.connected === false) {

                    // Reset device state to force re-initialization
                    existingDevice.checkDevice = false;
                    existingDevice.config = null;
                    // Mark for restart to ensure clean initialization
                    existingDevice.needsRestart = true;
                }
                // Update device properties and mark as connected
                Object.assign(existingDevice, device);
                existingDevice.connected = true;
            }
        });

        // Mark disconnected devices and collect their IDs
        const disconnectedDeviceIds = [];
        cachedDeviceRegistry.forEach(device => {
            if (!connectedIds.has(device.id)) {
                if (device.connected !== false) {
                    ipcRenderer.send('deviceDisconnected', device.id);
                    disconnectedDeviceIds.push(device.id);
                    device.connected = false;
                    // Release lock for disconnected devices
                    unlockDeviceProcessing(device.id);
                }
            }
        });
        
        // Remove disconnected devices from cachedDeviceRegistry after a delay
        // This prevents UI flickering during temporary disconnections
        if (disconnectedDeviceIds.length > 0) {
            setTimeout(() => {
                cachedDeviceRegistry = cachedDeviceRegistry.filter(device => 
                    connectedIds.has(device.id) || device.connected !== false
                );
                command.changeConnectDevice(cachedDeviceRegistry);
            }, 2000); // 2 second delay
        }
        
        // Always notify UI of current device states
        command.changeConnectDevice(cachedDeviceRegistry);
        
        // Process each device with lock mechanism to prevent concurrent processing
        const results = await Promise.all(cachedDeviceRegistry.map(async (device) => {
            // Check device processing lock
            if (!lockDeviceProcessing(device.id)) {
                return device; // Skip if already being processed
            }

            try {
                const connectKbd = await command.getConnectKbd(device.id);

            // Handle device that needs restart (typically after reconnection)
            if (device.needsRestart) {
                try {
                    await command.stop(device);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay before restart

                    // Attempt to start device with retry logic
                    let startSuccess = false;
                    let startAttempts = 0;
                    const maxStartAttempts = 3;
                    
                    while (!startSuccess && startAttempts < maxStartAttempts) {
                        try {
                            await command.start(device);
                            startSuccess = true;
                        } catch (startError) {
                            startAttempts++;
                            console.warn(`Failed to start device ${device.id} (attempt ${startAttempts}/${maxStartAttempts}):`, startError.message);
                            
                            if (startAttempts < maxStartAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 1000 * startAttempts)); // Progressive delay
                            }
                        }
                    }
                    
                    if (startSuccess) {
                        await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay after restart
                        device.needsRestart = false;
                        // Force config retrieval after restart
                        device.checkDevice = false;
                        device.config = null;
                    } else {
                        console.error(`Failed to restart device ${device.id} after ${maxStartAttempts} attempts`);
                        device.connected = false; // Mark as disconnected if restart failed
                    }

                } catch (error) {
                    console.error(`Failed to restart device ${device.id}:`, error);
                    device.connected = false; // Mark as disconnected on error
                }
                return device;
            }
            
            // Handle device that needs initialization
            if (!connectKbd) {
                await command.start(device);
                // Add delay after starting new device (increased for reliability)
                await new Promise(resolve => setTimeout(resolve, 800)); // Increased from 800ms
            } else {
                const existConfingInit = device.config?.init;
                const existConfingOledEnabled = device.config?.oled_enabled;
                const existCheckDevice = device.checkDevice

                // Check if we need to get device config (for new devices or after restart)
                if(!existConfingOledEnabled && !existConfingInit && !existCheckDevice) {
                    device.checkDevice = true;
                    try {
                        // Add a longer delay to ensure device is ready for communication
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased 1000ms
                        await command.getDeviceConfig(device);

                    } catch (error) {
                        console.error(`Failed to get device config for ${device.id}:`, error);
                        // Reset device state if config retrieval fails
                        device.checkDevice = false;
                        device.config = null;
                        
                        // Mark device for restart on next iteration
                        device.needsRestart = true;
                    }
                }
                // Handle connected device with configuration
                if (device.config) {
                    const oled_enabled = device.config?.oled_enabled === 1;
                    const pomodoro_timer_active = device.config?.pomodoro?.timer_active === 1;
                    if (oled_enabled) {
                        try {
                            await command.dateTimeOledWrite(device);
                        } catch (error) {
                            console.error(`Failed to write OLED for device ${device.id}:`, error);
                        }
                    }
                    if (pomodoro_timer_active) {
                        try {
                            await command.getPomodoroActiveStatus(device);
                        } catch (error) {
                            console.error(`Failed to get pomodoro status for device ${device.id}:`, error);
                        }
                    }
                }
            }
            return device;
            } finally {
                // Release lock after processing completes
                unlockDeviceProcessing(device.id);
            }
        })); 
        cachedDeviceRegistry = results;        
    } catch (err) {
        console.error("[ERROR] keyboardSendLoop:", err);
    }
}

ipcRenderer.on("deviceConnectionStateChanged", (event, { deviceId, connected, gpkRCVersion, deviceType, config }) => {
    const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
    if (deviceIndex === -1) {
        return;
    }
    
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
        
        if (device.config !== config) {
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
        // Ensure config object exists with safe structure
        if (!cachedDeviceRegistry[deviceIndex].config) {
            cachedDeviceRegistry[deviceIndex].config = {
                pomodoro: {},
                trackpad: {},
                oled_enabled: 0
            };
        }
        cachedDeviceRegistry[deviceIndex].config.oled_enabled = enabled ? 1 : 0;
        command.changeConnectDevice(cachedDeviceRegistry);
    }
});

ipcRenderer.on("deviceConnectionPomodoroPhaseChanged", (event, { deviceId, pomodoroConfig, phaseChanged }) => {     
    const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
    if (deviceIndex === -1) return;
    
    // Ensure config object exists with safe structure
    if (!cachedDeviceRegistry[deviceIndex].config) {
        cachedDeviceRegistry[deviceIndex].config = {
            pomodoro: {},
            trackpad: {},
            oled_enabled: 0
        };
    }
        
    // Save existing notification settings
    const notificationsEnabled = cachedDeviceRegistry[deviceIndex].config?.pomodoro?.notifications_enabled;
    
    // Check previous timer active state
    const oldTimerActive = cachedDeviceRegistry[deviceIndex].config?.pomodoro?.timer_active;

    // Update cached values - ensure pomodoro object exists
    cachedDeviceRegistry[deviceIndex].config.pomodoro = { ...pomodoroConfig };
    
    // Restore notification settings
    if (notificationsEnabled !== undefined) {
        cachedDeviceRegistry[deviceIndex].config.pomodoro.notifications_enabled = notificationsEnabled;
    }

    command.changeConnectDevice(cachedDeviceRegistry);
    
    // Check for timer active state changes
    const newTimerActive = pomodoroConfig.timer_active === 1;
    const timerActiveStateChanged = (oldTimerActive === 1) !== newTimerActive;

    // Send notification to main process if state has changed and timer is active
    if (phaseChanged && pomodoroConfig.timer_active === 1) {
        // Immediately retrieve notification settings from saved settings
        (async () => {
            try {
                // Get the correct device ID for proper settings lookup
                const result = await ipcRenderer.invoke('loadPomodoroDesktopNotificationSettings', deviceId);
                const notificationsEnabled = result.success ? result.enabled : true;
                
                // Only send notification if notifications are enabled
                if (notificationsEnabled) {
                    // Get device name appropriately, using product name or "Keyboard" as fallback
                    const deviceName = cachedDeviceRegistry[deviceIndex].product || cachedDeviceRegistry[deviceIndex].name || 'Keyboard';
                    const newPhase = pomodoroConfig.phase;
                    let minutes = 0;
                    
                    // Determine minutes for the phase
                    switch (newPhase) {
                        case 1: // Work phase
                            minutes = pomodoroConfig.work_time;
                            break;
                        case 2: // Break phase
                            minutes = pomodoroConfig.break_time;
                            break;
                        case 3: // Long break phase
                            minutes = pomodoroConfig.long_break_time;
                            break;
                    }
                    
                    ipcRenderer.send('pomodoroActiveChanged', {
                        deviceName: deviceName,
                        deviceId: deviceId,
                        phase: newPhase,
                        minutes: minutes
                    });
                }
            } catch (error) {
                console.error("Error checking notification settings:", error);
            }
        })();
    }
    
    // Forward pomodoro state changes to main process for tray updates
    ipcRenderer.send('deviceConnectionPomodoroPhaseChanged', {
        deviceId: deviceId,
        pomodoroConfig: pomodoroConfig,
        phaseChanged: phaseChanged || timerActiveStateChanged  // Include timer active state changes
    });
});

ipcRenderer.on("configSaveComplete", (event, { deviceId, success, timestamp }) => {
    // Notify UI that settings have been saved successfully
    const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
    if (deviceIndex !== -1) {
        // Notify renderer process
        command.changeConnectDevice(cachedDeviceRegistry);
        
        // Add custom handling here for specific UI notifications if needed
        window.dispatchEvent(new CustomEvent('configSaveComplete', {
            detail: {
                deviceId,
                success,
                timestamp
            }
        }));
    }
});

ipcRenderer.on("configUpdated", (event, { deviceId, config }) => {
    const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);

    if (deviceIndex !== -1) {
        // Ensure we have a safe config structure
        const safeConfig = config || {
            pomodoro: {},
            trackpad: {},
            oled_enabled: 0
        };
        cachedDeviceRegistry[deviceIndex].config = { ...safeConfig };
        command.changeConnectDevice(cachedDeviceRegistry);
    }
});

contextBridge.exposeInMainWorld("api", {
    start: async (device) => await command.start(device),
    stop: async (device) => await command.stop(device),
    getDeviceInitConfig: async (device) => await command.getDeviceInitConfig(device),
    getDeviceType: () => ipcRenderer.invoke('getDeviceType'),
    dispatchSaveDeviceConfig: async (deviceWithConfig, configTypes) => await command.dispatchSaveDeviceConfig(deviceWithConfig, configTypes),
    getDeviceConfig: async (device) => await ipcRenderer.invoke('getDeviceConfig', device),
    getPomodoroConfig: async (device) => await ipcRenderer.invoke('getPomodoroConfig', device),
    getPomodoroActiveStatus: async (device) => await command.getPomodoroActiveStatus(device),
    getTrackpadConfigData: async (device) => await command.getTrackpadConfigData(device),
    saveTrackpadConfig: async (device) => await command.saveTrackpadConfig(device),
    savePomodoroConfigData: async (device, pomodoroDataBytes) => await command.savePomodoroConfigData(device, pomodoroDataBytes),
    sleep: async (msec) => await ipcRenderer.invoke('sleep', msec),
    setActiveTab: async (device, tabName) => await ipcRenderer.invoke('setActiveTab', device, tabName),
    getActiveWindows: async () => await command.getActiveWindows(),
    setSliderActive: (active) => command.setSliderActive(active),
    
    // Method to listen for config save completion events
    onConfigSaveComplete: (callback) => {
        window.addEventListener('configSaveComplete', (event) => {
            callback(event.detail);
        });
    },
    
    // Import/Export
    exportFile: async () => {
        try {
            // Create a copy of the device registry to modify
            const devicesToExport = JSON.parse(JSON.stringify(cachedDeviceRegistry));
            
            // Apply store settings to each device
            await Promise.all(devicesToExport.map(async (device) => {
                if (!device.config) {
                    device.config = { pomodoro: {}, trackpad: {} };
                }
                
                // Apply auto layer settings if they exist for this device
                const autoLayerSettings = cachedStoreSettings.autoLayerSettings || {};
                if (autoLayerSettings[device.id]) {
                    if (!device.config.trackpad) device.config.trackpad = {};
                    device.config.trackpad.auto_layer_enabled = autoLayerSettings[device.id].enabled ? 1 : 0;
                    device.config.trackpad.auto_layer_settings = autoLayerSettings[device.id].layerSettings || [];
                }
                
                // Apply OLED settings
                const oledSettings = cachedStoreSettings.oledSettings || {};
                if (oledSettings[device.id]) {
                    device.config.oled_enabled = oledSettings[device.id].enabled ? 1 : 0;
                }
                
                // Apply pomodoro notification settings
                const pomodoroNotifSettings = cachedStoreSettings.pomodoroDesktopNotificationsSettings || {};
                if (pomodoroNotifSettings[device.id] !== undefined) {
                    if (!device.config.pomodoro) device.config.pomodoro = {};
                    device.config.pomodoro.notifications_enabled = pomodoroNotifSettings[device.id];
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
                let pomodoroNotifSettings = { ...cachedStoreSettings.pomodoroDesktopNotificationsSettings } || {};
                
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
                                // Process auto layer settings from trackpad object
                                if (matchingConfig.config.trackpad && 
                                   (matchingConfig.config.trackpad.auto_layer_enabled !== undefined ||
                                    matchingConfig.config.trackpad.auto_layer_settings)) {
                                    
                                    // Initialize settings object for this device if needed
                                    if (!autoLayerSettings[cd.id]) {
                                        autoLayerSettings[cd.id] = {
                                            enabled: false,
                                            layerSettings: []
                                        };
                                    }
                                    
                                    // Update settings if they exist in the imported file
                                    if (matchingConfig.config.trackpad.auto_layer_enabled !== undefined) {
                                        autoLayerSettings[cd.id].enabled = 
                                            matchingConfig.config.trackpad.auto_layer_enabled === 1;
                                    }
                                    
                                    if (matchingConfig.config.trackpad.auto_layer_settings) {
                                        autoLayerSettings[cd.id].layerSettings = 
                                            matchingConfig.config.trackpad.auto_layer_settings;
                                    }
                                }
                                
                                // Process OLED settings
                                if (matchingConfig.config.oled_enabled !== undefined) {
                                    if (!oledSettings[cd.id]) {
                                        oledSettings[cd.id] = {};
                                    }
                                    oledSettings[cd.id].enabled = matchingConfig.config.oled_enabled === 1;
                                }
                                
                                // Process pomodoro notification settings from pomodoro object
                                if (matchingConfig.config.pomodoro && 
                                    matchingConfig.config.pomodoro.notifications_enabled !== undefined) {
                                    pomodoroNotifSettings[cd.id] = matchingConfig.config?.pomodoro?.notifications_enabled;
                                }
                            }
                            
                            // Clone and organize device settings structure before sending
                            const configToSend = JSON.parse(JSON.stringify(matchingConfig));
                            
                            // Send device settings
                            await command.dispatchSaveDeviceConfig(configToSend, ['trackpad', 'pomodoro']);
                            
                            // Return updated device settings
                            return configToSend;
                        } catch (err) {
                            console.error(`Error applying config to device ${cd.id}:`, err);
                            return cd;
                        }
                    }
                    
                    return cd;
                }));
                
                // Save all updated settings at once
                await saveStoreSetting('autoLayerSettings', autoLayerSettings, null);
                await saveStoreSetting('oledSettings', oledSettings, null);
                await saveStoreSetting('pomodoroDesktopNotificationsSettings', pomodoroNotifSettings, null);
                
                // After import is complete, trigger configSaveComplete event for all devices
                for (const device of updatedDevices) {
                    if (device && device.id) {
                        window.dispatchEvent(new CustomEvent('configSaveComplete', {
                            detail: {
                                deviceId: device.id,
                                success: true,
                                timestamp: Date.now(),
                                importOperation: true
                            }
                        }));
                    }
                }
                
                // Update cached device registry
                cachedDeviceRegistry = updatedDevices.filter(device => device !== undefined);
                command.changeConnectDevice(cachedDeviceRegistry);
                
                return { success: true, devicesUpdated: updatedDevices.filter(device => device !== undefined).length };
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
        return await saveStoreSetting(key, value, null);
    },
    getAllStoreSettings: () => {
        return cachedStoreSettings;
    },
    
    // Legacy API for backward compatibility
    saveAutoLayerSettings: async (settings) => {
        // Try to get a device ID (use the first one if there are multiple devices)
        const deviceId = Object.keys(settings)[0] || null;
        return await saveStoreSetting('autoLayerSettings', settings, deviceId);
    },
    loadAutoLayerSettings: async () => {
        return { success: true, settings: cachedStoreSettings.autoLayerSettings || {} };
    },
    saveOledSettings: async (deviceId, enabled) => {
        const current = cachedStoreSettings.oledSettings || {};
        if(!current[deviceId].enabled && enabled) {
            await command.dateTimeOledWrite(cachedDeviceRegistry.find(d => d.id === deviceId), forceWrite = true);
        }
        current[deviceId] = { enabled };
        return await saveStoreSetting('oledSettings', current, deviceId);
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
    savePomodoroDesktopNotificationSettings: async (deviceId, enabled) => {
        const current = cachedStoreSettings.pomodoroDesktopNotificationsSettings || {};
        current[deviceId] = enabled;
        return await saveStoreSetting('pomodoroDesktopNotificationsSettings', current, deviceId);
    },
    loadPomodoroDesktopNotificationSettings: async (deviceId) => {
        const settings = cachedStoreSettings.pomodoroDesktopNotificationsSettings || {};
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
    },
    getCachedNotifications: async() => cachedStoreSettings.savedNotifications || [],
    
    // Get application info from package.json
    getAppInfo: async() => {
        try {
            const packageInfo = await ipcRenderer.invoke('getAppInfo');
            return packageInfo;
        } catch (error) {
            console.error("Error getting app info:", error);
            return { 
                name: await ipcRenderer.invoke('translate', 'header.title'), 
                version: "unknown", 
                description: "", 
                author: {} 
            };
        }
    },
    
    // Open external links (for version modal)
    openExternalLink: async (url) => {
        return await ipcRenderer.invoke('openExternalLink', url);
    },
    
    // Get store file path
    getStoreFilePath: async () => {
        return await ipcRenderer.invoke('getStoreFilePath');
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
