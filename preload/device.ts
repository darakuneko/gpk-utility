import { ipcRenderer } from 'electron';

import type { CommandResult } from '../src/types/device';

import type { Device, SliderState, ExportData, Notification } from './types';
import { 
    cachedDeviceRegistry, 
    lockDeviceProcessing, 
    unlockDeviceProcessing,
    updateCachedDeviceRegistry,
    setSliderActive,
    getSliderState
} from './core';

// Device command interface
export const command = {
    start: async (device: Device): Promise<CommandResult> => {
        return await ipcRenderer.invoke('start', device);
    },
    stop: async (device: Device): Promise<CommandResult> => {
        return await ipcRenderer.invoke('stop', device);
    },
    close: async (): Promise<CommandResult> => await ipcRenderer.invoke('close'),
    sleep: async (msec: number): Promise<void> => await ipcRenderer.invoke('sleep', msec),
    encodeDeviceId: async (device: Device): Promise<string> => await ipcRenderer.invoke('encodeDeviceId', device),
    getKBDList: async (): Promise<Device[]> => {
        const result = await ipcRenderer.invoke('getKBDList');
        return result;
    },
    changeConnectDevice: (dat: Device[]): void => {
        ipcRenderer.send("changeConnectDevice", dat);
    },
    getConnectKbd: async (id: string): Promise<Device | null> => {
        return await ipcRenderer.invoke('getConnectKbd', id);
    },
    getDeviceConfig: async (device: Device): Promise<CommandResult> => {
        return await ipcRenderer.invoke('getDeviceConfig', device);
    },
    getPomodoroConfig: async (device: Device): Promise<CommandResult> => {
        return await ipcRenderer.invoke('getPomodoroConfig', device);
    },
    getPomodoroActiveStatus: async (device: Device): Promise<CommandResult> => {
        return await ipcRenderer.invoke('getPomodoroActiveStatus', device);
    },
    getTrackpadConfigData: async (device: Device): Promise<CommandResult> => {
        return await ipcRenderer.invoke('getTrackpadConfigData', device);
    },
    
    setActiveTab: async (device: Device, tabName: string): Promise<CommandResult> => await ipcRenderer.invoke('setActiveTab', device, tabName),
    startWindowMonitoring: async (): Promise<CommandResult> => await ipcRenderer.invoke('startWindowMonitoring'),
    getActiveWindows: async (): Promise<CommandResult> => await ipcRenderer.invoke('getActiveWindows'),
    dateTimeOledWrite: async (device: Device, forceWrite?: boolean): Promise<CommandResult> => await ipcRenderer.invoke('dateTimeOledWrite', device, forceWrite),
    getDeviceInitConfig: async (device: Device): Promise<CommandResult> => await ipcRenderer.invoke('getDeviceInitConfig', device),
    dispatchSaveDeviceConfig: async (deviceWithConfig: Device, configTypes: string[]): Promise<CommandResult> => await ipcRenderer.invoke('dispatchSaveDeviceConfig', deviceWithConfig, configTypes),
    saveTrackpadConfig: async (device: Device): Promise<CommandResult> => {
        if (device && device.config && device.config.trackpad) {
            try {
                return await ipcRenderer.invoke('saveTrackpadConfig', device);
            } catch (error) {
                console.error("Error sending trackpad config:", error);
                return { success: false, error: error instanceof Error ? error.message : String(error) };
            }
        } else {
            return { success: false, error: "Invalid device or missing trackpad configuration" };
        }
    },
    savePomodoroConfigData: async (device: Device, pomodoroDataBytes: Buffer): Promise<CommandResult> => {
        return await ipcRenderer.invoke('savePomodoroConfigData', device, pomodoroDataBytes);
    },
    getLedConfig: async (device: Device): Promise<CommandResult> => {
        return await ipcRenderer.invoke('getLedConfig', device);
    },
    getLedLayerConfig: async (device: Device): Promise<CommandResult> => {
        return await ipcRenderer.invoke('getLedLayerConfig', device);
    },
    saveLedConfig: async (device: Device): Promise<CommandResult> => {
        if (device && device.config && 'led' in device.config && device.config.led) {
            try {
                return await ipcRenderer.invoke('saveLedConfig', device);
            } catch (error) {
                console.error("Error sending LED config:", error);
                return { success: false, error: error instanceof Error ? error.message : String(error) };
            }
        } else {
            return { success: false, error: "Invalid device or missing LED configuration" };
        }
    },
    saveLedLayerConfig: async (device: Device): Promise<CommandResult> => {
        if (device && device.config && 'led' in device.config && device.config.led) {
            try {
                return await ipcRenderer.invoke('saveLedLayerConfig', device);
            } catch (error) {
                console.error("Error sending LED layer config:", error);
                return { success: false, error: error instanceof Error ? error.message : String(error) };
            }
        } else {
            return { success: false, error: "Invalid device or missing LED layer configuration" };
        }
    },
    switchLayer: async (device: Device, targetLayer: number): Promise<CommandResult> => {
        return await ipcRenderer.invoke('switchLayer', device, targetLayer);
    },

    setSliderActive: (active: boolean): void => {
        setSliderActive(active);
    },
    getSliderActive: (): SliderState => {
        return getSliderState();
    },
    exportFile: async (data: ExportData): Promise<CommandResult> => await ipcRenderer.invoke('exportFile', data),
    importFile: async (filename?: string): Promise<string> => await ipcRenderer.invoke('importFile', filename),
    getNotifications: (): Promise<{ notifications: Notification[] }> => ipcRenderer.invoke('getNotifications')
}

