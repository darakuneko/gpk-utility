import { ipcMain, BrowserWindow } from "electron";
import Store from 'electron-store';
import {
    saveTrackpadConfig,
    savePomodoroConfigData,
    updateAutoLayerSettings
} from '../gpkrc';
import type { StoreSchema } from '../src/types/store';

let mainWindow: BrowserWindow;
let store: Store<StoreSchema>;

export const setMainWindow = (window: BrowserWindow): void => {
    mainWindow = window;
};

export const setStore = (storeInstance: Store<StoreSchema>): void => {
    store = storeInstance;
};

interface TrackpadConfig {
    hf_waveform_number: number;
    can_hf_for_layer: number;
    can_drag: number;
    scroll_term: number;
    drag_term: number;
    can_trackpad_layer: number;
    can_reverse_scrolling_direction: number;
    drag_strength_mode: number;
    drag_strength: number;
    default_speed: number;
    scroll_step: number;
    can_short_scroll: number;
    tap_term?: number;
    swipe_term?: number;
    pinch_term?: number;
    gesture_term?: number;
    short_scroll_term?: number;
    pinch_distance?: number;
}

interface PomodoroConfig {
    work_time: number;
    break_time: number;
    long_break_time: number;
    work_interval: number;
    work_hf_pattern: number;
    break_hf_pattern: number;
    timer_active?: number;
    notify_haptic_enable?: number;
    continuous_mode?: number;
    phase?: number;
    pomodoro_cycle?: number;
}

interface Device {
    id: string;
    config?: {
        trackpad?: TrackpadConfig;
        pomodoro?: PomodoroConfig;
        init?: number;
    };
}

// Convert trackpad config object to byte array for device communication
const buildTrackpadConfigByteArray = (trackpadConfig: TrackpadConfig): number[] => {
    const byteArray = new Array(19); // 19 bytes for updated trackpad config
    const upper_scroll_term = (trackpadConfig.scroll_term & 0b1111110000) >> 4;
    const lower_drag_term = (trackpadConfig.drag_term & 0b1111000000) >> 6;
    const lower_default_speed = (trackpadConfig.default_speed & 0b110000) >> 4;
    byteArray[0] = trackpadConfig.hf_waveform_number;
    byteArray[1] = trackpadConfig.can_hf_for_layer << 7 |
        trackpadConfig.can_drag << 6 |
        upper_scroll_term;
    byteArray[2] = (trackpadConfig.scroll_term & 0b0000001111) << 4 | lower_drag_term;
    byteArray[3] = (trackpadConfig.drag_term & 0b0000111111) << 2 |
        trackpadConfig.can_trackpad_layer << 1 |
        trackpadConfig.can_reverse_scrolling_direction;
    byteArray[4] = trackpadConfig.drag_strength_mode << 7 |
        trackpadConfig.drag_strength << 2 |
        lower_default_speed;
    byteArray[5] = (trackpadConfig.default_speed & 0b001111) << 4 |
        trackpadConfig.scroll_step;
    byteArray[6] = trackpadConfig.can_short_scroll << 7;
    
    // Updated for 2-byte values - high byte, low byte for each value
    byteArray[7] = (trackpadConfig.tap_term || 0) >> 8;     
    byteArray[8] = (trackpadConfig.tap_term || 0) & 0xFF;   
    
    byteArray[9] = (trackpadConfig.swipe_term || 0) >> 8;    
    byteArray[10] = (trackpadConfig.swipe_term || 0) & 0xFF; 
    
    byteArray[11] = (trackpadConfig.pinch_term || 0) >> 8;    
    byteArray[12] = (trackpadConfig.pinch_term || 0) & 0xFF;  
    
    byteArray[13] = (trackpadConfig.gesture_term || 0) >> 8;    
    byteArray[14] = (trackpadConfig.gesture_term || 0) & 0xFF;  
    
    byteArray[15] = (trackpadConfig.short_scroll_term || 0) >> 8;        
    byteArray[16] = (trackpadConfig.short_scroll_term || 0) & 0xFF;  
    
    byteArray[17] = (trackpadConfig.pinch_distance || 0) >> 8;        
    byteArray[18] = (trackpadConfig.pinch_distance || 0) & 0xFF;  
    
    return byteArray;
};

