import { ipcMain, BrowserWindow } from "electron";
import ActiveWindow from '@paymoapp/active-window';
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

let mainWindow: BrowserWindow;

interface Device {
    id: string;
    [key: string]: any;
}

export const setMainWindow = (window: BrowserWindow): void => {
    mainWindow = window;
};

export const setupDeviceHandlers = (): void => {
    // Device control handlers
    ipcMain.handle('start', async (event, device: Device) => {
        await start(device)
    });
    
    ipcMain.handle('stop', async (event, device: Device) => {
        await stop(device)
    });
    
    ipcMain.handle('close', async (event) => {
        await close()
    });
    
    ipcMain.handle('encodeDeviceId', async (event, device: Device) => await encodeDeviceId(device));
    ipcMain.handle('getKBDList', async (event) => await getKBDList());
    ipcMain.handle('getDeviceType', (event) => getDeviceType());
    ipcMain.handle('getConnectKbd', async (event, id: string) => await getConnectKbd(id));
    
    ipcMain.on("changeConnectDevice", (e, data: any) => {
        mainWindow.webContents.send("changeConnectDevice", data)
    });
    
    ipcMain.handle('getDeviceConfig', async (event, device: Device) => {
        try {
            const result = await getDeviceConfig(device);
            return { success: true };
        } catch (error: any) {
            console.error(`IPC handler: Error getting device config for ${device.id}:`, error);
            
            // If the error is related to HID instance unavailability, suggest reconnection
            if (error.message.includes("No HID instance available") || 
                error.message.includes("Device may need to be reconnected")) {
                return { 
                    success: false, 
                    error: error.message,
                    requiresReconnection: true,
                    suggestion: "Please disconnect and reconnect the device to re-establish communication."
                };
            }
            
            return { success: false, error: error.message };
        }
    });
    ipcMain.handle('getPomodoroConfig', async (event, device: Device) => await getPomodoroConfig(device));
    
    // Device config data handlers
    ipcMain.handle('getPomodoroActiveStatus', async (event, device: Device) => await getPomodoroActiveStatus(device));
    ipcMain.handle('getTrackpadConfigData', async (event, device: Device) => await getTrackpadConfigData(device));

    // Tab switch handler
    ipcMain.handle('setActiveTab', async (event, device: Device, tabName: string) => {
        setActiveTab(device, tabName)
    });

    // Window monitoring control
    ipcMain.handle('startWindowMonitoring', async (event) => {
        startWindowMonitoring(ActiveWindow);
    });

    // Active window list retrieval handler
    ipcMain.handle('getActiveWindows', async (event) => {
        return getActiveWindows();
    });

    ipcMain.handle('getDeviceInitConfig', async (event, device: Device) => {
        try {
            return await getDeviceInitConfig(device);
        } catch (error: any) {
            return { success: false, error: error.message };
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
        } catch (error: any) {
            console.error(`Error in dateTimeOledWrite handler:`, error);
            return { success: false, error: error.message };
        }
    });
};

export const setupDeviceEvents = (): void => {
    ipcMain.on("connectDevice", (e, data: any) => {
        mainWindow.webContents.send("isConnectDevice", data)
    });
};