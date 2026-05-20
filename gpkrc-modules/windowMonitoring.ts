import Store from 'electron-store';

import type {
    DeviceStatus,
    AutoLayerSettings,
    LayerSetting,
    ActiveWindowResult,
    WriteCommandFunction
} from '../src/types/device';
import type { StoreSchema, SavedConfig } from '../src/types/store';

import { commandId, actionId, parseDeviceId } from './communication';
import { buildTrackpadConfigByteArray } from './trackpadConfig';
import { DeviceType } from './deviceTypes';

// Dependency injection
interface WindowMonitoringDependencies {
    deviceStatusMap: Record<string, DeviceStatus>;
    settingsStore: Store<StoreSchema>;
    writeCommand: WriteCommandFunction;
    mainWindow?: {
        webContents: {
            send: (channel: string, data: unknown) => void;
        };
    } | null;
}

let dependencies: WindowMonitoringDependencies | null = null;

export const injectWindowMonitoringDependencies = (deps: WindowMonitoringDependencies): void => {
    dependencies = deps;
    for (let i = activeWindows.length - 1; i >= 0; i--) {
        if (!activeWindows[i]) {
            activeWindows.splice(i, 1);
        }
    }
};

const CURRENT_CONFIG_NAME = 'current';

// Store active windows history
export const activeWindows: string[] = [];
export const currentLayers: { [deviceId: string]: number } = {};
const previousAutoLayerEnabled: { [deviceId: string]: boolean } = {};
const lastAppliedSavedConfigId: { [deviceId: string]: string | null } = {};

// ActiveWindow type definition
interface ActiveWindowModule {
    getActiveWindow: () => Promise<{
        application?: string;
        name?: string;
        path?: string;
        pid?: number;
        icon?: string;
    } | null>;
}

