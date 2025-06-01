import Store from 'electron-store';
import { commandId, actionId, parseDeviceId } from './communication';
import type { 
    Device, 
    DeviceStatus, 
    AutoLayerSettings, 
    LayerSetting, 
    ActiveWindowResult,
    WriteCommandFunction 
} from '../src/types/device';
import type { StoreSchema } from '../src/types/store';

// Dependency injection
interface WindowMonitoringDependencies {
    deviceStatusMap: Record<string, DeviceStatus>;
    settingsStore: Store<StoreSchema>;
    writeCommand: WriteCommandFunction;
    mainWindow?: Electron.BrowserWindow;
}

let dependencies: WindowMonitoringDependencies | null = null;

export const injectWindowMonitoringDependencies = (deps: WindowMonitoringDependencies): void => {
    dependencies = deps;
};

// Store active windows history
export let activeWindows: string[] = [];
export let currentLayers: { [deviceId: string]: number } = {}; // Track current layer for each device

// Function for monitoring active windows and switching layers
export const startWindowMonitoring = async (ActiveWindow: { getActiveWindow: () => Promise<{ title: string; name: string }> }): Promise<void> => {    
    try {
        const result: ActiveWindowResult = await ActiveWindow.getActiveWindow();
        if (!result) return;
        const appName = result.application;

        if (!activeWindows.includes(appName)) {
            activeWindows.push(appName);
            if (activeWindows.length > 10) {
                activeWindows.shift();
            }
            
            // Send active window update
            if (dependencies?.mainWindow) {
                dependencies.mainWindow.webContents.send('activeWindow', appName);
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
    if (!appName || !dependencies) return;
    
    const { deviceStatusMap, settingsStore, writeCommand } = dependencies;
    
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
        const matchingSetting = settings.layerSettings.find((s: LayerSetting) => s.applicationName === appName);
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
                writeCommand(deviceInfo, [commandId.gpkRCOperation, actionId.layerMove, targetLayer])
                    .then(() => {
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
    if (!dependencies?.settingsStore) return null;
    
    const settingsStore = dependencies.settingsStore;
    
    const autoLayerSettings: AutoLayerSettings = settingsStore.get('autoLayerSettings') || {};
    const settings = autoLayerSettings[deviceId];
    
    if (!settings || !settings.layerSettings || !Array.isArray(settings.layerSettings)) {
        return null;
    }
    
    return settings.layerSettings.find(setting => setting.applicationName === appName) || null;
};

// Function to add new application to settings that isn't in the list
export const addNewAppToAutoLayerSettings = async (deviceId: string, appName: string, layer: number): Promise<{ success: boolean; message?: string }> => {
    if (!dependencies?.settingsStore) return null;
    
    const settingsStore = dependencies.settingsStore;
    
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
        setting => setting.applicationName === appName
    );
    
    if (existingIndex >= 0) {
        autoLayerSettings[deviceId].layerSettings[existingIndex].layer = layer;
    } else {
        autoLayerSettings[deviceId].layerSettings.push({
            applicationName: appName,
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