import { ipcMain, Notification, Menu } from "electron";
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { encodeDeviceId, getKBDList } from '../gpkrc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let store;
let mainWindow;

export const setStore = (storeInstance) => {
    store = storeInstance;
};

export const setMainWindow = (window) => {
    mainWindow = window;
};

// Translation utility function
const translate = (key, params = {}) => {
    const locale = store.get('locale') || 'en';
    // Import translation utilities
    import('../src/i18n/locales/en.js').then(enTranslations => {
        let translations = enTranslations.default;
        
        // Get nested value from translations using key path
        const getValue = (obj, path) => {
            return path.split('.').reduce((o, i) => (o && o[i] !== undefined) ? o[i] : undefined, obj);
        };
        
        let text = getValue(translations, key);
        
        // If still undefined, return key
        if (text === undefined) {
            return key;
        }
        
        // Replace parameters
        return text.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] !== undefined ? params[param] : match);
    });
};

export const setupNotificationHandlers = () => {
    ipcMain.handle('getNotifications', async () => {
        try {
            const now = Date.now();
            const queryPayload = {
                collection: 'notification',
                filters: [
                    { field: "publishedAt", op: "<=", value: now }
                ],
                orderBy: { field: "publishedAt", direction: "desc" },
                limit: 10,
            };

            const endpoint = store.get('notificationApiEndpoint')
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
export const setupNotificationEvents = (activePomodoroDevices, tray, createTrayMenuTemplate) => {
    // Handle pomodoro phase notifications
    ipcMain.on('pomodoroActiveChanged', (event, { deviceName, deviceId, phase, minutes }) => {
        // Do not show notifications if the app is focused
        if (mainWindow && mainWindow.isFocused()) {
            return;
        }
        
        // Check if notifications are enabled for this device
        const pomodoroDesktopNotificationsSettings = store.get('pomodoroDesktopNotificationsSettings') || {};
        
        // Use provided deviceId directly if available, otherwise generate it from device name
        const idToUse = deviceId || encodeDeviceId({ id: deviceName });
        
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
    ipcMain.on('deviceDisconnected', (event, deviceId) => {
        // Remove the corresponding entry from activePomodoroDevices
        if (activePomodoroDevices.has(deviceId)) {
            activePomodoroDevices.delete(deviceId);
        }
    });

    // Handle pomodoro phase changes
    ipcMain.on('deviceConnectionPomodoroPhaseChanged', (event, { deviceId, pomodoroConfig, phaseChanged }) => {
        // Convert timer_active to boolean explicitly
        const isTimerActive = pomodoroConfig.timer_active === 1;
        
        // Force update on timer state change (active/inactive)
        let prevTimerState = activePomodoroDevices.has(deviceId);
        let menuNeedsUpdate = prevTimerState !== isTimerActive;
        
        if (isTimerActive) {
            // Get device name
            const devices = getKBDList();
            const device = devices.find(d => d.id === deviceId);
            const deviceName = device?.product || device?.name || 'Device';
            
            // Add to active devices
            activePomodoroDevices.set(deviceId, {
                name: deviceName,
                phase: pomodoroConfig.phase
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