// Function for monitoring active windows and switching layers
export const startWindowMonitoring = async (ActiveWindow: ActiveWindowModule): Promise<void> => {    
    try {
        const rawResult = await ActiveWindow.getActiveWindow();
        
        if (!rawResult) {
            return;
        }

        // Map the result to ActiveWindowResult format
        const result: ActiveWindowResult = {
            application: rawResult.application || rawResult.name || ''
        };
        
        const appName = result.application;

        if (appName && !activeWindows.includes(appName)) {
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
        void checkAndSwitchLayer(appName);
    } catch (error) {
        // NOTE: This error can occur when accessing applications that reside in the system tray
        // or when the active window API cannot access certain system-level applications.
        // This is expected behavior in some cases and can be safely ignored.
        console.error('[ERROR] Error in window monitoring:', error);
    }
};

const applyTempSavedConfig = (id: string, deviceInfo: ReturnType<typeof parseDeviceId>, savedConfigId: string | null, savedConfigs: SavedConfig[]): void => {
    if (!deviceInfo || !dependencies) return;

    const { writeCommand, deviceStatusMap } = dependencies;
    let config: SavedConfig | undefined;

    if (savedConfigId) {
        config = savedConfigs.find((c): boolean => c.id === savedConfigId);
    } else {
        config = savedConfigs.find((c): boolean => c.name === CURRENT_CONFIG_NAME && c.deviceId === id);
    }

    if (!config?.config?.trackpad) return;

    const effectiveId = savedConfigId !== null ? savedConfigId : (CURRENT_CONFIG_NAME + ':' + id);
    if (lastAppliedSavedConfigId[id] === effectiveId) return;

    try {
        const baseTrackpad = (deviceStatusMap[id] as DeviceStatus)?.config?.trackpad ?? {};
        const mergedTrackpad = { ...baseTrackpad, ...config.config.trackpad };
        const bytes = buildTrackpadConfigByteArray(mergedTrackpad);
        writeCommand(deviceInfo, [commandId.gpkRCOperation, actionId.trackpadTempApply, ...bytes])
            .then((result): void => {
                if (result.success) {
                    lastAppliedSavedConfigId[id] = effectiveId;
                } else {
                    console.error(`Error applying temp config for device ${id}:`, result.error);
                }
            }).catch((err: Error): void => {
                console.error(`Error applying temp config for device ${id}:`, err);
            });
    } catch (err) {
        console.error(`Failed to apply temp config for device ${id}:`, err);
    }
};

export const checkAndSwitchLayer = async (appName: string): Promise<void> => {
    if (!appName || !dependencies) return;

    const { deviceStatusMap, settingsStore, writeCommand } = dependencies;

    if (!settingsStore) return;

    const savedConfigs: SavedConfig[] = settingsStore.get('savedConfigs') || [];
    const autoLayerSettings: AutoLayerSettings = settingsStore.get('autoLayerSettings') || {};

    Object.keys(deviceStatusMap).forEach((id): void => {
        const device = deviceStatusMap[id] as DeviceStatus;
        if (!device || !device.connected) {
            return;
        }

        const isTrackpadDevice = device.deviceType === DeviceType.KEYBOARD_TP ||
                                 device.deviceType === DeviceType.MACROPAD_TP ||
                                 device.deviceType === DeviceType.MACROPAD_TP_BTNS;
        if (!isTrackpadDevice) return;

        const settings = autoLayerSettings[id];
        const isEnabled = settings?.enabled ?? false;
        const wasEnabled = previousAutoLayerEnabled[id] ?? false;

        if (wasEnabled && !isEnabled) {
            const deviceInfo = parseDeviceId(id);
            if (deviceInfo) {
                lastAppliedSavedConfigId[id] = null;
                applyTempSavedConfig(id, deviceInfo, null, savedConfigs);
            }
        }
        previousAutoLayerEnabled[id] = isEnabled;

        if (!isEnabled || !Array.isArray(settings?.layerSettings) || !settings.layerSettings.length) {
            return;
        }

        // Find matching setting for the current application
        const matchingSetting = settings.layerSettings.find((s: LayerSetting): boolean =>
            s.applicationName === appName || s.appName === appName
        );
        const deviceInfo = parseDeviceId(id);

        if (!deviceInfo) {
            return;
        }

        if (currentLayers[id] === undefined) {
            currentLayers[id] = 0;
        }

        const targetLayer = matchingSetting ? (matchingSetting.layer || 0) : 0;
        const currentLayer = currentLayers[id];
        const savedConfigId = matchingSetting?.savedConfigId ?? null;

        if (currentLayer !== targetLayer) {
            try {
                writeCommand(deviceInfo, [commandId.gpkRCOperation, actionId.layerMove, targetLayer])
                    .then((result): void => {
                        if (result.success) {
                            currentLayers[id] = targetLayer;
                            setTimeout((): void => {
                                applyTempSavedConfig(id, deviceInfo, savedConfigId, savedConfigs);
                            }, 500);
                        } else {
                            console.error(`Error switching layer for device ${id}:`, result.error);
                        }
                    }).catch((err: Error): void => {
                        console.error(`Error switching layer for device ${id}:`, err);
                    });
            } catch (err) {
                console.error(`Failed to initiate layer switch for device ${id}:`, err);
            }
        } else {
            applyTempSavedConfig(id, deviceInfo, savedConfigId, savedConfigs);
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
    
    return settings.layerSettings.find((setting): boolean => setting.applicationName === appName) || null;
};

// Function to add new application to settings that isn't in the list
export const addNewAppToAutoLayerSettings = async (deviceId: string, appName: string, layer: number): Promise<{ success: boolean; message?: string }> => {
    if (!dependencies?.settingsStore) return { success: false, message: 'Settings store not available' };
    
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
        (setting): boolean => setting.applicationName === appName
    );
    
    if (existingIndex >= 0) {
        autoLayerSettings[deviceId]!.layerSettings[existingIndex]!.layer = layer;
    } else {
        autoLayerSettings[deviceId].layerSettings.push({
            applicationName: appName,
            appName: appName,
            layer
        });
    }
    
    // Save changes
    settingsStore.set('autoLayerSettings', autoLayerSettings);
    
    return { success: true, message: 'Auto layer settings updated successfully' };
};

// Function to clean up layer tracking for a device
export const cleanupDeviceLayerTracking = (deviceId: string): void => {
    if (currentLayers[deviceId] !== undefined) {
        delete currentLayers[deviceId];
    }
    if (previousAutoLayerEnabled[deviceId] !== undefined) {
        delete previousAutoLayerEnabled[deviceId];
    }
    if (lastAppliedSavedConfigId[deviceId] !== undefined) {
        delete lastAppliedSavedConfigId[deviceId];
    }
};