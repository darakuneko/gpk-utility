import { commandId, actionId, parseDeviceId } from './communication.js';

// Store active windows history
let activeWindows = []
let currentLayers = {} // Track current layer for each device

// Function for monitoring active windows and switching layers
const startWindowMonitoring = async (ActiveWindow) => {    
    try {
        const result = await ActiveWindow.default.getActiveWindow();
        if (!result) return;
        const appName = result.application;

        if (!activeWindows.includes(appName)) {
            activeWindows.push(appName);
            if (activeWindows.length > 10) {
                activeWindows.shift();
            }
            
            // Note: mainWindow will be accessed from deviceManagement.js
            const { mainWindow } = await import('./deviceManagement.js');
            if (mainWindow) {
                mainWindow.webContents.send('activeWindow', appName);
            }
            
        }
        // Always switch layers based on active application
        checkAndSwitchLayer(appName);
    } catch (error) {
       // Uncomment for debugging   
       //  console.error("Error in window monitoring:", error);
    }
};

// Switch layers based on active application
const checkAndSwitchLayer = async (appName) => {
    if (!appName) return;
    
    // Note: deviceStatusMap, settingsStore, and writeCommand will be accessed from deviceManagement.js
    const { deviceStatusMap, settingsStore, writeCommand } = await import('./deviceManagement.js');
    
    if (!settingsStore) return;
    
    Object.keys(deviceStatusMap).forEach(id => {
        const device = deviceStatusMap[id];
        if (!device || !device.connected) return;
    
        const autoLayerSettings = settingsStore.get('autoLayerSettings') || {};
        const settings = autoLayerSettings[id];
        
        if (!settings || !settings.enabled || !Array.isArray(settings.layerSettings) || !settings.layerSettings.length) {
            return;
        }
        
        // Find matching setting for the current application
        const matchingSetting = settings.layerSettings.find(s => s.appName === appName);
        const deviceInfo = parseDeviceId(id);
        
        if (!deviceInfo) return;
        
        // Initialize current layer tracking if needed
        if (currentLayers[id] === undefined) {
            currentLayers[id] = 0;
        }
        
        // Determine target layer (0 is default if no matching setting)
        const targetLayer = matchingSetting ? (matchingSetting.layer || 0) : 0;
        
        // Only switch if current layer is different
        if (currentLayers[id] !== targetLayer) {
            try {
                writeCommand(deviceInfo, {
                    id: commandId.gpkRCOperation,
                    data: [actionId.layerMove, targetLayer]
                }).then(() => {
                    // Update current layer after successful switch
                    currentLayers[id] = targetLayer;
                }).catch(err => {
                    console.error(`Error switching layer for device ${id}:`, err);
                });
            } catch (err) {
                console.error(`Failed to initiate layer switch for device ${id}:`, err);
            }
        }
    });
};

// Get current active window list
const getActiveWindows = () => {
    return activeWindows;
};

// Function to get settings for selected application
const getSelectedAppSettings = async (deviceId, appName) => {
    // Note: settingsStore will be accessed from deviceManagement.js
    const { settingsStore } = await import('./deviceManagement.js');
    
    if (!settingsStore) return null;
    
    const autoLayerSettings = settingsStore.get('autoLayerSettings') || {};
    const settings = autoLayerSettings[deviceId];
    
    if (!settings || !settings.layerSettings || !Array.isArray(settings.layerSettings)) {
        return null;
    }
    
    return settings.layerSettings.find(setting => setting.appName === appName);
}

// Function to add new application to settings that isn't in the list
const addNewAppToAutoLayerSettings = async (deviceId, appName, layer) => {
    // Note: settingsStore will be accessed from deviceManagement.js
    const { settingsStore } = await import('./deviceManagement.js');
    
    if (!settingsStore) return null;
    
    const autoLayerSettings = settingsStore.get('autoLayerSettings') || {};
    
    if (!autoLayerSettings[deviceId]) {
        autoLayerSettings[deviceId] = {
            enabled: true,
            layerSettings: []
        };
    }
    
    if (!autoLayerSettings[deviceId].layerSettings) {
        autoLayerSettings[deviceId].layerSettings = [];
    }
    
    // Overwrite existing settings if they exist, otherwise add new
    const existingIndex = autoLayerSettings[deviceId].layerSettings.findIndex(
        setting => setting.appName === appName
    );
    
    if (existingIndex >= 0) {
        autoLayerSettings[deviceId].layerSettings[existingIndex].layer = layer;
    } else {
        autoLayerSettings[deviceId].layerSettings.push({
            appName,
            layer
        });
    }
    
    // Save changes
    settingsStore.set('autoLayerSettings', autoLayerSettings);
    
    return autoLayerSettings[deviceId];
}

// Function to clean up layer tracking for a device
const cleanupDeviceLayerTracking = (deviceId) => {
    if (currentLayers[deviceId] !== undefined) {
        delete currentLayers[deviceId];
    }
};

export { 
    activeWindows, 
    currentLayers, 
    startWindowMonitoring, 
    checkAndSwitchLayer, 
    getActiveWindows, 
    getSelectedAppSettings, 
    addNewAppToAutoLayerSettings,
    cleanupDeviceLayerTracking
};