import { contextBridge, ipcRenderer } from 'electron';
import type { 
    Device, 
    CommandResult, 
    ConfigSaveCompleteDetail, 
    ExportData, 
    ImportResult,
    TraySettings,
    AppInfo 
} from './types';
import { command } from './device';
import { cachedDeviceRegistry, cachedStoreSettings, listeners } from './core';
import { saveStoreSetting } from './core';

export const exposeAPI = (): void => {
    contextBridge.exposeInMainWorld("api", {
        start: async (device: Device): Promise<CommandResult> => await command.start(device),
        stop: async (device: Device): Promise<CommandResult> => await command.stop(device),
        getDeviceInitConfig: async (device: Device): Promise<CommandResult> => await command.getDeviceInitConfig(device),
        getDeviceType: (): Promise<any> => ipcRenderer.invoke('getDeviceType'),
        dispatchSaveDeviceConfig: async (deviceWithConfig: Device, configTypes: string[]): Promise<CommandResult> => await command.dispatchSaveDeviceConfig(deviceWithConfig, configTypes),
        getDeviceConfig: async (device: Device): Promise<CommandResult> => await ipcRenderer.invoke('getDeviceConfig', device),
        getPomodoroConfig: async (device: Device): Promise<CommandResult> => await ipcRenderer.invoke('getPomodoroConfig', device),
        getPomodoroActiveStatus: async (device: Device): Promise<CommandResult> => await command.getPomodoroActiveStatus(device),
        getTrackpadConfigData: async (device: Device): Promise<CommandResult> => await command.getTrackpadConfigData(device),
        saveTrackpadConfig: async (device: Device): Promise<CommandResult> => await command.saveTrackpadConfig(device),
        savePomodoroConfigData: async (device: Device, pomodoroDataBytes: any): Promise<CommandResult> => await command.savePomodoroConfigData(device, pomodoroDataBytes),
        sleep: async (msec: number): Promise<void> => await ipcRenderer.invoke('sleep', msec),
        setActiveTab: async (device: Device, tabName: string): Promise<CommandResult> => await ipcRenderer.invoke('setActiveTab', device, tabName),
        getActiveWindows: async (): Promise<CommandResult> => await command.getActiveWindows(),
        setSliderActive: (active: boolean): void => command.setSliderActive(active),
        
        // Method to listen for config save completion events
        onConfigSaveComplete: (callback: (detail: ConfigSaveCompleteDetail) => void): void => {
            window.addEventListener('configSaveComplete', (event: Event) => {
                const customEvent = event as CustomEvent<ConfigSaveCompleteDetail>;
                callback(customEvent.detail);
            });
        },
        
        // Import/Export
        exportFile: async (): Promise<CommandResult> => {
            try {
                // Create a copy of the device registry to modify
                const devicesToExport: Device[] = JSON.parse(JSON.stringify(cachedDeviceRegistry));
                
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
                const exportData: ExportData = {
                    devices: devicesToExport,
                    appSettings: {
                        traySettings: cachedStoreSettings.traySettings || { minimizeToTray: true, backgroundStart: false },
                        locale: cachedStoreSettings.locale || 'en'
                    }
                };
                
                // Export the enhanced data
                return await command.exportFile(exportData);
            } catch (err: any) {
                console.error("Error in exportFile:", err);
                return { success: false, error: err.message };
            }
        },
        importFile: async (): Promise<ImportResult> => {
            try {
                const dat = await command.importFile();
                if (!dat) {
                    return { success: false, message: "No file was imported" };
                }
                
                try {
                    let json = JSON.parse(dat);
                    
                    // Handle new format (object with devices and appSettings) or legacy format (array of devices)
                    const isNewFormat = json.devices && Array.isArray(json.devices);
                    const devices: Device[] = isNewFormat ? json.devices : json;
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
                            
                            // Import locale setting
                            if (appSettings.locale) {
                                await saveStoreSetting('locale', appSettings.locale);
                            }
                        } catch (appSettingsErr) {
                            console.error("Error importing application settings:", appSettingsErr);
                        }
                    }
                    
                    // Build settings objects from imported device data
                    let autoLayerSettings = { ...cachedStoreSettings.autoLayerSettings };
                    let oledSettings = { ...cachedStoreSettings.oledSettings };
                    let pomodoroNotifSettings = { ...cachedStoreSettings.pomodoroDesktopNotificationsSettings };
                    
                    // Apply configurations to matching devices
                    const updatedDevices = await Promise.all(cachedDeviceRegistry.map(async (cd) => {
                        const matchingConfig = devices.find(j => 
                            j.id === cd.id && 
                            j.manufacturer === cd.manufacturer && 
                            j.product === cd.product && 
                            j.productId === cd.productId && 
                            j.vendorId === cd.vendorId
                        );
                        
                        if (matchingConfig) {
                            try {
                                if (matchingConfig.config) {
                                    // Extract auto layer settings
                                    if (matchingConfig.config.trackpad && 
                                        (matchingConfig.config.trackpad.auto_layer_enabled !== undefined || matchingConfig.config.trackpad.auto_layer_settings)) {
                                        if (!autoLayerSettings[cd.id]) {
                                            autoLayerSettings[cd.id] = {
                                                enabled: false,
                                                layerSettings: []
                                            };
                                        }
                                        if (matchingConfig.config.trackpad.auto_layer_enabled !== undefined) {
                                            autoLayerSettings[cd.id].enabled = matchingConfig.config.trackpad.auto_layer_enabled === 1;
                                        }
                                        if (matchingConfig.config.trackpad.auto_layer_settings) {
                                            autoLayerSettings[cd.id].layerSettings = matchingConfig.config.trackpad.auto_layer_settings;
                                        }
                                    }
                                    
                                    // Extract OLED settings
                                    if (matchingConfig.config.oled_enabled !== undefined) {
                                        if (!oledSettings[cd.id]) {
                                            oledSettings[cd.id] = { enabled: false };
                                        }
                                        oledSettings[cd.id].enabled = matchingConfig.config.oled_enabled === 1;
                                    }
                                    
                                    // Extract pomodoro notification settings
                                    if (matchingConfig.config.pomodoro && matchingConfig.config.pomodoro.notifications_enabled !== undefined) {
                                        pomodoroNotifSettings[cd.id] = Boolean(matchingConfig.config.pomodoro?.notifications_enabled);
                                    }
                                }
                                
                                // Save device configuration
                                const configToSend = JSON.parse(JSON.stringify(matchingConfig));
                                await command.dispatchSaveDeviceConfig(configToSend, ['trackpad', 'pomodoro']);
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
                    const filteredDevices = updatedDevices.filter(device => device !== undefined);
                    command.changeConnectDevice(filteredDevices);
                    
                    return { success: true, devicesUpdated: filteredDevices.length };
                    
                } catch (parseErr) {
                    console.error("JSON parse error:", parseErr);
                    return { success: false, error: "Invalid JSON format" };
                }
                
            } catch (err: any) {
                console.error("Import file error:", err);
                return { success: false, error: err.message || "Unknown error during import" };
            }
        },
        
        // Unified store settings API
        getStoreSetting: (key: string): any => {
            return (cachedStoreSettings as any)[key];
        },
        saveStoreSetting: async (key: string, value: any): Promise<CommandResult> => {
            return await saveStoreSetting(key as any, value, null);
        },
        getAllStoreSettings: (): any => {
            return cachedStoreSettings;
        },
        
        // Legacy API for backward compatibility
        saveAutoLayerSettings: async (settings: any): Promise<CommandResult> => {
            // Try to get a device ID (use the first one if there are multiple devices)
            const deviceId = Object.keys(settings)[0] || null;
            return await saveStoreSetting('autoLayerSettings', settings, deviceId);
        },
        loadAutoLayerSettings: async (): Promise<{ success: boolean; settings: any }> => {
            return { success: true, settings: cachedStoreSettings.autoLayerSettings || {} };
        },
        saveOledSettings: async (deviceId: string, enabled: boolean): Promise<CommandResult> => {
            const current = cachedStoreSettings.oledSettings || {};
            // If enabling OLED and it wasn't enabled before, write time immediately
            if (!current[deviceId]?.enabled && enabled) {
                await command.dateTimeOledWrite(cachedDeviceRegistry.find(d => d.id === deviceId)!, true);
            }
            current[deviceId] = { enabled };
            return await saveStoreSetting('oledSettings', current, deviceId);
        },
        loadOledSettings: async (deviceId: string): Promise<{ success: boolean; enabled?: boolean }> => {
            const settings = cachedStoreSettings.oledSettings || {};
            return { success: true, enabled: settings[deviceId]?.enabled };
        },
        saveTraySettings: async (settings: TraySettings): Promise<CommandResult> => {
            return await saveStoreSetting('traySettings', { ...cachedStoreSettings.traySettings, ...settings });
        },
        loadTraySettings: async (): Promise<{ success: boolean; minimizeToTray?: boolean; backgroundStart?: boolean }> => {
            return { 
                success: true, 
                minimizeToTray: cachedStoreSettings.traySettings?.minimizeToTray,
                backgroundStart: cachedStoreSettings.traySettings?.backgroundStart
            };
        },
        setAppLocale: async (locale: string): Promise<CommandResult> => {
            return await saveStoreSetting('locale', locale);
        },
        savePomodoroDesktopNotificationSettings: async (deviceId: string, enabled: boolean): Promise<CommandResult> => {
            const current = cachedStoreSettings.pomodoroDesktopNotificationsSettings || {};
            current[deviceId] = enabled;
            return await saveStoreSetting('pomodoroDesktopNotificationsSettings', current, deviceId);
        },
        loadPomodoroDesktopNotificationSettings: async (deviceId: string): Promise<{ success: boolean; enabled: boolean }> => {
            const settings = cachedStoreSettings.pomodoroDesktopNotificationsSettings || {};
            return { 
                success: true, 
                enabled: settings[deviceId] !== undefined ? settings[deviceId] : true 
            };
        },
        
        // Event listeners
        on: (channel: string, func: (...args: any[]) => void): void => {
            const listener = (event: any, ...args: any[]) => func(...args);
            listeners.set(func, listener);
            ipcRenderer.on(channel, listener);
        },
        off: (channel: string, func: (...args: any[]) => void): void => {
            const listener = listeners.get(func);
            if (listener) {
                ipcRenderer.removeListener(channel, listener);
                listeners.delete(func);
            }
        },
        
        getCachedNotifications: async (): Promise<any[]> => cachedStoreSettings.savedNotifications || [],
        
        // Get application info from package.json
        getAppInfo: async (): Promise<AppInfo> => {
            try {
                const packageInfo = await ipcRenderer.invoke('getAppInfo');
                return packageInfo;
            } catch (error) {
                console.error("Error getting app info:", error);
                return {
                    name: await ipcRenderer.invoke('translate', 'header.title'),
                    version: 'unknown',
                    description: '',
                    author: {}
                };
            }
        },
        
        // Open external links (for version modal)
        openExternalLink: async (url: string): Promise<any> => {
            return await ipcRenderer.invoke('openExternalLink', url);
        },
        
        // Get store file path
        getStoreFilePath: async (): Promise<string> => {
            return await ipcRenderer.invoke('getStoreFilePath');
        }
    });
};