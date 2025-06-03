import path from 'path';
import { fileURLToPath } from 'url';

import { ipcMain, Notification, Menu, IpcMainEvent, BrowserWindow, Tray } from "electron";
import Store from 'electron-store';
import fetch from 'node-fetch';

import { encodeDeviceId, getKBDList } from '../gpkrc';
import enTranslations from '../src/i18n/locales/en';
import type { 
  NotificationQueryPayload, 
  PomodoroPhaseData, 
  DeviceConnectionPomodoroData 
} from '../src/types/ipc';
import type { StoreSchema } from '../src/types/store';
import type { Device } from '../src/types/device';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let store: Store<StoreSchema>;
let mainWindow: BrowserWindow | null;

export const setStore = (storeInstance: Store<StoreSchema>): void => {
    store = storeInstance;
};

export const setMainWindow = (window: BrowserWindow | null): void => {
    mainWindow = window;
};

// Translation utility function
const translate = (key: string, params: Record<string, unknown> = {}): string => {
    const _locale = store.get('locale') || 'en';
    const translations = enTranslations as unknown as Record<string, unknown>;
    
    // Get nested value from translations using key path
    const getValue = (obj: Record<string, unknown>, path: string): string | undefined => {
        return path.split('.').reduce((o: unknown, i: string): unknown => {
            if (o && typeof o === 'object' && i in o) {
                return (o as Record<string, unknown>)[i];
            }
            return undefined;
        }, obj) as string | undefined;
    };
    
    const text = getValue(translations, key);
    
    // If still undefined, return key
    if (text === undefined) {
        return key;
    }
    
    // Replace parameters
    return text.replace(/\{\{(\w+)\}\}/g, (match, param): string => params[param] !== undefined ? String(params[param]) : match);
};

export const setupNotificationHandlers = (): void => {
    ipcMain.handle('getNotifications', async (): Promise<unknown> => {
        try {
            const now = Date.now();
            const queryPayload: NotificationQueryPayload = {
                deviceId: 'all',
                type: 'notification',
                collection: 'notification',
                filters: [
                    { field: "publishedAt", op: "<=", value: now }
                ],
                orderBy: { field: "publishedAt", direction: "desc" },
                limit: 10,
            };

            const endpoint = store.get('notificationApiEndpoint');
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryPayload)
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    });
};

// Setup notification event handlers
export const setupNotificationEvents = (
    activePomodoroDevices: Map<string, { name: string; phase: number }>, 
    tray: Tray | null, 
    createTrayMenuTemplate: () => Electron.MenuItemConstructorOptions[]
): void => {
    // Handle pomodoro phase notifications
    ipcMain.on('pomodoroActiveChanged', (event: IpcMainEvent, { deviceName, deviceId, phase, minutes }: PomodoroPhaseData): void => {
        // Do not show notifications if the app is focused
        if (mainWindow && mainWindow.isFocused()) {
            return;
        }
        
        // Check if notifications are enabled for this device
        const pomodoroDesktopNotificationsSettings = store.get('pomodoroDesktopNotificationsSettings') || {};
        
        // Use provided deviceId directly if available, otherwise generate it from device name
        const idToUse = deviceId || encodeDeviceId({ id: deviceName } as Device);
        
        // Skip notification if disabled for this device
        if (pomodoroDesktopNotificationsSettings[idToUse] === false) {
            return;
        }
        
        let titleKey = '';
        let bodyKey = '';
        
        switch (phase) {
            case 1: // Work phase
                titleKey = 'pomodoroNotification.workTitle';
                bodyKey = 'pomodoroNotification.workBody';
                break;
            case 2: // Break phase
                titleKey = 'pomodoroNotification.breakTitle';
                bodyKey = 'pomodoroNotification.breakBody';
                break;
            case 3: // Long break phase
                titleKey = 'pomodoroNotification.longBreakTitle';
                bodyKey = 'pomodoroNotification.longBreakBody';
                break;
        }
        
        // Get translated text with minutes parameter
        const title = translate(titleKey);
        const body = translate(bodyKey, { minutes });
        
        if (title && Notification.isSupported()) {
            new Notification({ 
                title, 
                body,
                icon: path.join(__dirname, '../icons', '256x256.png')
            }).show();
        }
    });

    // Device disconnection handler
    ipcMain.on('deviceDisconnected', (event: IpcMainEvent, deviceId: string): void => {
        // Remove the corresponding entry from activePomodoroDevices
        if (activePomodoroDevices.has(deviceId)) {
            activePomodoroDevices.delete(deviceId);
            
            // Update tray menu to reflect the device disconnection
            if (tray) {
                try {
                    const contextMenu = Menu.buildFromTemplate(createTrayMenuTemplate());
                    tray.setContextMenu(contextMenu);
                } catch (error) {
                    console.error(`Error updating tray menu after device disconnection:`, error);
                }
            }
        }
    });

    // Handle pomodoro phase changes
    ipcMain.on('deviceConnectionPomodoroPhaseChanged', (event: IpcMainEvent, { deviceId, pomodoroConfig, phaseChanged }: DeviceConnectionPomodoroData): void => {
        // Convert timer_active to boolean explicitly
        const isTimerActive = pomodoroConfig.timer_active === 1;
        
        // Force update on timer state change (active/inactive)
        const prevTimerState = activePomodoroDevices.has(deviceId);
        const menuNeedsUpdate = prevTimerState !== isTimerActive;
        
        if (isTimerActive) {
            // Get device name
            const devices = getKBDList();
            const device = devices.find((d): boolean => d.id === deviceId);
            const deviceName = device?.product || 'Device';
            
            // Add to active devices
            activePomodoroDevices.set(deviceId, {
                name: deviceName,
                phase: pomodoroConfig.phase || 1
            });
        } else {
            // Remove from active devices if timer is not active
            if (activePomodoroDevices.has(deviceId)) {
                // Send notification when timer is stopped - only if phaseChanged flag is true
                if (prevTimerState === true && phaseChanged) {
                    // Check if notifications are enabled for this device
                    const pomodoroDesktopNotificationsSettings = store.get('pomodoroDesktopNotificationsSettings') || {};
                    
                    // Skip notification if disabled for this device or if app is focused
                    if (pomodoroDesktopNotificationsSettings[deviceId] !== false && 
                        !(mainWindow && mainWindow.isFocused())) {
                        
                        const title = translate('pomodoroNotification.stopTitle');
                        const body = translate('pomodoroNotification.stopBody');
                        
                        if (title && Notification.isSupported()) {
                            new Notification({ 
                                title, 
                                body,
                                icon: path.join(__dirname, '../icons', '256x256.png')
                            }).show();
                        }
                    }
                }
                
                activePomodoroDevices.delete(deviceId);
            }
        }
        
        // Always update tray menu when needed
        if (menuNeedsUpdate && tray) {
            try {
                const contextMenu = Menu.buildFromTemplate(createTrayMenuTemplate());
                tray.setContextMenu(contextMenu);
            } catch (error) {
                console.error(`Error updating tray menu:`, error);
            }
        }
    });
};