import { app, BrowserWindow, ipcMain, Tray, Menu, dialog, nativeImage, Notification } from "electron"
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if(process.platform==='linux') {
    app.commandLine.appendArgument("--no-sandbox");
}

// Import translation utilities
import enTranslations from './src/i18n/locales/en.js';
import {
    start, 
    stop, 
    close, 
    getConnectKbd, 
    getKBDList, 
    encodeDeviceId, 
    setMainWindow, 
    setActiveTab,
    startWindowMonitoring,
    getActiveWindows,
    getDeviceType,
    updateAutoLayerSettings,
    getDeviceInitConfig,
    getDeviceConfig,
    getPomodoroConfig,
    writeTimeToOled,
    saveTrackpadConfig,
    savePomodoroConfigData,
    getPomodoroActiveStatus,
    getTrackpadConfigData
} from './gpkrc.js'
import ActiveWindow from '@paymoapp/active-window'

// Initialize ActiveWindow
ActiveWindow.default.initialize()

// Global variables
let mainWindow;
let tray = null;

// Initialize electron-store
const store = new Store({
    name: 'gpk-utility',
    defaults: {
        autoLayerSettings: {},
        oledSettings: {},
        pomodoroDesktopNotificationsSettings: {},
        savedNotifications: [],
        minimizeToTray: true,
        backgroundStart: false,
        windowBounds: { width: 1280, height: 800, x: undefined, y: undefined },
        locale: 'en',
        notificationApiEndpoint: 'https://getnotifications-svtx62766a-uc.a.run.app'
    }
});

// Translation utility function
const translate = (key, params = {}) => {
    const locale = store.get('locale') || 'en';
    let translations = enTranslations;
    
    // Get nested value from translations using key path
    const getValue = (obj, path) => {
        return path.split('.').reduce((o, i) => (o && o[i] !== undefined) ? o[i] : undefined, obj);
    };
    
    let text = getValue(translations, key);
    
    // Fall back to English if translation not found
    if (text === undefined && locale !== 'en') {
        text = getValue(enTranslations, key);
    }
    
    // If still undefined, return key
    if (text === undefined) {
        return key;
    }
    
    // Replace parameters
    return text.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] !== undefined ? params[param] : match);
};
// Store active pomodoro devices
const activePomodoroDevices = new Map();

const handleDeviceDisconnect = (deviceId) => {
    if (activePomodoroDevices.has(deviceId)) {
        activePomodoroDevices.delete(deviceId);
    }
};

// Create a menu template for tray based on current pomodoro status
const createTrayMenuTemplate = () => {
    // Base menu items
    const menuItems = [
        { 
            label: 'Show Window', 
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                } else {
                    createWindow();
                }
            } 
        }
    ];
    
    // Add pomodoro status items if any device has active pomodoro
    if (activePomodoroDevices.size > 0) {
        menuItems.push({ type: 'separator' });
        menuItems.push({ label: 'Active Pomodoro Timers', enabled: false });
        
        // Add an entry for each active pomodoro device
        activePomodoroDevices.forEach((deviceInfo, deviceId) => {
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
}

const createTray = () => {
    const iconPath = path.join(__dirname, 'icons', '16x16.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    
    // Set default context menu immediately
    const contextMenu = Menu.buildFromTemplate(createTrayMenuTemplate());
    tray.setContextMenu(contextMenu);
    
    tray.setToolTip(translate('header.title'));
    
    // Set up click handler
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
            }
        } else {
            createWindow();
        }
    });
}

