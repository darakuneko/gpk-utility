import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron";
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if(process.platform==='linux') {
    app.commandLine.appendArgument("--no-sandbox");
}

// Import translation utilities
import enTranslations from './src/i18n/locales/en';
import {
    close, 
    setMainWindow, 
    updateAutoLayerSettings,
    startWindowMonitoring,
    deviceStatusMap,
    writeCommand,
} from './gpkrc';
import { injectWindowMonitoringDependencies } from './gpkrc-modules/windowMonitoring';
import { setupIpcHandlers, setupIpcEvents, setMainWindow as setIpcMainWindow, setStore as setIpcStore } from './ipcHandlers';

// ActiveWindow is already initialized as an instance, no need to call initialize()
import { ActiveWindow } from '@paymoapp/active-window';

// Types
import type { StoreSchema } from './src/types/store';

interface PomodoroDeviceInfo {
    name: string;
    phase: number;
}

// Global variables
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Initialize electron-store
const store = new Store<StoreSchema>({
    name: 'gpk-utility',
    defaults: {
        autoLayerSettings: {},
        oledSettings: {},
        pomodoroDesktopNotificationsSettings: {},
        savedNotifications: [],
        traySettings: {
            minimizeToTray: true,
            backgroundStart: false
        },
        windowBounds: { width: 1280, height: 800, x: undefined, y: undefined },
        locale: 'en',
        notificationApiEndpoint: 'https://getnotifications-svtx62766a-uc.a.run.app'
    }
});

// Translation utility function
const translate = (key: string, params: Record<string, string | number> = {}): string => {
    const locale = store.get('locale') || 'en';
    const translations = enTranslations as any;
    
    // Get nested value from translations using key path
    const getValue = (obj: any, path: string): string | undefined => {
        return path.split('.').reduce((o: any, i: string) => (o && o[i] !== undefined) ? o[i] : undefined, obj);
    };
    
    let text = getValue(translations, key);
    
    // Fall back to English if translation not found
    if (text === undefined && locale !== 'en') {
        text = getValue(enTranslations as any, key);
    }
    
    // If still undefined, return key
    if (text === undefined) {
        return key;
    }
    
    // Replace parameters
    return text.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] !== undefined ? String(params[param]) : match);
};

// Store active pomodoro devices
const activePomodoroDevices = new Map<string, PomodoroDeviceInfo>();

const handleDeviceDisconnect = (deviceId: string): void => {
    if (activePomodoroDevices.has(deviceId)) {
        activePomodoroDevices.delete(deviceId);
    }
};

// Create a menu template for tray based on current pomodoro status
const createTrayMenuTemplate = (): Electron.MenuItemConstructorOptions[] => {
    // Base menu items
    const menuItems: Electron.MenuItemConstructorOptions[] = [
        { 
            label: 'Show Window', 
            click: async (): Promise<void> => {
                if (mainWindow) {
                    mainWindow.show();
                } else {
                    await createWindow();
                }
            } 
        }
    ];
    
    // Add pomodoro status items if any device has active pomodoro
    if (activePomodoroDevices.size > 0) {
        menuItems.push({ type: 'separator' });
        menuItems.push({ label: 'Active Pomodoro Timers', enabled: false });
        
        // Add an entry for each active pomodoro device
        activePomodoroDevices.forEach((deviceInfo, _deviceId) => {
            const { name, phase } = deviceInfo;
            let phaseText = '';
            
            switch (phase) {
                case 1:
                    phaseText = 'Working';
                    break;
                case 2:
                    phaseText = 'Break';
                    break;
                case 3:
                    phaseText = 'Long Break';
                    break;
            }
            
            // Display only the phase without minutes
            menuItems.push({
                label: `${name}: ${phaseText}`,
                enabled: false
            });
        });
    }
    
    // Add quit item
    menuItems.push({ type: 'separator' });
    menuItems.push({ 
        label: 'Quit', 
        click: () => {
            try {
                close();
            } catch (e) {
                // Ignored
            }
            app.exit(0);
        } 
    });
    
    return menuItems;
};

const createTray = (): void => {
    const iconPath = path.join(__dirname, '..', 'icons', '16x16.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    
    // Set default context menu immediately
    const contextMenu = Menu.buildFromTemplate(createTrayMenuTemplate());
    tray.setContextMenu(contextMenu);
    
    tray.setToolTip(translate('header.title'));
    
    // Set up click handler
    tray.on('click', async () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
            }
        } else {
            await createWindow();
        }
    });
};

const createWindow = async (): Promise<void> => {
    // Get window position and size from store
    const windowBounds = store.get('windowBounds');
    const minWidth = 800;
    const minHeight = 600;  
    mainWindow = new BrowserWindow({
        width: windowBounds.width || minWidth,
        height: windowBounds.height || minHeight,
        x: windowBounds.x,
        y: windowBounds.y,
        minWidth: minWidth,
        minHeight: minHeight,
        icon: `${__dirname}/../icons/256x256.png`,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            backgroundThrottling: false,
            nodeIntegration: false,
            contextIsolation: true,
        },
        show: !store.get('backgroundStart'),
    });

    mainWindow.loadURL(`file://${__dirname}/../dist/public/index.html`);
    mainWindow.setMenu(null);

    // Pass the main window reference to modules
    setMainWindow(mainWindow);
    setIpcMainWindow(mainWindow);
    
    // Pass the store reference to modules
    updateAutoLayerSettings(store);
    setIpcStore(store as any);
    
    // Re-inject window monitoring dependencies with the actual store
    injectWindowMonitoringDependencies({
        deviceStatusMap: deviceStatusMap as any,
        settingsStore: store as any,
        writeCommand,
        mainWindow: mainWindow as any
    });
    
    // Monitor window size and position changes
    (['resize', 'move'] as const).forEach(eventName => {
        mainWindow!.on(eventName as any, () => {
            if (!mainWindow!.isMinimized() && !mainWindow!.isMaximized()) {
                const bounds = mainWindow!.getBounds();
                store.set('windowBounds', bounds);
            }
        });
    });

    mainWindow.on('close', (event) => {
        if (store.get('minimizeToTray')) {
            event.preventDefault();
            mainWindow!.hide();
            return;
        }
        
        try {
            close();
        } catch (e) {
            // Ignored
        }
    });
    
    mainWindow.on('minimize', (event) => {
        if (store.get('minimizeToTray')) {
            event.preventDefault();
            mainWindow!.hide();
        }
    });
};

const doubleBoot = app.requestSingleInstanceLock();
if (!doubleBoot) app.quit();

app.setName(translate('header.title'));

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (store.get('minimizeToTray')) {
            return;
        }
        
        try{
            close();
        } catch (e) {
            // Ignored
        }
        app.quit();
    }
});

app.on('ready', async () => {
    createTray();
    await createWindow();
    
    // Setup IPC handlers and events
    setupIpcHandlers();
    setupIpcEvents(activePomodoroDevices, tray, createTrayMenuTemplate);
    
    // Start window monitoring for automatic layer switching
    try {
        startWindowMonitoring(ActiveWindow);
    } catch (error) {
        console.error('[ERROR] Failed to start window monitoring:', error);
    }
    
    if (process.env.NODE_ENV === 'development') {
        mainWindow!.webContents.openDevTools();
    }
});

app.on('activate', async () => {
    if (mainWindow === null) await createWindow();
});

// Export handleDeviceDisconnect for use by IPC handlers
export { handleDeviceDisconnect };