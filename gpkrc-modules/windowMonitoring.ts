import { commandId, actionId, parseDeviceId } from './communication';

// Types
interface ActiveWindowResult {
    application: string;
    [key: string]: any;
}

interface AutoLayerSettings {
    [deviceId: string]: {
        enabled: boolean;
        layerSettings: LayerSetting[];
    };
}

interface LayerSetting {
    appName: string;
    layer: number;
}

interface DeviceStatus {
    connected: boolean;
    [key: string]: any;
}

// Store active windows history
export let activeWindows: string[] = [];
export let currentLayers: { [deviceId: string]: number } = {}; // Track current layer for each device

// Function for monitoring active windows and switching layers
export const startWindowMonitoring = async (ActiveWindow: any): Promise<void> => {    
    try {
        const result: ActiveWindowResult = await ActiveWindow.default.getActiveWindow();
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
export const checkAndSwitchLayer = async (appName: string): Promise<void> => {
    if (!appName) return;
    
    // Note: deviceStatusMap, settingsStore, and writeCommand will be accessed from deviceManagement.js
    const { deviceStatusMap, settingsStore, writeCommand } = await import('./deviceManagement.js');
    
    if (!settingsStore) return;
    
    Object.keys(deviceStatusMap).forEach(id => {
        const device = deviceStatusMap[id] as DeviceStatus;
        if (!device || !device.connected) return;
    
        const autoLayerSettings: AutoLayerSettings = settingsStore.get('autoLayerSettings') || {};
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
                }).catch((err: Error) => {
                    console.error(`Error switching layer for device ${id}:`, err);
                });
            } catch (err) {
                console.error(`Failed to initiate layer switch for device ${id}:`, err);
            }
        }
    });
};

// Get current active window list
export const getActiveWindows = (): string[] => {
    return activeWindows;
};

// Function to get settings for selected application
export const getSelectedAppSettings = async (deviceId: string, appName: string): Promise<LayerSetting | null> => {
    // Note: settingsStore will be accessed from deviceManagement.js
    const { settingsStore } = await import('./deviceManagement.js');
    
    if (!settingsStore) return null;
    
    const autoLayerSettings: AutoLayerSettings = settingsStore.get('autoLayerSettings') || {};
    const settings = autoLayerSettings[deviceId];
    
    if (!settings || !settings.layerSettings || !Array.isArray(settings.layerSettings)) {
        return null;
    }
    
    return settings.layerSettings.find(setting => setting.appName === appName) || null;
};

// Function to add new application to settings that isn't in the list
export const addNewAppToAutoLayerSettings = async (deviceId: string, appName: string, layer: number): Promise<any> => {
    // Note: settingsStore will be accessed from deviceManagement.js
    const { settingsStore } = await import('./deviceManagement.js');
    
    if (!settingsStore) return null;
    
    const autoLayerSettings: AutoLayerSettings = settingsStore.get('autoLayerSettings') || {};
    
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
};

// Function to clean up layer tracking for a device
export const cleanupDeviceLayerTracking = (deviceId: string): void => {
    if (currentLayers[deviceId] !== undefined) {
        delete currentLayers[deviceId];
    }
};