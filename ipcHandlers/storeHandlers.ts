import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

import { ipcMain, BrowserWindow } from "electron";
import type Store from 'electron-store';

import { updateAutoLayerSettings } from '../gpkrc';
import type { StoreSchema } from '../src/types/store';
import type { StoreSettings, AutoLayerSetting } from '../preload/types';
import type { 
    SaveResult, 
    NotificationResult,
    TranslationParams,
    AppVersionInfo
} from '../src/types/api-types';
import type { SettingsResponse } from '../src/types/ipc-responses';
import enTranslations from '../src/i18n/locales/en.ts';

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
const translate = (key: string, params: TranslationParams = {}): string => {
    const locale = store.get('locale') || 'en';
    const translations = enTranslations;
    
    // Get nested value from translations using key path
    const getValue = (obj: unknown, path: string): unknown => {
        return path.split('.').reduce((o: unknown, i: string): unknown => {
            if (o && typeof o === 'object' && i in o) {
                return (o as Record<string, unknown>)[i];
            }
            return undefined;
        }, obj);
    };
    
    let text = getValue(translations, key);
    
    // Fall back to English if translation not found
    if ((text === undefined || text === null) && locale !== 'en') {
        text = getValue(enTranslations, key);
    }
    
    // If still undefined or null, return key
    if (text === undefined || text === null || typeof text !== 'string') {
        return key;
    }
    
    // Replace parameters
    return text.replace(/\{\{(\w+)\}\}/g, (match: string, param: string): string => params[param] !== undefined ? String(params[param]) : match);
};

