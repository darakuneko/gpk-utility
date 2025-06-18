import { ipcMain, BrowserWindow } from "electron";
import { ActiveWindow } from '@paymoapp/active-window';

import {
    start, 
    stop, 
    close, 
    getConnectKbd, 
    getKBDList, 
    setActiveTab,
    startWindowMonitoring,
    getActiveWindows,
    getDeviceType,
    getDeviceInitConfig,
    getDeviceConfig,
    getPomodoroConfig,
    writeTimeToOled,
    getPomodoroActiveStatus,
    getTrackpadConfigData,
    getLedConfig,
    getLedLayerConfig,
    saveLedConfig,
    saveLedLayerConfig
} from '../gpkrc';
import type { Device, DeviceWithId, DeviceStatus, CommandResult, ActiveWindowResult } from '../src/types/device';
import { DeviceType } from '../gpkrc-modules/deviceTypes';

let mainWindow: BrowserWindow | null;

export const setMainWindow = (window: BrowserWindow | null): void => {
    mainWindow = window;
};

export const setupDeviceHandlers = (): void => {
    // Device control handlers
    ipcMain.handle('start', async (event, device: Device): Promise<void> => {
        await start(device)
    });
    
    ipcMain.handle('stop', async (event, device: Device): Promise<void> => {
        await stop(device)
    });
    
    ipcMain.handle('close', async (_event): Promise<void> => {
        await close()
    });
    
    ipcMain.handle('encodeDeviceId', async (_event, device: Device): Promise<string> => {
        // Device already has encoded ID, return it directly
        return device.id;
    });
    ipcMain.handle('getKBDList', async (_event): Promise<DeviceWithId[]> => await getKBDList());
    ipcMain.handle('getDeviceType', (_event): typeof DeviceType => getDeviceType());
    ipcMain.handle('getConnectKbd', async (_event, id: string): Promise<DeviceStatus | undefined> => await getConnectKbd(id));
    
    ipcMain.on("changeConnectDevice", (e, data: Device): void => {
        if (mainWindow) {
            mainWindow.webContents.send("changeConnectDevice", data);
        }
    });
    
    ipcMain.handle('getDeviceConfig', async (event, device: Device): Promise<CommandResult> => {
        try {
            const _result = await getDeviceConfig(device);
            return { success: true };
        } catch (error) {
            console.error(`IPC handler: Error getting device config for ${device.id}:`, error);
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            // If the error is related to HID instance unavailability, suggest reconnection
            if (errorMessage.includes("No HID instance available") || 
                errorMessage.includes("Device may need to be reconnected")) {
                return { 
                    success: false, 
                    error: `${errorMessage}. Please disconnect and reconnect the device to re-establish communication.`
                } as CommandResult;
            }
            
            return { success: false, error: errorMessage };
        }
    });
    ipcMain.handle('getPomodoroConfig', async (event, device: Device): Promise<CommandResult> => await getPomodoroConfig(device));
    
    // Device config data handlers
    ipcMain.handle('getPomodoroActiveStatus', async (event, device: Device): Promise<CommandResult> => await getPomodoroActiveStatus(device));
    ipcMain.handle('getTrackpadConfigData', async (event, device: Device): Promise<CommandResult> => await getTrackpadConfigData(device));
    
    // LED config handlers
    ipcMain.handle('getLedConfig', async (event, device: Device): Promise<CommandResult> => {
        try {
            const result = await getLedConfig(device);
            return result;
        } catch (error) {
            console.error(`IPC handler: Error getting LED config for ${device.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: errorMessage };
        }
    });
    ipcMain.handle('getLedLayerConfig', async (event, device: Device): Promise<CommandResult> => {
        try {
            const result = await getLedLayerConfig(device);
            return result;
        } catch (error) {
            console.error(`IPC handler: Error getting LED layer config for ${device.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: errorMessage };
        }
    });
    ipcMain.handle('saveLedConfig', async (event, device: Device): Promise<CommandResult> => {
        try {
            const result = await saveLedConfig(device);
            return result;
        } catch (error) {
            console.error(`IPC handler: Error saving LED config for ${device.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: errorMessage };
        }
    });
    ipcMain.handle('saveLedLayerConfig', async (event, device: Device): Promise<CommandResult> => {
        try {
            const result = await saveLedLayerConfig(device);
            return result;
        } catch (error) {
            console.error(`IPC handler: Error saving LED layer config for ${device.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: errorMessage };
        }
    });

    // Tab switch handler
    ipcMain.handle('setActiveTab', async (event, device: Device, tabName: string): Promise<void> => {
        setActiveTab(device, tabName)
    });

    // Window monitoring control
    ipcMain.handle('startWindowMonitoring', async (_event): Promise<void> => {
        try {
            await startWindowMonitoring({
                getActiveWindow: async (): Promise<ActiveWindowResult> => {
                    const result = await ActiveWindow.getActiveWindow();
                    return {
                        title: result.title,
                        application: result.application,
                        name: result.application,
                        executableName: result.application
                    };
                }
            });
        } catch (error) {
            console.error('[ERROR] IPC handler: startWindowMonitoring failed:', error);
        }
    });

    // Active window list retrieval handler
    ipcMain.handle('getActiveWindows', async (_event): Promise<string[]> => {
        return getActiveWindows();
    });

    ipcMain.handle('getDeviceInitConfig', async (event, device: Device): Promise<CommandResult> => {
        try {
            return await getDeviceInitConfig(device);
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Write to OLED
    ipcMain.handle('dateTimeOledWrite', async (event, device: Device, forceWrite?: boolean): Promise<CommandResult> => {
        try {
            const result = await writeTimeToOled(device, forceWrite);        
            
            if (!result.success) {
                console.error(`Failed to write to OLED: ${result.error || 'Unknown error'}`);
                return { success: false, error: result.error || 'Unknown error' };
            }
            
            return { success: true };
        } catch (error) {
            console.error(`Error in dateTimeOledWrite handler:`, error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
};

export const setupDeviceEvents = (): void => {
    ipcMain.on("connectDevice", (e, data: Device): void => {
        if (mainWindow) {
            mainWindow.webContents.send("isConnectDevice", data);
        }
    });
};