const createWindow = () => {
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
        icon: `${__dirname}/icons/256x256.png`,
        webPreferences: {
            preload: __dirname + '/preload.cjs',
            backgroundThrottling: false,
        },
        show: !store.get('backgroundStart'),
    })

    mainWindow.loadURL(`file://${__dirname}/public/index.html`)
    mainWindow.setMenu(null)

    // Pass the main window reference to gpkrc module
    setMainWindow(mainWindow);
    
    // Pass the store reference to gpkrc module (initialize on startup)
    updateAutoLayerSettings(store);
    
    // Monitor window size and position changes
    ['resize', 'move'].forEach(eventName => {
        mainWindow.on(eventName, () => {
            if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
                const bounds = mainWindow.getBounds();
                store.set('windowBounds', bounds);
            }
        });
    });

    mainWindow.on('close', (event) => {
        if (store.get('minimizeToTray')) {
            event.preventDefault();
            mainWindow.hide();
            return;
        }
        
        try {
            close()
        } catch (e) {
            // Ignored
        }
    })
    
    mainWindow.on('minimize', (event) => {
        if (store.get('minimizeToTray')) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

const doubleBoot = app.requestSingleInstanceLock()
if (!doubleBoot) app.quit()

app.setName(translate('header.title'))

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (store.get('minimizeToTray')) {
            return;
        }
        
        try{
            close()
        } catch (e) {
            // Ignored
        }
        app.quit()
    }
})

app.on('ready', () => {
    createTray();
    createWindow();
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
})

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
            icon: path.join(__dirname, 'icons', '256x256.png')
        }).show();
    }
})

app.on('activate', () => {
    if (mainWindow === null) createWindow()
})

ipcMain.on("connectDevice", (e, data) => {
    mainWindow.webContents.send("isConnectDevice", data)
})

const sleep = async (msec) => new Promise(resolve => setTimeout(resolve, msec))

const exportFile = (data) => {
    dialog.showSaveDialog({
        title: 'Export Config File',
        defaultPath: 'gpk_utility.json',
        buttonLabel: 'Save',
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    }).then(async result  => {
        if (!result.canceled) {
            await fs.writeFile(result.filePath, JSON.stringify(data, null, 2))
        }
    }).catch(err => {
        // Ignore errors
    });
}