export const setupStoreHandlers = (): void => {
    // OLED settings saving
    ipcMain.handle('saveOledSettings', async (event, deviceId: string, enabled: boolean): Promise<SaveResult> => {
        try {
            // Get current settings
            const currentSettings = store.get('oledSettings') || {};
            
            // Update settings for this device
            currentSettings[deviceId] = { enabled };
            
            // Save settings
            store.set('oledSettings', currentSettings);
            
            // Notify OLED settings change
            if (mainWindow) {
                mainWindow.webContents.send("oledSettingsChanged", { deviceId, enabled });
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // OLED settings loading
    ipcMain.handle('loadOledSettings', async (event, deviceId: string): Promise<NotificationResult> => {
        try {
            // Load settings from electron-store
            const settings = store.get('oledSettings') || {};

            // Return settings for this device
            const enabled = settings[deviceId]?.enabled;
            return { 
                success: true, 
                ...(enabled !== undefined && { enabled })
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Tray settings saving
    ipcMain.handle('saveTraySettings', async (event, settings: { minimizeToTray?: boolean; backgroundStart?: boolean }): Promise<SaveResult> => {
        try {
            // Save settings to electron-store
            if (settings.minimizeToTray !== undefined) {
                store.set('minimizeToTray', settings.minimizeToTray);
            }
            
            if (settings.backgroundStart !== undefined) {
                store.set('backgroundStart', settings.backgroundStart);
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Tray settings loading
    ipcMain.handle('loadTraySettings', async (_event): Promise<SaveResult & { minimizeToTray?: boolean; backgroundStart?: boolean }> => {
        try {
            // Load settings from electron-store
            const minimizeToTray = store.get('minimizeToTray');
            const backgroundStart = store.get('backgroundStart');
            return { 
                success: true, 
                ...(minimizeToTray !== undefined && { minimizeToTray }),
                ...(backgroundStart !== undefined && { backgroundStart })
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Window position and size saving
    ipcMain.handle('saveWindowBounds', async (event, bounds: { width: number; height: number; x?: number; y?: number }): Promise<SaveResult> => {
        try {
            // Save window position and size to electron-store
            store.set('windowBounds', bounds);
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Window position and size loading
    ipcMain.handle('loadWindowBounds', async (_event): Promise<SaveResult & { bounds?: { width: number; height: number; x?: number; y?: number } }> => {
        try {
            // Load window position and size from electron-store
            const bounds = store.get('windowBounds');
            
            return { 
                success: true, 
                bounds: bounds || { width: 1280, height: 800, x: undefined, y: undefined }
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Set application locale
    ipcMain.handle('setAppLocale', async (event, locale: string): Promise<SaveResult> => {
        try {
            // Save locale to electron-store
            store.set('locale', locale);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Get application locale
    ipcMain.handle('getAppLocale', async (_event): Promise<string> => {
        try {
            // Return current locale from electron-store
            return store.get('locale') || 'en';
        } catch {
            return 'en'; // Default to English on error
        }
    });

    // Translate a string using the current locale
    ipcMain.handle('translate', async (event, key: string, params: Record<string, string | number> = {}): Promise<string> => {
        try {
            return translate(key, params);
        } catch (error) {
            console.error(`Error translating key ${key}:`, error);
            return key; // Return the key itself as fallback
        }
    });

    // Save pomodoro notification settings
    ipcMain.handle('savePomodoroDesktopNotificationSettings', async (event, deviceId: string, enabled: boolean): Promise<SaveResult> => {
        try {
            // Get current settings
            const currentSettings = store.get('pomodoroDesktopNotificationsSettings') || {};
            
            // Update settings for this device
            currentSettings[deviceId] = enabled;
            
            // Save settings
            store.set('pomodoroDesktopNotificationsSettings', currentSettings);
            
            return { success: true };
        } catch (error) {
            console.error("Error saving pomodoro notification settings:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Load pomodoro notification settings
    ipcMain.handle('loadPomodoroDesktopNotificationSettings', async (event, deviceId: string): Promise<NotificationResult> => {
        try {
            // Load settings from electron-store
            const settings = store.get('pomodoroDesktopNotificationsSettings') || {};
            
            // Return settings for this device, use stored value if exists, default to true only if completely undefined
            let enabled = true; // Default value is true
            
            if (settings[deviceId] !== undefined) {
                enabled = settings[deviceId] === true; // Use stored value if it exists
            }
            
            return { 
                success: true, 
                enabled: enabled
            };
        } catch (error) {
            console.error("Error loading pomodoro notification settings:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Get all store settings at once
    ipcMain.handle('getAllStoreSettings', async (_event): Promise<SettingsResponse> => {
        try {
            // Get all relevant settings from store
            const settings = {
                autoLayerSettings: store.get('autoLayerSettings') || {},
                oledSettings: store.get('oledSettings') || {},
                pomodoroDesktopNotificationsSettings: store.get('pomodoroDesktopNotificationsSettings') || {},
                savedNotifications: store.get('savedNotifications') || [],
                traySettings: {
                    minimizeToTray: store.get('minimizeToTray'),
                    backgroundStart: store.get('backgroundStart')
                },
                locale: store.get('locale') || 'en'
            };
            
            return { success: true, settings };
        } catch (error) {
            console.error("Error getting all store settings:", error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Save a specific setting by key
    ipcMain.handle('saveStoreSetting', async (event, { key, value }: { key: keyof StoreSettings; value: StoreSettings[keyof StoreSettings] }): Promise<SaveResult> => {
        try {
            if (!key) {
                throw new Error("Setting key is required");
            }
            
            store.set(key, value);
            
            // Special handling for certain settings
            if (key === 'autoLayerSettings' && typeof value === 'object' && value !== null) {
                updateAutoLayerSettings(store);
                
                // Notify when Auto Layer settings are updated
                for (const deviceId in value as Record<string, AutoLayerSetting>) {
                    if (mainWindow) {
                        mainWindow.webContents.send("configSaveComplete", {
                            deviceId,
                            success: true,
                            timestamp: Date.now(),
                            settingType: 'autoLayer'
                        });
                    }
                }
            } else if (key === 'oledSettings' && typeof value === 'object' && value !== null) {
                // Find the changed device ID and enabled status
                const previousSettings = store.get('oledSettings') || {};
                const oledSettings = value as Record<string, { enabled: boolean }>;
                for (const deviceId in oledSettings) {
                    if (previousSettings[deviceId]?.enabled !== oledSettings[deviceId]?.enabled) {
                        if (mainWindow) {
                            mainWindow.webContents.send("oledSettingsChanged", { 
                                deviceId, 
                                enabled: oledSettings[deviceId]?.enabled 
                            });
                            
                            // Notify that the settings have been saved
                            mainWindow.webContents.send("configSaveComplete", {
                                deviceId,
                                success: true,
                                timestamp: Date.now(),
                                settingType: 'oled'
                            });
                        }
                    }
                }
            } else if (key === 'pomodoroDesktopNotificationsSettings' && typeof value === 'object' && value !== null) {
                // Notify when pomodoro notification settings are updated
                for (const deviceId in value as Record<string, boolean>) {
                    if (mainWindow) {
                        mainWindow.webContents.send("configSaveComplete", {
                            deviceId,
                            success: true,
                            timestamp: Date.now(),
                            settingType: 'pomodoroNotifications'
                        });
                    }
                }
            }
            
            return { success: true };
        } catch (error) {
            console.error(`Error saving store setting ${key}:`, error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Get application info from package.json
    ipcMain.handle('getAppInfo', async (): Promise<AppVersionInfo> => {
        try {
            // Import package.json using dynamic import
            const packageJsonPath = path.join(__dirname, '../package.json');
            const packageData = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            return {
                name: packageData.description || translate('header.title'),
                version: packageData.version,
                author: packageData.author,
                homepage: packageData.homepage
            };
        } catch (error) {
            console.error('Error reading package.json:', error);
            return {
                name: translate('header.title'),
                version: 'unknown',
                description: '',
                author: {},
                homepage: ''
            };
        }
    });

    // Open external links
    ipcMain.handle('openExternalLink', async (event, url: string): Promise<SaveResult> => {
        const { shell } = await import('electron');
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external link:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Get store file path
    ipcMain.handle('getStoreFilePath', async (): Promise<SaveResult & { path?: string | null }> => {
        try {
            const storePath = store ? store.path : null;
            return { success: true, path: storePath };
        } catch (error) {
            console.error('Error getting store file path:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
};