import { app, BrowserWindow, ipcMain, Tray, Menu, dialog, nativeImage } from "electron"
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import dayjs from 'dayjs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
    start, 
    stop, 
    close, 
    getConnectKbd, 
    getKBDList, 
    encodeDeviceId, 
    setMainWindow, 
    setActiveTab,
    setEditingPomodoro,
    startWindowMonitoring,
    getActiveWindows,
    updateAutoLayerSettings,
    gpkRCVersion,
    getDeviceConfig,
    saveDeviceConfig,
    writeTimeToOled
} from './gpkrc.js'
import ActiveWindow from '@paymoapp/active-window'

// Initialize ActiveWindow
ActiveWindow.default.initialize()

// Initialize electron-store
const store = new Store({
    name: 'gpk-utility',
    defaults: {
        autoLayerSettings: {},
        oledSettings: {},
        minimizeToTray: true,
        backgroundStart: false,
        windowBounds: { width: 1280, height: 800, x: undefined, y: undefined }
    }
});

// Store last formatted date for each device
const lastFormattedDateMap = new Map();

let mainWindow
let tray = null

// Handle device disconnection - clear the lastFormattedDateMap entry
const handleDeviceDisconnect = (deviceId) => {
    if (lastFormattedDateMap.has(deviceId)) {
        lastFormattedDateMap.delete(deviceId);
    }
};

const createTray = () => {
    const iconPath = path.join(__dirname, 'icons', '16x16.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Show Window', 
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                } else {
                    createWindow();
                }
            } 
        },
        { 
            label: 'Quit', 
            click: () => {
                try {
                    close();
                } catch (e) {
                    // Remove error log
                }
                app.quit();
            } 
        }
    ]);
    
    tray.setToolTip('GPK Utility');
    tray.setContextMenu(contextMenu);
    
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
        
        try{
            close()
        } catch (e) {
            // Remove error log
        }
        app.quit()
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

app.setName("GPK Utility")

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (store.get('minimizeToTray')) {
            return;
        }
        
        try{
            close()
        } catch (e) {
            // Remove error log
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
        // Remove error log
    });
}

const importFile = async () => {
    const  result = await dialog.showOpenDialog({
        title: 'Import Config File',
        buttonLabel: 'Open',
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
    })

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const file = await fs.readFile(filePath, 'utf-8')
        return file
    }
    return undefined
}

ipcMain.handle('start', async (event, device) => {
    await start(device)
})
ipcMain.handle('stop', async (event, device) => {
    await stop(device)
})
ipcMain.handle('encodeDeviceId', async (event, device) => await encodeDeviceId(device))
ipcMain.handle('getKBDList', async (event) => await getKBDList())
ipcMain.handle('getConnectKbd', async (event, id) => await getConnectKbd(id))
ipcMain.handle('getConfig', async (event, device) => {
    // Get settings from the device
    const result = await getDeviceConfig(device);
    
    const id = encodeDeviceId(device);
    const deviceData = getConnectKbd(id);
    
    // If device data exists and settings are available
    if (deviceData && deviceData.config) {
        // Integrate auto layer settings from electron-store
        try {
            const storedLayerSettings = store.get('autoLayerSettings');
            const storedOledSettingsSettings = store.get('oledSettings');

            if (storedLayerSettings && storedLayerSettings[id]) {
                deviceData.config.auto_layer_enabled = storedLayerSettings[id].enabled ? 1 : 0;
                deviceData.config.auto_layer_settings = storedLayerSettings[id].layerSettings || [];
            }
            if (storedOledSettingsSettings && storedOledSettingsSettings[id]) {
                deviceData.config.oledSettings = storedOledSettingsSettings[id] || [];
            }
        } catch (error) {
            // Do nothing on error
        }
        
        // Notify renderer process
        mainWindow.webContents.send("pomodoroStateUpdated", {
            deviceId: id,
            config: deviceData.config,
            identifier: deviceData.identifier
        });
    }
    
    return result;
})

ipcMain.on("changeConnectDevice", (e, data) => {
    mainWindow.webContents.send("changeConnectDevice", data)
})

ipcMain.handle('sleep', async (event, msec) => {
    await sleep(msec)
})

