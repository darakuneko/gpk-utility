import { ipcMain, BrowserWindow } from "electron";
import Store from 'electron-store';

import {
    saveTrackpadConfig,
    applyTrackpadTempConfig,
    getTrackpadConfigData,
    savePomodoroConfigData,
    getPomodoroConfig,
    saveLedConfig,
    saveLedLayerConfig,
    getLedConfig,
    getLedLayerConfig,
    buildLedConfigByteArray,
    buildLedLayerConfigByteArray,
    updateAutoLayerSettings,
    buildTrackpadConfigByteArray,
    saveConfigWithVerify,
    deviceStatusMap
} from '../gpkrc';
import { CONFIG_SYNC_TIMING } from '../gpkrc-modules/communication';
import type { StoreSchema } from '../src/types/store';
import type { Device, PomodoroConfig, CommandResult } from '../src/types/device';

// byte6 of the pomodoro payload mixes saved config (notify_haptic bit6, continuous bit5)
// with runtime state (timer_active bit7, phase bits0-1); the runtime bits advance on the
// device and must be ignored when verifying that a saved config landed.
// Bit layout source: buildPomodoroConfigByteArray (below) and receivePomodoroConfig
// (gpkrc-modules/pomodoroConfig.ts). The object-level counterpart of this split is
// savedPomodoroFields (gpkrc-modules/deviceManagement.ts) - keep them in sync.
const maskPomodoroRuntimeBits = (bytes: number[]): number[] => {
    const masked = [...bytes];
    if (masked.length > 6) {
        masked[6] = (masked[6] ?? 0) & 0b01100000;
    }
    return masked;
};

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
            const sentBytes = buildTrackpadConfigByteArray(device.config.trackpad);
            // Temp-apply targets RAM (live preview), so it uses its own short settle rather
            // than the persistent-save settle; retry/verify timing is shared via CONFIG_SYNC_TIMING.
            const applyDelayMs = 150;
            for (let attempt = 1; attempt <= CONFIG_SYNC_TIMING.maxAttempts; attempt++) {
                await applyTrackpadTempConfig(device, sentBytes);
                // Give the device time to process the temp apply before reading it back.
                await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, applyDelayMs));

                // Poll: re-request the read-back each iteration (a single request may be dropped),
                // then wait for the HID data listener to update deviceStatusMap.
                let matched = false;
                const deadline = Date.now() + CONFIG_SYNC_TIMING.verifyTimeoutMs;
                while (Date.now() < deadline) {
                    await getTrackpadConfigData(device);
                    await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, CONFIG_SYNC_TIMING.pollIntervalMs));
                    const actual = deviceStatusMap[device.id]?.config?.trackpad;
                    if (actual) {
                        const actualBytes = buildTrackpadConfigByteArray(actual);
                        if (actualBytes.length === sentBytes.length && actualBytes.every((b, i): boolean => b === sentBytes[i])) {
                            matched = true;
                            break;
                        }
                    }
                }
                if (matched) {
                    return { success: true };
                }
            }
            return { success: false, error: "Trackpad config verification failed after retries" };
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
            
            // Each save runs through saveConfigWithVerify, which writes then reads back and
            // retries until the device confirms the value. It registers the desired value
            // synchronously, so the broadcast shield is active even though we do not await
            // (kept un-awaited to prevent UI sluggishness).
            const deviceId = deviceWithConfig.id;

            // Handle trackpad config
            if ((updateAll || typesToUpdate.includes('trackpad')) && deviceWithConfig.config.trackpad) {
                const trackpadBytes = buildTrackpadConfigByteArray(deviceWithConfig.config.trackpad);
                void saveConfigWithVerify({
                    deviceId,
                    section: 'trackpad',
                    desiredBytes: trackpadBytes,
                    write: (): Promise<CommandResult> => saveTrackpadConfig(deviceWithConfig, trackpadBytes),
                    readback: (): Promise<CommandResult> => getTrackpadConfigData(deviceWithConfig),
                    readActualBytes: (): number[] | undefined => {
                        const actual = deviceStatusMap[deviceId]?.config?.trackpad;
                        return actual ? buildTrackpadConfigByteArray(actual) : undefined;
                    }
                });
                trackpadSaved = true;
            }

            // Handle pomodoro config
            if ((updateAll || typesToUpdate.includes('pomodoro')) && deviceWithConfig.config.pomodoro) {
                const pomodoroBytes = buildPomodoroConfigByteArray(deviceWithConfig.config.pomodoro);
                void saveConfigWithVerify({
                    deviceId,
                    section: 'pomodoro',
                    desiredBytes: pomodoroBytes,
                    write: (): Promise<CommandResult> => savePomodoroConfigData(deviceWithConfig, pomodoroBytes),
                    readback: (): Promise<CommandResult> => getPomodoroConfig(deviceWithConfig),
                    readActualBytes: (): number[] | undefined => {
                        const actual = deviceStatusMap[deviceId]?.config?.pomodoro;
                        return actual ? buildPomodoroConfigByteArray(actual) : undefined;
                    },
                    compareMask: maskPomodoroRuntimeBits
                });
                pomodoroSaved = true;
            }

            // Handle LED config
            if ((updateAll || typesToUpdate.includes('led')) && deviceWithConfig.config.led) {
                const ledBytes = buildLedConfigByteArray(deviceWithConfig.config.led);
                void saveConfigWithVerify({
                    deviceId,
                    section: 'led',
                    desiredBytes: ledBytes,
                    write: (): Promise<CommandResult> => saveLedConfig(deviceWithConfig),
                    readback: (): Promise<CommandResult> => getLedConfig(deviceWithConfig),
                    readActualBytes: (): number[] | undefined => {
                        const actual = deviceStatusMap[deviceId]?.config?.led;
                        return actual ? buildLedConfigByteArray(actual) : undefined;
                    }
                });
                ledSaved = true;
            }

            // Handle LED layer config
            if ((updateAll || typesToUpdate.includes('led_layer')) && deviceWithConfig.config.led) {
                const ledLayerBytes = buildLedLayerConfigByteArray(deviceWithConfig.config.led);
                void saveConfigWithVerify({
                    deviceId,
                    section: 'led_layer',
                    desiredBytes: ledLayerBytes,
                    write: (): Promise<CommandResult> => saveLedLayerConfig(deviceWithConfig),
                    readback: (): Promise<CommandResult> => getLedLayerConfig(deviceWithConfig),
                    readActualBytes: (): number[] | undefined => {
                        const actual = deviceStatusMap[deviceId]?.config?.led;
                        return actual ? buildLedLayerConfigByteArray(actual) : undefined;
                    }
                });
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