export const keyboardSendLoop = async (): Promise<void> => {
    try {
        const kbdList = await command.getKBDList();
        const connectedIds = new Set(kbdList.map((device): string => device.id));

        // Update existing devices and add new ones
        kbdList.forEach((device): void => {
            const existingDevice = cachedDeviceRegistry.find((cd): boolean => cd.id === device.id);
            if (!existingDevice) {
                // New device detected - mark as NOT connected until initialization is complete
                device.connected = false;
                device.initializing = true; // Track initialization state
                cachedDeviceRegistry.push(device);

            } else {
                // Check if device was previously disconnected and now reconnected
                if (existingDevice.connected === false) {

                    // Reset device state to force re-initialization
                    existingDevice.checkDevice = false;
                    existingDevice.config = null;
                    existingDevice.initializing = true; // Mark as initializing
                    // Mark for restart to ensure clean initialization
                    existingDevice.needsRestart = true;
                    
                }
                // Update device properties but don't mark as connected until initialization is complete
                Object.assign(existingDevice, device);
                // Only mark as connected if not initializing
                if (!existingDevice.initializing) {
                    existingDevice.connected = true;
                }
            }
        });

        // Mark disconnected devices and collect their IDs
        const disconnectedDeviceIds: string[] = [];
        cachedDeviceRegistry.forEach((device): void => {
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
        
        // Remove disconnected devices from cachedDeviceRegistry immediately
        // Treat each reconnection as a fresh new device connection
        if (disconnectedDeviceIds.length > 0) {
            const filteredRegistry = cachedDeviceRegistry.filter((device): boolean => 
                connectedIds.has(device.id)
            );
            updateCachedDeviceRegistry(filteredRegistry);
            command.changeConnectDevice(filteredRegistry);
        } else {
            // Only notify UI if no disconnected devices (to avoid duplicate calls)
            command.changeConnectDevice(cachedDeviceRegistry);
        }
        
        // Process each device with lock mechanism to prevent concurrent processing
        const results = await Promise.all(cachedDeviceRegistry.map(async (device): Promise<Device> => {
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
                    await new Promise((resolve): void => {setTimeout(resolve, 1000);}); // Increased delay before restart

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
                            const errorMessage = startError instanceof Error ? startError.message : String(startError);
                            
                            // Note: "Device not found or path not available" errors during reconnection are normal
                            // and harmless - they occur due to timing between device detection and HID path availability
                            if (!errorMessage.includes("Device not found or path not available")) {
                                console.warn(`Failed to start device ${device.id} (attempt ${startAttempts}/${maxStartAttempts}):`, errorMessage);
                            }
                            
                            if (startAttempts < maxStartAttempts) {
                                await new Promise((resolve): void => {setTimeout(resolve, 1000 * startAttempts);}); // Progressive delay
                            }
                        }
                    }
                    
                    if (startSuccess) {
                        await new Promise((resolve): void => {setTimeout(resolve, 1500);}); // Increased delay after restart
                        device.needsRestart = false;
                        device.initializing = true; // Mark as initializing after restart
                        device.checkDevice = false;
                        device.config = null;
                    } else {
                        console.error(`Failed to restart device ${device.id} after ${maxStartAttempts} attempts`);
                        device.connected = false;
                        device.initializing = false;
                    }
                } catch (error) {
                    console.error(`Failed to restart device ${device.id}:`, error);
                    device.connected = false;
                    device.initializing = false;
                }
                
                return device;
            }

            // If device is not connected via HID, attempt to start it
            if (!connectKbd) {
                device.initializing = true;
                try {
                    await command.start(device);
                    await new Promise((resolve): void => {setTimeout(resolve, 800);}); // Wait for device to initialize
                } catch (startError) {
                    const errorMessage = startError instanceof Error ? startError.message : String(startError);
                    
                    // Note: "Device not found or path not available" errors during initial connection are normal
                    // and harmless - they occur due to timing between device detection and HID path availability
                    if (!errorMessage.includes("Device not found or path not available")) {
                        console.error(`Failed to start device ${device.id} during initial connection:`, errorMessage);
                    }
                    
                    // Mark device for retry on next cycle
                    device.initializing = false;
                    device.connected = false;
                    device.needsRestart = true;
                    return device;
                }
            } else {
                // Device is connected, check if we need to initialize configuration
                const existConfingInit = device.config?.init;
                const existConfingOledEnabled = device.config?.oled_enabled;
                const existCheckDevice = device.checkDevice;

                if (!existConfingOledEnabled && !existConfingInit && !existCheckDevice) {
                    device.checkDevice = true;
                    device.initializing = true;
                    
                    try {
                        await new Promise((resolve): void => {setTimeout(resolve, 1000);});
                        await command.getDeviceConfig(device);
                    } catch (error) {
                        console.error(`Failed to get device config for ${device.id}:`, error);
                        device.checkDevice = false;
                        device.config = null;
                        device.initializing = false;
                        device.connected = false;
                        device.needsRestart = true;
                    }
                }

                // If device has configuration, check status and perform actions
                if (device.config) {
                    if (!device.initializing) {
                        device.connected = true;
                    }

                    const oled_enabled = device.config?.oled_enabled === 1;
                    const pomodoro_timer_active = device.config?.pomodoro?.timer_active === 1;

                    // Handle OLED time display if enabled
                    if (oled_enabled) {
                        try {
                            await command.dateTimeOledWrite(device);
                        } catch (error) {
                            console.error(`Failed to write OLED for device ${device.id}:`, error);
                        }
                    }

                    // Handle Pomodoro status check if timer is active
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
                // Always unlock device processing
                unlockDeviceProcessing(device.id);
            }
        }));

        // Update cached device registry with results
        updateCachedDeviceRegistry(results);
    } catch (err) {
        console.error("[ERROR] keyboardSendLoop:", err);
    }
};