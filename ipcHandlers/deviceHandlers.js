import { ipcMain } from "electron";
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
} from '../gpkrc.js';

let mainWindow;

export const setMainWindow = (window) => {
    mainWindow = window;
};

export const setupDeviceHandlers = () => {
    // Device control handlers
    ipcMain.handle('start', async (event, device) => {
        await start(device)
    });
    
    ipcMain.handle('stop', async (event, device) => {
        await stop(device)
    });
    
    ipcMain.handle('close', async (event) => {
        await close()
    });
    
    ipcMain.handle('encodeDeviceId', async (event, device) => await encodeDeviceId(device));
    ipcMain.handle('getKBDList', async (event) => await getKBDList());
    ipcMain.handle('getDeviceType', (event) => getDeviceType());
    ipcMain.handle('getConnectKbd', async (event, id) => await getConnectKbd(id));
    
    ipcMain.on("changeConnectDevice", (e, data) => {
        mainWindow.webContents.send("changeConnectDevice", data)
    });
    
    ipcMain.handle('getDeviceConfig', async (event, device) => await getDeviceConfig(device));
    ipcMain.handle('getPomodoroConfig', async (event, device) => await getPomodoroConfig(device));
    
    // Device config data handlers
    ipcMain.handle('getPomodoroActiveStatus', async (event, device) => await getPomodoroActiveStatus(device));
    ipcMain.handle('getTrackpadConfigData', async (event, device) => await getTrackpadConfigData(device));

    // Tab switch handler
    ipcMain.handle('setActiveTab', async (event, device, tabName) => {
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

    ipcMain.handle('getDeviceInitConfig', async (event, device) => {
        try {
            return await getDeviceInitConfig(device);
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Write to OLED
    ipcMain.handle('dateTimeOledWrite', async (event, device, forceWrite) => {
        try {
            await writeTimeToOled(device, forceWrite);        
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
};

export const setupDeviceEvents = () => {
    ipcMain.on("connectDevice", (e, data) => {
        mainWindow.webContents.send("isConnectDevice", data)
    });
};