const importFile = async () => {
    try {
        const result = await dialog.showOpenDialog({
            title: 'Import Config File',
            buttonLabel: 'Open',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        
        const filePath = result.filePaths[0];
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return fileContent;
        } catch (readErr) {
            console.error(`Error reading file ${filePath}:`, readErr);
            throw new Error(`Failed to read file: ${readErr.message}`);
        }
    } catch (err) {
        console.error("Error in import file dialog:", err);
        throw err;
    }
}

ipcMain.handle('start', async (event, device) => {
    await start(device)
})
ipcMain.handle('stop', async (event, device) => {
    await stop(device)
})
ipcMain.handle('close', async (event) => {
    await close()
})
ipcMain.handle('encodeDeviceId', async (event, device) => await encodeDeviceId(device))
ipcMain.handle('getKBDList', async (event) => await getKBDList())
ipcMain.handle('getDeviceType', (event) => getDeviceType())
ipcMain.handle('getConnectKbd', async (event, id) => await getConnectKbd(id))
ipcMain.on("changeConnectDevice", (e, data) => {
    mainWindow.webContents.send("changeConnectDevice", data)
})
ipcMain.handle('getDeviceConfig', async (event, device) => await getDeviceConfig(device))
ipcMain.handle('getPomodoroConfig', async (event, device) => await getPomodoroConfig(device))
// Add handlers for new specific config functions
ipcMain.handle('getPomodoroActiveStatus', async (event, device) => await getPomodoroActiveStatus(device));
ipcMain.handle('getTrackpadConfigData', async (event, device) => await getTrackpadConfigData(device));
ipcMain.handle('saveTrackpadConfig', async (event, device) => {
    try {
        // Get trackpad settings from device object
        if (!device || !device.config || !device.config.trackpad) {
            return { success: false, error: "Invalid device or missing trackpad configuration" };
        }
        
        // Generate byte array in the main process
        const trackpadBytes = buildTrackpadConfigByteArray(device.config.trackpad, device.config.init || 0);
        
        // Call GPKRC to send settings to the device
        await saveTrackpadConfig(device, trackpadBytes);
        return { success: true };
    } catch (error) {
        console.error("Error in saveTrackpadConfig:", error);
        return { success: false, error: error.message };
    }
});
ipcMain.handle('savePomodoroConfigData', async (event, device, pomodoroDataBytes) => {
    try {
        await savePomodoroConfigData(device, pomodoroDataBytes);
        return { success: true };
    } catch (error) {
        console.error("Error in savePomodoroConfigData:", error);
        return { success: false, error: error.message };
    }
});

// Replace the old sendDeviceConfig handler with dispatchSaveDeviceConfig
ipcMain.handle('dispatchSaveDeviceConfig', async (event, deviceWithConfig, configTypes) => {
    try {
        if (!deviceWithConfig || !deviceWithConfig.config) {
            throw new Error("Invalid device format: missing config");
        }

        // Convert configTypes to array if it's a string
        const typesToUpdate = Array.isArray(configTypes) ? configTypes : [configTypes];
        const updateAll = typesToUpdate.includes('all');
        
        let trackpadSaved = false;
        let pomodoroSaved = false;
        // Handle trackpad config
        if ((updateAll || typesToUpdate.includes('trackpad')) && deviceWithConfig.config.trackpad) {
            // Use the existing local function
            const trackpadBytes = buildTrackpadConfigByteArray(deviceWithConfig.config.trackpad);
            saveTrackpadConfig(deviceWithConfig, trackpadBytes); // Deliberately not awaiting to prevent UI sluggishness
            trackpadSaved = true;
        }

        // Handle pomodoro config
        if ((updateAll || typesToUpdate.includes('pomodoro')) && deviceWithConfig.config.pomodoro) {
            const pomodoroBytes = buildPomodoroConfigByteArray(deviceWithConfig.config.pomodoro);
            savePomodoroConfigData(deviceWithConfig, pomodoroBytes); // Deliberately not awaiting to prevent UI sluggishness
            pomodoroSaved = true;
        }

        if (trackpadSaved || pomodoroSaved) {
            // Send configUpdated event to UI for immediate feedback before device state updates
            mainWindow.webContents.send("configUpdated", {
                deviceId: deviceWithConfig.id,
                config: deviceWithConfig.config // Send the config that was intended to be saved
            });
            return { 
                success: true, 
                message: "Device config dispatched for saving.",
                updates: {
                    trackpad: trackpadSaved,
                    pomodoro: pomodoroSaved
                }
            };
        } else {
            return { success: false, message: "No config found to save for the specified types." };
        }

    } catch (error) {
        console.error("Error in dispatchSaveDeviceConfig:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('exportFile', async (event, data) => await exportFile(data))
ipcMain.handle('importFile', async (event, fn) => await importFile(fn))

// Tab switch handler
ipcMain.handle('setActiveTab', async (event, device, tabName) => {
    setActiveTab(device, tabName)
})

// Window monitoring control
ipcMain.handle('startWindowMonitoring', async (event) => {
    startWindowMonitoring(ActiveWindow);
});

// Active window list retrieval handler
ipcMain.handle('getActiveWindows', async (event) => {
    return getActiveWindows();
});

// Save auto layer settings
ipcMain.handle('saveAutoLayerSettings', async (event, settings) => {
    try {
        // Save settings to electron-store
        store.set('autoLayerSettings', settings);
        
        // Pass store to gpkrc.js
        updateAutoLayerSettings(store);
        
        // Send save completion notification to devices with changed settings
        for (const deviceId in settings) {
            mainWindow.webContents.send("configSaveComplete", {
                deviceId,
                success: true,
                timestamp: Date.now(),
                settingType: 'autoLayer'
            });
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Load auto layer settings
ipcMain.handle('loadAutoLayerSettings', async (event) => {
    try {
        // Load settings from electron-store
        const settings = store.get('autoLayerSettings');
        
        // Pass store to gpkrc.js
        updateAutoLayerSettings(store);
        
        return { success: true, settings };
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

ipcMain.handle('getDeviceInitConfig', async (event, device) => {
    try {
        return await getDeviceInitConfig(device);
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// OLED settings saving
ipcMain.handle('saveOledSettings', async (event, deviceId, enabled) => {
    try {
        // Get current settings
        const currentSettings = store.get('oledSettings') || {};
        
        // Update settings for this device
        currentSettings[deviceId] = { enabled };
        
        // Save settings
        store.set('oledSettings', currentSettings);
        
        // Notify OLED settings change
        mainWindow.webContents.send("oledSettingsChanged", { deviceId, enabled });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// OLED settings loading
ipcMain.handle('loadOledSettings', async (event, deviceId) => {
    try {
        // Load settings from electron-store
        const settings = store.get('oledSettings') || {};

        // Return settings for this device
        return { 
            success: true, 
            enabled: settings[deviceId]?.enabled
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Tray settings saving
ipcMain.handle('saveTraySettings', async (event, settings) => {
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
        return { success: false, error: error.message };
    }
});

// Tray settings loading
ipcMain.handle('loadTraySettings', async (event) => {
    try {
        // Load settings from electron-store
        return { 
            success: true, 
            minimizeToTray: store.get('minimizeToTray'),
            backgroundStart: store.get('backgroundStart')
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Window position and size saving
ipcMain.handle('saveWindowBounds', async (event, bounds) => {
    try {
        // Save window position and size to electron-store
        store.set('windowBounds', bounds);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Window position and size loading
ipcMain.handle('loadWindowBounds', async (event) => {
    try {
        // Load window position and size from electron-store
        const bounds = store.get('windowBounds');
        
        return { 
            success: true, 
            bounds: bounds || { width: 1280, height: 800, x: undefined, y: undefined }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Device disconnection handler
ipcMain.on('deviceDisconnected', (event, deviceId) => {
    // Remove the corresponding entry from lastFormattedDateMap
    handleDeviceDisconnect(deviceId);
});

// Convert trackpad config object to byte array for device communication
const buildTrackpadConfigByteArray = (trackpadConfig) => {
    const byteArray = new Array(19); // 19 bytes for updated trackpad config
    const upper_scroll_term = (trackpadConfig.scroll_term & 0b1111110000) >> 4;
    const lower_drag_term = (trackpadConfig.drag_term & 0b1111000000) >> 6;
    const lower_default_speed = (trackpadConfig.default_speed & 0b110000) >> 4;
    byteArray[0] = trackpadConfig.hf_waveform_number;
    byteArray[1] = trackpadConfig.can_hf_for_layer << 7 |
        trackpadConfig.can_drag << 6 |
        upper_scroll_term;
    byteArray[2] = (trackpadConfig.scroll_term & 0b0000001111) << 4 | lower_drag_term;
    byteArray[3] = (trackpadConfig.drag_term & 0b0000111111) << 2 |
        trackpadConfig.can_trackpad_layer << 1 |
        trackpadConfig.can_reverse_scrolling_direction;
    byteArray[4] = trackpadConfig.drag_strength_mode << 7 |
        trackpadConfig.drag_strength << 2 |
        lower_default_speed;
    byteArray[5] = (trackpadConfig.default_speed & 0b001111) << 4 |
        trackpadConfig.scroll_step;
    byteArray[6] = trackpadConfig.can_short_scroll << 7;
    
    // Updated for 2-byte values - high byte, low byte for each value
    byteArray[7] = (trackpadConfig.tap_term || 0) >> 8;     
    byteArray[8] = (trackpadConfig.tap_term || 0) & 0xFF;   
    
    byteArray[9] = (trackpadConfig.swipe_term || 0) >> 8;    
    byteArray[10] = (trackpadConfig.swipe_term || 0) & 0xFF; 
    
    byteArray[11] = (trackpadConfig.pinch_term || 0) >> 8;    
    byteArray[12] = (trackpadConfig.pinch_term || 0) & 0xFF;  
    
    byteArray[13] = (trackpadConfig.gesture_term || 0) >> 8;    
    byteArray[14] = (trackpadConfig.gesture_term || 0) & 0xFF;  
    
    byteArray[15] = (trackpadConfig.short_scroll_term || 0) >> 8;        
    byteArray[16] = (trackpadConfig.short_scroll_term || 0) & 0xFF;  
    
    byteArray[17] = (trackpadConfig.pinch_distance || 0) >> 8;        
    byteArray[18] = (trackpadConfig.pinch_distance || 0) & 0xFF;  
    
    return byteArray;
};

// Convert pomodoro config object to byte array for device communication
const buildPomodoroConfigByteArray = (pomodoroConfig) => {
    const byteArray = new Array(8); // 8 bytes for pomodoro config
    byteArray[0] = pomodoroConfig.work_time;
    byteArray[1] = pomodoroConfig.break_time;
    byteArray[2] = pomodoroConfig.long_break_time;
    byteArray[3] = pomodoroConfig.work_interval;
    byteArray[4] = pomodoroConfig.work_hf_pattern;
    byteArray[5] = pomodoroConfig.break_hf_pattern;    
    // Combine timer_active (bit 7), notify_haptic_enable (bit 6), continuous_mode (bit 5), and state (bits 0-1)
    byteArray[6] = ((pomodoroConfig.timer_active || 0) << 7) | 
                   ((pomodoroConfig.notify_haptic_enable || 0) << 6) | 
                   ((pomodoroConfig.continuous_mode || 0) << 5) | 
                   ((pomodoroConfig.phase || 0) & 0b00000011);
    byteArray[7] = pomodoroConfig.pomodoro_cycle || 1; // Default to 1 if not defined

    return byteArray;
};

// Set application locale
ipcMain.handle('setAppLocale', async (event, locale) => {
    try {
        // Save locale to electron-store
        store.set('locale', locale);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Get application locale
ipcMain.handle('getAppLocale', async (event) => {
    try {
        // Return current locale from electron-store
        return store.get('locale') || 'en';
    } catch (error) {
        return 'en'; // Default to English on error
    }
});

// Translate a string using the current locale
ipcMain.handle('translate', async (event, key, params = {}) => {
    try {
        return translate(key, params);
    } catch (error) {
        console.error(`Error translating key ${key}:`, error);
        return key; // Return the key itself as fallback
    }
});

// Save pomodoro notification settings
ipcMain.handle('savePomodoroDesktopNotificationSettings', async (event, deviceId, enabled) => {
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
        return { success: false, error: error.message };
    }
});

// Load pomodoro notification settings
ipcMain.handle('loadPomodoroDesktopNotificationSettings', async (event, deviceId) => {
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
        return { success: false, error: error.message };
    }
});

// Get all store settings at once
ipcMain.handle('getAllStoreSettings', async (event) => {
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
        return { success: false, error: error.message };
    }
});

// Save a specific setting by key
ipcMain.handle('saveStoreSetting', async (event, { key, value }) => {
    try {
        if (!key) {
            throw new Error("Setting key is required");
        }
        
        store.set(key, value);
        
        // Special handling for certain settings
        if (key === 'autoLayerSettings') {
            updateAutoLayerSettings(store);
            
            // Notify when Auto Layer settings are updated
            for (const deviceId in value) {
                mainWindow.webContents.send("configSaveComplete", {
                    deviceId,
                    success: true,
                    timestamp: Date.now(),
                    settingType: 'autoLayer'
                });
            }
        } else if (key === 'oledSettings') {
            // Find the changed device ID and enabled status
            const previousSettings = store.get('oledSettings') || {};
            for (const deviceId in value) {
                if (previousSettings[deviceId]?.enabled !== value[deviceId]?.enabled) {
                    mainWindow.webContents.send("oledSettingsChanged", { 
                        deviceId, 
                        enabled: value[deviceId]?.enabled 
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
        } else if (key === 'pomodoroDesktopNotificationsSettings') {
            // Notify when pomodoro notification settings are updated
            for (const deviceId in value) {
                mainWindow.webContents.send("configSaveComplete", {
                    deviceId,
                    success: true,
                    timestamp: Date.now(),
                    settingType: 'pomodoroNotifications'
                });
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error(`Error saving store setting ${key}:`, error);
        return { success: false, error: error.message };
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
                            icon: path.join(__dirname, 'icons', '256x256.png')
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

// Get application info from package.json
ipcMain.handle('getAppInfo', async () => {
  try {
    // Import package.json using dynamic import
    const packageJsonPath = path.join(__dirname, 'package.json');
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
ipcMain.handle('openExternalLink', async (event, url) => {
  const { shell } = await import('electron');
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening external link:', error);
    return { success: false, error: error.message };
  }
});