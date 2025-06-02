import { BrowserWindow } from "electron";
import Store from 'electron-store';

// Import all handler modules
import { setupDeviceHandlers, setupDeviceEvents, setMainWindow as setDeviceMainWindow } from './ipcHandlers/deviceHandlers';
import { setupConfigHandlers, setMainWindow as setConfigMainWindow, setStore as setConfigStore } from './ipcHandlers/configHandlers';
import { setupFileHandlers } from './ipcHandlers/fileHandlers';
import { setupStoreHandlers, setStore as setStoreInStoreHandlers, setMainWindow as setStoreMainWindow } from './ipcHandlers/storeHandlers';
import { setupNotificationHandlers, setupNotificationEvents, setStore as setNotificationStore, setMainWindow as setNotificationMainWindow } from './ipcHandlers/notificationHandlers';

// Module state - maintained for compatibility with existing code
let _mainWindow: BrowserWindow | null = null;
let _store: Store<Record<string, unknown>> | null = null;

// Set references from main process
export const setMainWindow = (window: BrowserWindow | null): void => {
    _mainWindow = window;
    
    // Pass mainWindow to all handler modules
    setDeviceMainWindow(window);
    setConfigMainWindow(window);
    setStoreMainWindow(window);
    setNotificationMainWindow(window);
};

export const setStore = (storeInstance: Store<Record<string, unknown>>): void => {
    _store = storeInstance;
    
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

// Removed unused interface - TrayMenuTemplate is not used in this file

// Setup event handlers (non-handle IPC events)
export const setupIpcEvents = (activePomodoroDevices: Map<string, unknown>, tray: Electron.Tray, createTrayMenuTemplate: () => Electron.MenuItemConstructorOptions[]): void => {
    // Setup device events
    setupDeviceEvents();
    
    // Setup notification events
    setupNotificationEvents(activePomodoroDevices as Map<string, { name: string; phase: number }>, tray, createTrayMenuTemplate);
};