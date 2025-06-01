import { ipcMain, dialog, Notification, Menu, BrowserWindow } from "electron";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import ActiveWindow from '@paymoapp/active-window';
import Store from 'electron-store';

// Import all handler modules
import { setupDeviceHandlers, setupDeviceEvents, setMainWindow as setDeviceMainWindow } from './ipcHandlers/deviceHandlers';
import { setupConfigHandlers, setMainWindow as setConfigMainWindow, setStore as setConfigStore } from './ipcHandlers/configHandlers';
import { setupFileHandlers } from './ipcHandlers/fileHandlers';
import { setupStoreHandlers, setStore as setStoreInStoreHandlers, setMainWindow as setStoreMainWindow } from './ipcHandlers/storeHandlers';
import { setupNotificationHandlers, setupNotificationEvents, setStore as setNotificationStore, setMainWindow as setNotificationMainWindow } from './ipcHandlers/notificationHandlers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let store: Store<any> | null = null;

// Set references from main process
export const setMainWindow = (window: BrowserWindow | null): void => {
    mainWindow = window;
    
    // Pass mainWindow to all handler modules
    setDeviceMainWindow(window);
    setConfigMainWindow(window);
    setStoreMainWindow(window);
    setNotificationMainWindow(window);
};

export const setStore = (storeInstance: Store<any>): void => {
    store = storeInstance;
    
    // Pass store to modules that need it
    setConfigStore(storeInstance);
    setStoreInStoreHandlers(storeInstance);
    setNotificationStore(storeInstance);
};

// Setup all IPC handlers
export const setupIpcHandlers = (): void => {
    // Setup handlers from each module
    setupDeviceHandlers();
    setupConfigHandlers();
    setupFileHandlers();
    setupStoreHandlers();
    setupNotificationHandlers();
};

interface TrayMenuTemplate {
    // Define the interface based on your actual menu template structure
    [key: string]: any;
}

// Setup event handlers (non-handle IPC events)
export const setupIpcEvents = (activePomodoroDevices: Map<string, any>, tray: any, createTrayMenuTemplate: () => Electron.MenuItemConstructorOptions[]): void => {
    // Setup device events
    setupDeviceEvents();
    
    // Setup notification events
    setupNotificationEvents(activePomodoroDevices, tray, createTrayMenuTemplate);
};