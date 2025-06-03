import { ipcMain, BrowserWindow } from "electron";
import { ActiveWindow } from '@paymoapp/active-window';

import {
    start, 
    stop, 
    close, 
    getConnectKbd, 
    getKBDList, 
    encodeDeviceId, 
    setActiveTab,
    startWindowMonitoring,
    getActiveWindows,
    getDeviceType,
    getDeviceInitConfig,
    getDeviceConfig,
    getPomodoroConfig,
    writeTimeToOled,
    getPomodoroActiveStatus,
    getTrackpadConfigData
} from '../gpkrc';

let mainWindow: BrowserWindow | null;

// Use proper Device type from types/device.ts
import type { Device } from '../src/types/device';

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
    
    ipcMain.handle('encodeDeviceId', async (_event, device: Device): Promise<string> => await encodeDeviceId(device));
    ipcMain.handle('getKBDList', async (_event): Promise<Device[]> => await getKBDList());
    ipcMain.handle('getDeviceType', (_event): DeviceType => getDeviceType());
    ipcMain.handle('getConnectKbd', async (_event, id: string): Promise<Device | undefined> => await getConnectKbd(id));
    
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
                    error: errorMessage,
                    requiresReconnection: true,
                    suggestion: "Please disconnect and reconnect the device to re-establish communication."
                };
            }
            
            return { success: false, error: errorMessage };
        }
    });
    ipcMain.handle('getPomodoroConfig', async (event, device: Device): Promise<CommandResult> => await getPomodoroConfig(device));
    
    // Device config data handlers
    ipcMain.handle('getPomodoroActiveStatus', async (event, device: Device) => await getPomodoroActiveStatus(device));
    ipcMain.handle('getTrackpadConfigData', async (event, device: Device) => await getTrackpadConfigData(device));

    // Tab switch handler
    ipcMain.handle('setActiveTab', async (event, device: Device, tabName: string) => {
        setActiveTab(device, tabName)
    });

    // Window monitoring control
    ipcMain.handle('startWindowMonitoring', async (_event) => {
        try {
            await startWindowMonitoring({
                getActiveWindow: async () => {
                    const result = await ActiveWindow.getActiveWindow();
                    return {
                        title: result.title,
                        application: result.application,
                        name: result.application,
                        path: result.path,
                        pid: result.pid,
                        icon: result.icon
                    };
                }
            });
        } catch (error) {
            console.error('[ERROR] IPC handler: startWindowMonitoring failed:', error);
        }
    });

    // Active window list retrieval handler
    ipcMain.handle('getActiveWindows', async (_event) => {
        return getActiveWindows();
    });

    ipcMain.handle('getDeviceInitConfig', async (event, device: Device) => {
        try {
            return await getDeviceInitConfig(device);
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Write to OLED
    ipcMain.handle('dateTimeOledWrite', async (event, device: Device, forceWrite?: boolean) => {
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
    ipcMain.on("connectDevice", (e, data: Device) => {
        if (mainWindow) {
            mainWindow.webContents.send("isConnectDevice", data);
        }
    });
};