// Convert pomodoro config object to byte array for device communication
const buildPomodoroConfigByteArray = (pomodoroConfig: PomodoroConfig): number[] => {
    const byteArray = new Array(8); // 8 bytes for pomodoro config
    byteArray[0] = pomodoroConfig.work_time;
    byteArray[1] = pomodoroConfig.break_time;
    byteArray[2] = pomodoroConfig.long_break_time;
    byteArray[3] = pomodoroConfig.work_interval;
    byteArray[4] = pomodoroConfig.work_hf_pattern;
    byteArray[5] = pomodoroConfig.break_hf_pattern;    
    // Combine timer_active (bit 7), notify_haptic_enable (bit 6), continuous_mode (bit 5), and state (bits 0-1)
    byteArray[6] = ((pomodoroConfig.timer_active || 0) << 7) | 
                   ((pomodoroConfig.notify_haptic_enable || 0) << 6) | 
                   ((pomodoroConfig.continuous_mode || 0) << 5) | 
                   ((pomodoroConfig.phase || 0) & 0b00000011);
    byteArray[7] = pomodoroConfig.pomodoro_cycle || 1; // Default to 1 if not defined

    return byteArray;
};

export const setupConfigHandlers = (): void => {
    ipcMain.handle('saveTrackpadConfig', async (event, device: Device) => {
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
        } catch (error: Error) {
            console.error("Error in saveTrackpadConfig:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    
    ipcMain.handle('savePomodoroConfigData', async (event, device: Device, pomodoroDataBytes: number[]) => {
        try {
            await savePomodoroConfigData(device, pomodoroDataBytes);
            return { success: true };
        } catch (error: Error) {
            console.error("Error in savePomodoroConfigData:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Replace the old sendDeviceConfig handler with dispatchSaveDeviceConfig
    ipcMain.handle('dispatchSaveDeviceConfig', async (event, deviceWithConfig: Device, configTypes: string | string[]) => {
        try {
            if (!deviceWithConfig || !deviceWithConfig.config) {
                throw new Error("Invalid device format: missing config");
            }

            // Convert configTypes to array if it's a string
            const typesToUpdate = Array.isArray(configTypes) ? configTypes : [configTypes];
            const updateAll = typesToUpdate.includes('all');
            
            let trackpadSaved = false;
            let pomodoroSaved = false;
            // Handle trackpad config
            if ((updateAll || typesToUpdate.includes('trackpad')) && deviceWithConfig.config.trackpad) {
                // Use the existing local function
                const trackpadBytes = buildTrackpadConfigByteArray(deviceWithConfig.config.trackpad);
                saveTrackpadConfig(deviceWithConfig as Device, trackpadBytes); // Deliberately not awaiting to prevent UI sluggishness
                trackpadSaved = true;
            }

            // Handle pomodoro config
            if ((updateAll || typesToUpdate.includes('pomodoro')) && deviceWithConfig.config.pomodoro) {
                const pomodoroBytes = buildPomodoroConfigByteArray(deviceWithConfig.config.pomodoro);
                savePomodoroConfigData(deviceWithConfig as Device, pomodoroBytes); // Deliberately not awaiting to prevent UI sluggishness
                pomodoroSaved = true;
            }

            if (trackpadSaved || pomodoroSaved) {
                // Send configUpdated event to UI for immediate feedback before device state updates
                mainWindow.webContents.send("configUpdated", {
                    deviceId: deviceWithConfig.id,
                    config: deviceWithConfig.config // Send the config that was intended to be saved
                });
                return { 
                    success: true, 
                    message: "Device config dispatched for saving.",
                    updates: {
                        trackpad: trackpadSaved,
                        pomodoro: pomodoroSaved
                    }
                };
            } else {
                return { success: false, message: "No config found to save for the specified types." };
            }

        } catch (error: Error) {
            console.error("Error in dispatchSaveDeviceConfig:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Save auto layer settings
    ipcMain.handle('saveAutoLayerSettings', async (event, settings: Record<string, unknown>) => {
        try {
            // Save settings to electron-store
            store.set('autoLayerSettings', settings);
            
            // Pass store to gpkrc.js
            updateAutoLayerSettings(store);
            
            // Send save completion notification to devices with changed settings
            for (const deviceId in settings) {
                mainWindow.webContents.send("configSaveComplete", {
                    deviceId,
                    success: true,
                    timestamp: Date.now(),
                    settingType: 'autoLayer'
                });
            }
            
            return { success: true };
        } catch (error: Error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Load auto layer settings
    ipcMain.handle('loadAutoLayerSettings', async (event) => {
        try {
            // Load settings from electron-store
            const settings = store.get('autoLayerSettings');
            
            // Pass store to gpkrc.js
            updateAutoLayerSettings(store);
            
            return { success: true, settings };
        } catch (error: Error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
};