ipcMain.handle("sendDeviceConfig", async (e, data) => {
    try {
        // Convert settings to byte array
        const byteArray = [];
        
        // Validate required properties
        const requiredProps = [
            'init', 'hf_waveform_number', 'can_hf_for_layer', 'can_drag', 
            'scroll_term', 'drag_term', 'can_trackpad_layer', 'can_reverse_scrolling_direction', 
            'drag_strength_mode', 'drag_strength', 'default_speed', 'scroll_step', 
            'can_short_scroll', 'pomodoro_work_time', 
            'pomodoro_break_time', 'pomodoro_long_break_time', 'pomodoro_cycles', 
            'pomodoro_work_hf_pattern', 'pomodoro_break_hf_pattern', 'pomodoro_long_break_hf_pattern'
        ];
        
        // Check for missing properties
        const missingProps = requiredProps.filter(prop => 
            data.config[prop] === undefined || data.config[prop] === null
        );
        
        if (missingProps.length > 0) {
            throw new Error(`Missing required properties: ${missingProps.join(', ')}`);
        }
        
        // Ensure all values are numeric type before bit operations
        const nonNumericProps = requiredProps.filter(prop => 
            typeof data.config[prop] !== 'number'
        );
        
        if (nonNumericProps.length > 0) {
            throw new Error(`Non-numeric properties found: ${nonNumericProps.join(', ')} (values: ${
                nonNumericProps.map(prop => `${prop}=${JSON.stringify(data.config[prop])}`).join(', ')
            })`);
        }
        
        // Build byte array
        const upper_scroll_term = (data.config.scroll_term & 0b1111110000) >> 4;
        const lower_drag_term = (data.config.drag_term & 0b1111000000) >> 6;
        const lower_default_speed = (data.config.default_speed & 0b110000) >> 4;

        byteArray[0] = data.config.init | data.config.hf_waveform_number << 1;
        byteArray[1] = data.config.can_hf_for_layer << 7 |
            data.config.can_drag << 6 |
            upper_scroll_term;
        byteArray[2] = (data.config.scroll_term & 0b0000001111) << 4 | lower_drag_term;
        byteArray[3] = (data.config.drag_term & 0b0000111111) << 2 |
            data.config.can_trackpad_layer << 1 |
            data.config.can_reverse_scrolling_direction;
        byteArray[4] = data.config.drag_strength_mode << 7 |
            data.config.drag_strength << 2 |
            lower_default_speed;
        byteArray[5] = (data.config.default_speed & 0b001111) << 4 |
            data.config.scroll_step;
        byteArray[6] = data.config.can_short_scroll << 7;
        byteArray[7] = data.config.pomodoro_work_time;
        byteArray[8] = data.config.pomodoro_break_time;
        byteArray[9] = data.config.pomodoro_long_break_time;
        byteArray[10] = data.config.pomodoro_cycles;
        byteArray[11] = data.config.pomodoro_work_hf_pattern;
        byteArray[12] = data.config.pomodoro_break_hf_pattern;
        byteArray[13] = data.config.pomodoro_long_break_hf_pattern;
        
        // Validate byte array
        for (let i = 0; i < byteArray.length; i++) {
            if (byteArray[i] === undefined) {
                throw new Error(`Byte array index ${i} is undefined. Please check the value of the corresponding property.`);
            }
        }

        // Send settings to device
        await saveDeviceConfig(data, byteArray);
        
        // Shorten sleep time for immediate reflection of settings changes
        await sleep(100);
        
        // Immediately send settings change notification
        mainWindow.webContents.send("configUpdated", {
            deviceId: data.id,
            config: data.config,
            identifier: data.identifier
        });
        
        // If pomodoro-related settings are changed, reset isEditingPomodoro flag
        const isPomodoroConfig = Object.keys(data.config).some(key => key.startsWith('pomodoro_'));
        if (isPomodoroConfig) {
            setEditingPomodoro(data, false);
            
            // Immediately get the latest status after settings change
            await getDeviceConfig(data);
        } else {
            // Start async task to get the latest settings immediately after change
            setTimeout(async () => {
                try {
                    await getDeviceConfig(data);
                } catch (e) {}
            }, 150);
        }
        
        return { success: true, config: data.config };
    } catch (error) {
        return { success: false, error: error.message };
    }
})

ipcMain.handle('exportFile', async (event, data) => await exportFile(data))
ipcMain.handle('importFile', async (event, fn) => await importFile(fn))

// Tab switch handler
ipcMain.handle('setActiveTab', async (event, device, tabName) => {
    setActiveTab(device, tabName)
})

// Pomodoro editing flag handler
ipcMain.handle('setEditingPomodoro', async (event, device, isEditing) => {
    setEditingPomodoro(device, isEditing)
})

// Window monitoring control
ipcMain.handle('startWindowMonitoring', async (event) => {
    startWindowMonitoring(ActiveWindow);
    return true;
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
ipcMain.handle('dateTimeOledWrite', async (event, device) => {
    try {
        // Format date using dayjs
        const formattedDate = dayjs().format('YYYY/MM/DD ddd HH:mm ');
        const deviceId = encodeDeviceId(device);
        // Check if the formatted date is the same as the last one for this device
        if (lastFormattedDateMap.get(deviceId) === formattedDate) {
            // Same date, skip writing to OLED
            return { success: true, skipped: true };
        }
        
        // Write to OLED and store the new formatted date
        await writeTimeToOled(device, formattedDate);
        lastFormattedDateMap.set(deviceId, formattedDate);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('gpkRCVersion', async (event, device) => {
    try {
        return await gpkRCVersion(device);;
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

