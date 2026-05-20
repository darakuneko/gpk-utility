import { ipcMain, BrowserWindow } from "electron";
import Store from 'electron-store';

import {
    saveTrackpadConfig,
    applyTrackpadTempConfig,
    savePomodoroConfigData,
    saveLedConfig,
    saveLedLayerConfig,
    updateAutoLayerSettings,
    buildTrackpadConfigByteArray
} from '../gpkrc';
import type { StoreSchema } from '../src/types/store';
import type { Device, PomodoroConfig } from '../src/types/device';

let mainWindow: BrowserWindow | null;
let store: Store<StoreSchema>;

export const setMainWindow = (window: BrowserWindow | null): void => {
    mainWindow = window;
};

export const setStore = (storeInstance: Store<StoreSchema>): void => {
    store = storeInstance;
};



// Convert pomodoro config object to byte array for device communication
const buildPomodoroConfigByteArray = (pomodoroConfig: PomodoroConfig): number[] => {
    const byteArray = new Array(8); // 8 bytes for pomodoro config
    byteArray[0] = pomodoroConfig.work_time!;
    byteArray[1] = pomodoroConfig.break_time!;
    byteArray[2] = pomodoroConfig.long_break_time!;
    byteArray[3] = pomodoroConfig.work_interval!;
    byteArray[4] = pomodoroConfig.work_hf_pattern!;
    byteArray[5] = pomodoroConfig.break_hf_pattern!;    
    // Combine timer_active (bit 7), notify_haptic_enable (bit 6), continuous_mode (bit 5), and state (bits 0-1)
    byteArray[6] = (Number(pomodoroConfig.timer_active || 0) << 7) | 
                   (Number(pomodoroConfig.notify_haptic_enable || 0) << 6) | 
                   (Number(pomodoroConfig.continuous_mode || 0) << 5) | 
                   (Number(pomodoroConfig.phase || 0) & 0b00000011);
    byteArray[7] = pomodoroConfig.pomodoro_cycle || 1; // Default to 1 if not defined

    return byteArray;
};

export const setupConfigHandlers = (): void => {
    ipcMain.handle('saveTrackpadConfig', async (event, device: Device): Promise<{ success: boolean; error?: string }> => {
        try {
            // Get trackpad settings from device object
            if (!device || !device.config || !device.config.trackpad) {
                return { success: false, error: "Invalid device or missing trackpad configuration" };
            }
            
            // Generate byte array in the main process
            const trackpadBytes = buildTrackpadConfigByteArray(device.config.trackpad);
            
            // Call GPKRC to send settings to the device
            await saveTrackpadConfig(device, trackpadBytes);
            return { success: true };
        } catch (error) {
            console.error("Error in saveTrackpadConfig:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    
    ipcMain.handle('applyTrackpadTemp', async (event, device: Device): Promise<{ success: boolean; error?: string }> => {
        try {
            if (!device || !device.config || !device.config.trackpad) {
                return { success: false, error: "Invalid device or missing trackpad configuration" };
            }
            const trackpadBytes = buildTrackpadConfigByteArray(device.config.trackpad);
            await applyTrackpadTempConfig(device, trackpadBytes);
            return { success: true };
        } catch (error) {
            console.error("Error in applyTrackpadTemp:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    ipcMain.handle('savePomodoroConfigData', async (event, device: Device, pomodoroDataBytes: number[]): Promise<{ success: boolean; error?: string }> => {
        try {
            await savePomodoroConfigData(device, pomodoroDataBytes);
            return { success: true };
        } catch (error) {
            console.error("Error in savePomodoroConfigData:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Replace the old sendDeviceConfig handler with dispatchSaveDeviceConfig
    ipcMain.handle('dispatchSaveDeviceConfig', async (event, deviceWithConfig: Device, configTypes: string | string[]): Promise<{ success: boolean; error?: string; message?: string; updates?: { trackpad: boolean; pomodoro: boolean } }> => {
        try {
            if (!deviceWithConfig || !deviceWithConfig.config) {
                throw new Error("Invalid device format: missing config");
            }

            // Convert configTypes to array if it's a string
            const typesToUpdate = Array.isArray(configTypes) ? configTypes : [configTypes];
            const updateAll = typesToUpdate.includes('all');
            
            let trackpadSaved = false;
            let pomodoroSaved = false;
            let ledSaved = false;
            
            // Handle trackpad config
            if ((updateAll || typesToUpdate.includes('trackpad')) && deviceWithConfig.config.trackpad) {
                // Use the existing local function
                const trackpadBytes = buildTrackpadConfigByteArray(deviceWithConfig.config.trackpad);
                void saveTrackpadConfig(deviceWithConfig, trackpadBytes); // Deliberately not awaiting to prevent UI sluggishness
                trackpadSaved = true;
            }

            // Handle pomodoro config
            if ((updateAll || typesToUpdate.includes('pomodoro')) && deviceWithConfig.config.pomodoro) {
                const pomodoroBytes = buildPomodoroConfigByteArray(deviceWithConfig.config.pomodoro);
                void savePomodoroConfigData(deviceWithConfig, pomodoroBytes); // Deliberately not awaiting to prevent UI sluggishness
                pomodoroSaved = true;
            }

            // Handle LED config
            if ((updateAll || typesToUpdate.includes('led')) && deviceWithConfig.config.led) {
                void saveLedConfig(deviceWithConfig); // Deliberately not awaiting to prevent UI sluggishness
                ledSaved = true;
            }

            // Handle LED layer config
            if ((updateAll || typesToUpdate.includes('led_layer')) && deviceWithConfig.config.led) {
                void saveLedLayerConfig(deviceWithConfig); // Deliberately not awaiting to prevent UI sluggishness
                ledSaved = true;
            }

            if (trackpadSaved || pomodoroSaved || ledSaved) {
                // Send configUpdated event to UI for immediate feedback before device state updates
                if (mainWindow) {
                    mainWindow.webContents.send("configUpdated", {
                        deviceId: deviceWithConfig.id,
                        config: deviceWithConfig.config // Send the config that was intended to be saved
                    });
                }
                const updates = {
                    trackpad: trackpadSaved,
                    pomodoro: pomodoroSaved
                } as { trackpad: boolean; pomodoro: boolean; led?: boolean };
                
                if (ledSaved) {
                    updates.led = ledSaved;
                }
                
                return { 
                    success: true, 
                    message: "Device config dispatched for saving.",
                    updates
                };
            } else {
                return { success: false, message: "No config found to save for the specified types." };
            }

        } catch (error) {
            console.error("Error in dispatchSaveDeviceConfig:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Save auto layer settings
    ipcMain.handle('saveAutoLayerSettings', async (event, settings: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => {
        try {
            // Save settings to electron-store
            store.set('autoLayerSettings', settings);
            
            // Pass store to gpkrc.js
            updateAutoLayerSettings(store);
            
            // Send save completion notification to devices with changed settings
            for (const deviceId in settings) {
                if (mainWindow) {
                    mainWindow.webContents.send("configSaveComplete", {
                        deviceId,
                        success: true,
                        timestamp: Date.now(),
                        settingType: 'autoLayer'
                    });
                }
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Load auto layer settings
    ipcMain.handle('loadAutoLayerSettings', async (_event): Promise<{ success: boolean; error?: string; settings?: unknown }> => {
        try {
            // Load settings from electron-store
            const settings = store.get('autoLayerSettings');
            
            // Pass store to gpkrc.js
            updateAutoLayerSettings(store);
            
            return { success: true, settings };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
};