import { ipcMain, dialog, Notification, Menu } from "electron";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import ActiveWindow from '@paymoapp/active-window';

// Import all handler modules
import { setupDeviceHandlers, setupDeviceEvents, setMainWindow as setDeviceMainWindow } from './ipcHandlers/deviceHandlers.js';
import { setupConfigHandlers, setMainWindow as setConfigMainWindow, setStore as setConfigStore } from './ipcHandlers/configHandlers.js';
import { setupFileHandlers } from './ipcHandlers/fileHandlers.js';
import { setupStoreHandlers, setStore as setStoreInStoreHandlers, setMainWindow as setStoreMainWindow } from './ipcHandlers/storeHandlers.js';
import { setupNotificationHandlers, setupNotificationEvents, setStore as setNotificationStore, setMainWindow as setNotificationMainWindow } from './ipcHandlers/notificationHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let store;

// Set references from main process
export const setMainWindow = (window) => {
    mainWindow = window;
    
    // Pass mainWindow to all handler modules
    setDeviceMainWindow(window);
    setConfigMainWindow(window);
    setStoreMainWindow(window);
    setNotificationMainWindow(window);
};

export const setStore = (storeInstance) => {
    store = storeInstance;
    
    // Pass store to modules that need it
    setConfigStore(storeInstance);
    setStoreInStoreHandlers(storeInstance);
    setNotificationStore(storeInstance);
};

// Setup all IPC handlers
export const setupIpcHandlers = () => {
    // Setup handlers from each module
    setupDeviceHandlers();
    setupConfigHandlers();
    setupFileHandlers();
    setupStoreHandlers();
    setupNotificationHandlers();
};

// Setup event handlers (non-handle IPC events)
export const setupIpcEvents = (activePomodoroDevices, tray, createTrayMenuTemplate) => {
    // Setup device events
    setupDeviceEvents();
    
    // Setup notification events
    setupNotificationEvents(activePomodoroDevices, tray, createTrayMenuTemplate);
};