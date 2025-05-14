import { config } from 'dotenv'
import HID from 'node-hid'

let deviceStatusMap = {}
let hidDeviceInstances = {}
// Object to manage tab state for each device
let activeTabPerDevice = {}
// Object to manage whether pomodoro settings are being edited
let isEditingPomodoroPerDevice = {}
// Store active windows history
let activeWindows = []
let settingsStore = null
let currentLayers = {} // Track current layer for each device

// Command ID definitions
const commandId = {
    gpkRCPrefix: 0xFA,
    gpkRCInfo: 0x01,
    customSetValue: 0x02,
    customGetValue: 0x03,
    layerMove: 0x04,
    oledWrite: 0x05,
    pomodoroGetValue: 0x06,
}

const PACKET_PADDING = 64
const DEVICE_ID_SEPARATOR = '::'

const dataToBytes = (data) => {
    if (typeof data === 'string') {
        return [...data].map(c => c.charCodeAt(0)).concat(0);
    } else if (Array.isArray(data)) {
        // Convert undefined values to 0
        return data.map(item => item === undefined ? 0 : item);
    }
    return data;
}

const commandToBytes = ({ id, data }) => {
    const bytes = data ? dataToBytes(data) : []
    const unpadded = [
        0, 
        commandId.gpkRCPrefix, 
        id,
        ...bytes
    ]
    const padding = Array(PACKET_PADDING - (unpadded.length % PACKET_PADDING)).fill(0)
    return unpadded.concat(padding)
}

const DEFAULT_USAGE = {
    usage: 0x61,
    usagePage: 0xFF60
}

const encodeDeviceId = (device) => `${device.manufacturer}${DEVICE_ID_SEPARATOR}${device.product}${DEVICE_ID_SEPARATOR}${device.vendorId}${DEVICE_ID_SEPARATOR}${device.productId}`

const parseDeviceId = (id) => {
    const deviceKeys = id.split(DEVICE_ID_SEPARATOR)
    if (deviceKeys.length >= 4) {
        return {
            manufacturer: deviceKeys[0],
            product: deviceKeys[1],
            vendorId: parseInt(deviceKeys[2], 10),
            productId: parseInt(deviceKeys[3], 10),
            id
        }
    }
    return null
}

const getKBD = (device) => HID.devices().find(d =>
    (device ?
        (d.manufacturer === device.manufacturer &&
            d.product === device.product &&
            d.vendorId === device.vendorId &&
            d.productId === device.productId) : false) &&
    d.usage === DEFAULT_USAGE.usage &&
    d.usagePage === DEFAULT_USAGE.usagePage
)

const getKBDList = () => HID.devices().filter(d =>
        d.serialNumber.match(/^vial:/i) &&
        d.usage === DEFAULT_USAGE.usage &&
        d.usagePage === DEFAULT_USAGE.usagePage
    ).sort((a, b) => `${a.manufacturer}${a.product}` > `${b.manufacturer}${b.product}` ? 1 : -1)
    .map(device => {
        const id = encodeDeviceId(device)        
        if (deviceStatusMap[id]) {
            return {...device, id: id, deviceType: deviceStatusMap[id].deviceType, gpkRCVersion: deviceStatusMap[id].gpkRCVersion}
        } else {
            return {...device, id: id}
        }
    })

function joinScrollTerm(a, b) {
    const lower6Bits = a & 0b00111111
    const upper4Bits = (b & 0b11110000) >> 4
    return (lower6Bits << 4) | upper4Bits
}

function joinDragTerm(a, b) {
    const lower4Bits = a & 0b00001111
    const upper6Bits = (b & 0b11111100) >> 2
    return (lower4Bits << 6) | upper6Bits
}

function joinDefaultSpeed(a, b) {
    const lower2Bits = a & 0b00000011
    const upper4Bits = (b & 0b11110000) >> 4
    return (lower2Bits << 4) | upper4Bits
}

function receiveTrackpadConfig(buffer) {
    return {
        init: 1, // Always set to 1 to ensure settings items are displayed
        hf_waveform_number: (buffer[2] & 0b11111110) >> 1,
        can_hf_for_layer: (buffer[3] & 0b10000000) >> 7,
        can_drag: (buffer[3] & 0b01000000) >> 6,
        scroll_term: joinScrollTerm(buffer[3], buffer[4]),
        drag_term: joinDragTerm(buffer[4], buffer[5]),
        can_trackpad_layer: (buffer[5] & 0b00000010) >> 1,
        can_reverse_scrolling_direction: buffer[5] & 0b00000001,
        drag_strength_mode: (buffer[6] & 0b10000000) >> 7,
        drag_strength: (buffer[6] & 0b01111100) >> 2,
        default_speed: joinDefaultSpeed(buffer[6], buffer[7]),
        scroll_step: buffer[7] & 0b00001111,
        can_short_scroll: (buffer[8] & 0b10000000) >> 7,
        pomodoro_work_time: buffer[9],
        pomodoro_break_time: buffer[10],
        pomodoro_long_break_time: buffer[11],
        pomodoro_cycles: buffer[12],
        pomodoro_work_hf_pattern: buffer[13],
        pomodoro_break_hf_pattern: buffer[14],
        pomodoro_timer_active: (buffer[15] & 0b10000000) >> 7,
        pomodoro_state: buffer[15] & 0b00000011,
        pomodoro_minutes: buffer[16],
        pomodoro_seconds: buffer[17],
        pomodoro_current_cycle: buffer[17],
        auto_layer_enabled: 0,
        auto_layer_settings: []
    }
}

function receivePomodoroConfig(buffer) {
    return {
        pomodoro_work_time: buffer[2],
        pomodoro_break_time: buffer[3],
        pomodoro_long_break_time: buffer[4],
        pomodoro_cycles: buffer[5],
        pomodoro_timer_active: (buffer[6] & 0b10000000) >> 7,
        pomodoro_state: buffer[6] & 0b00000011,
        pomodoro_minutes: buffer[7],
        pomodoro_seconds: buffer[8],
        pomodoro_current_cycle: buffer[9]
    }
}


// Function to set the pomodoro editing state
const setEditingPomodoro = (device, isEditing) => {
    const id = encodeDeviceId(device)
    isEditingPomodoroPerDevice[id] = isEditing
}

// Function to set the active tab
const setActiveTab = (device, tabName) => {
    const id = encodeDeviceId(device)
    activeTabPerDevice[id] = tabName
}

// Function to get the active tab
const getActiveTab = (device) => {
    const id = encodeDeviceId(device)
    return activeTabPerDevice[id]
}

let mainWindow = null

const setMainWindow = (window) => {
    mainWindow = window
    global.mainWindow = window
}

const addKbd = (device) => { 
    const d = getKBD(device);
    const id = encodeDeviceId(device);
    if (!d || !d.path) return;
    if(!hidDeviceInstances[id]){ 
        hidDeviceInstances[id] = new HID.HID(d.path);
        hidDeviceInstances[id].write(commandToBytes({id: commandId.gpkRCInfo}));
    }
    return id;
}

const start = async (device) => {
    if (!device) {
        throw new Error("Device information is required");
    }
    
    try {
        const id = addKbd(device);
        if (!deviceStatusMap[id]) {
            deviceStatusMap[id] = {
                config: {},
                deviceType: "keyboard",
                gpkRCVersion: 0,
                connected: true,
            };
            
            activeTabPerDevice[id] = "mouse";
            
            if (hidDeviceInstances[id]) {
                hidDeviceInstances[id].on('error', (err) => {
                    console.error(`Device error: ${id}`, err);
                    stop(device);
                });
                
                hidDeviceInstances[id].on('data', buffer => {
                    try {
                        if (buffer[0] === commandId.gpkRCPrefix) {
                            const cmdId = buffer[1];
                            deviceStatusMap[id].connected = true;
                            if (cmdId === commandId.gpkRCInfo) {
                                const dataOffset = 2;
                                const version = buffer[dataOffset];
                                const deviceType = buffer.slice(dataOffset + 1, dataOffset + 13).toString().replace(/\0/g, '');
                                deviceStatusMap[id].gpkRCVersion = version;
                                deviceStatusMap[id].deviceType = deviceType;
                                
                                // Load OLED settings from store for this device
                                if (settingsStore) {
                                    const oledSettings = settingsStore.get('oledSettings') || {};
                                    if (oledSettings[id] !== undefined) {
                                        // Add oled_enabled to the config
                                        if (!deviceStatusMap[id].config) {
                                            deviceStatusMap[id].config = {};
                                        }
                                        deviceStatusMap[id].config.oled_enabled = oledSettings[id].enabled ? 1 : 0;
                                    }
                                }
                                
                                global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id].connected,
                                    gpkRCVersion: deviceStatusMap[id].gpkRCVersion,
                                    deviceType: deviceStatusMap[id].deviceType,
                                    config: deviceStatusMap[id].config
                                });
                            } else if (cmdId === commandId.customGetValue) {
                                deviceStatusMap[id].config = receiveTrackpadConfig(buffer);
                                
                                // Preserve OLED settings when receiving other config data
                                if (settingsStore) {
                                    const oledSettings = settingsStore.get('oledSettings') || {};
                                    if (oledSettings[id] !== undefined) {
                                        deviceStatusMap[id].config.oled_enabled = oledSettings[id].enabled ? 1 : 0;
                                    }
                                }
                                global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id].connected,
                                    gpkRCVersion: deviceStatusMap[id].gpkRCVersion,
                                    deviceType: deviceStatusMap[id].deviceType,
                                    config: deviceStatusMap[id].config
                                });
                            } else if (cmdId === commandId.pomodoroGetValue) {
                                const pomodoroConfig = receivePomodoroConfig(buffer);
                                
                                // Check if state actually changed before updating
                                const oldState = deviceStatusMap[id].config.pomodoro_state;
                                const newState = pomodoroConfig.pomodoro_state;
                                
                                // Preserve notification settings when receiving pomodoro data
                                const notificationsEnabled = deviceStatusMap[id].config.pomodoro_notifications_enabled;
                                
                                deviceStatusMap[id].config.pomodoro_work_time = pomodoroConfig.pomodoro_work_time;
                                deviceStatusMap[id].config.pomodoro_break_time = pomodoroConfig.pomodoro_break_time;
                                deviceStatusMap[id].config.pomodoro_long_break_time = pomodoroConfig.pomodoro_long_break_time;
                                deviceStatusMap[id].config.pomodoro_cycles = pomodoroConfig.pomodoro_cycles;
                                deviceStatusMap[id].config.pomodoro_timer_active = pomodoroConfig.pomodoro_timer_active;    
                                deviceStatusMap[id].config.pomodoro_state = pomodoroConfig.pomodoro_state;
                                deviceStatusMap[id].config.pomodoro_minutes = pomodoroConfig.pomodoro_minutes;
                                deviceStatusMap[id].config.pomodoro_seconds = pomodoroConfig.pomodoro_seconds;
                                deviceStatusMap[id].config.pomodoro_current_cycle = pomodoroConfig.pomodoro_current_cycle;
                                
                                // Restore notification settings
                                if (notificationsEnabled !== undefined) {
                                    deviceStatusMap[id].config.pomodoro_notifications_enabled = notificationsEnabled;
                                }
                                
                               
                                global.mainWindow.webContents.send("deviceConnectionStatePomodoroChanged", {
                                    deviceId: id,
                                    pomodoroConfig: deviceStatusMap[id].config,
                                    stateChanged: oldState !== newState,
                                });
                            } 
                        }
                    } catch (err) {
                        console.error(`Error processing device data: ${id}`, err);
                    }
                });
            }
        } 
        
        return deviceStatusMap[id];
    } catch (err) {
        console.error("Error starting device:", err);
        throw err;
    }
}

const stop = (device) => {
    const id = encodeDeviceId(device)
    if (hidDeviceInstances[id]) {
        hidDeviceInstances[id].removeAllListeners("data")
        _close(id)
        hidDeviceInstances[id] = undefined
        deviceStatusMap[id] = undefined
    }
}

const _close = (id) => {
    if (!hidDeviceInstances[id]) {
        return false;
    }
    
    try {
        hidDeviceInstances[id].close();
        return true;
    } catch (err) {
        console.error(`Error closing device ${id}:`, err);
        return false;
    }
}

const close = () => {
    if (!hidDeviceInstances) {
        return;
    }
    
    Object.keys(hidDeviceInstances).forEach(id => {
        _close(id);
    });
}

const writeCommand = async (device, command) => {
    const id = addKbd(device);
    try {
        const bytes = commandToBytes(command);
        await hidDeviceInstances[id].write(bytes);    
    } catch (err) {
        console.error("Error writing command:", err);
        throw err;
    }
}

// Device config functions
const getDeviceConfig = async (device) => await writeCommand(device, { id: commandId.customGetValue });

const saveDeviceConfig = async (device, data) => {
    try {
        return await writeCommand(device, { id: commandId.customSetValue, data });
    } catch (error) {
        throw error;
    }
};

// OLED functions
const writeTimeToOled = async (device, formattedDate) => {
    try {
        return await writeCommand(device, { id: commandId.oledWrite, data: formattedDate });
    } catch (error) {
        throw error;
    }
};

const getPomodoroConfig = async (device) => await writeCommand(device, { id: commandId.pomodoroGetValue });

// Function for monitoring active windows and switching layers
const startWindowMonitoring = async (ActiveWindow) => {    
    try {
        const result = await ActiveWindow.default.getActiveWindow();
        if (!result) return;
        const appName = result.application;

        if (!activeWindows.includes(appName)) {
            activeWindows.push(appName);
            if (activeWindows.length > 10) {
                activeWindows.shift();
            }
            
            if (mainWindow) {
                mainWindow.webContents.send('activeWindow', appName);
            }
            
        }
        // Always switch layers based on active application
        checkAndSwitchLayer(appName);
    } catch (error) {
       // Uncomment for debugging   
       //  console.error("Error in window monitoring:", error);
    }
};

// Switch layers based on active application
const checkAndSwitchLayer = (appName) => {
    if (!appName || !settingsStore) return;
    
    Object.keys(deviceStatusMap).forEach(id => {
        const device = deviceStatusMap[id];
        if (!device || !device.connected) return;
    
        const autoLayerSettings = settingsStore.get('autoLayerSettings') || {};
        const settings = autoLayerSettings[id];
        
        if (!settings || !settings.enabled || !Array.isArray(settings.layerSettings) || !settings.layerSettings.length) {
            return;
        }
        
        // Find matching setting for the current application
        const matchingSetting = settings.layerSettings.find(s => s.appName === appName);
        const deviceInfo = parseDeviceId(id);
        
        if (!deviceInfo) return;
        
        // Initialize current layer tracking if needed
        if (currentLayers[id] === undefined) {
            currentLayers[id] = 0;
        }
        
        // Determine target layer (0 is default if no matching setting)
        const targetLayer = matchingSetting ? (matchingSetting.layer || 0) : 0;
        
        // Only switch if current layer is different
        if (currentLayers[id] !== targetLayer) {
            try {
                writeCommand(deviceInfo, {
                    id: commandId.layerMove,
                    data: [targetLayer] 
                }).then(() => {
                    // Update current layer after successful switch
                    currentLayers[id] = targetLayer;
                }).catch(err => {
                    console.error(`Error switching layer for device ${id}:`, err);
                });
            } catch (err) {
                console.error(`Failed to initiate layer switch for device ${id}:`, err);
            }
        }
    });
};

// Get current active window list
const getActiveWindows = () => {
    return activeWindows;
};

// Function to get settings for selected application
const getSelectedAppSettings = (deviceId, appName) => {
    if (!settingsStore) return null;
    
    const autoLayerSettings = settingsStore.get('autoLayerSettings') || {};
    const settings = autoLayerSettings[deviceId];
    
    if (!settings || !settings.layerSettings || !Array.isArray(settings.layerSettings)) {
        return null;
    }
    
    return settings.layerSettings.find(setting => setting.appName === appName);
}

// Function to add new application to settings that isn't in the list
const addNewAppToAutoLayerSettings = (deviceId, appName, layer) => {
    if (!settingsStore) return null;
    
    const autoLayerSettings = settingsStore.get('autoLayerSettings') || {};
    
    if (!autoLayerSettings[deviceId]) {
        autoLayerSettings[deviceId] = {
            enabled: true,
            layerSettings: []
        };
    }
    
    if (!autoLayerSettings[deviceId].layerSettings) {
        autoLayerSettings[deviceId].layerSettings = [];
    }
    
    // Overwrite existing settings if they exist, otherwise add new
    const existingIndex = autoLayerSettings[deviceId].layerSettings.findIndex(
        setting => setting.appName === appName
    );
    
    if (existingIndex >= 0) {
        autoLayerSettings[deviceId].layerSettings[existingIndex].layer = layer;
    } else {
        autoLayerSettings[deviceId].layerSettings.push({
            appName,
            layer
        });
    }
    
    // Save changes
    settingsStore.set('autoLayerSettings', autoLayerSettings);
    
    return autoLayerSettings[deviceId];
}

// Function to update auto layer settings in memory
const updateAutoLayerSettings = (store) => {
    if (!store) return false;
    
    settingsStore = store;
    return true;
}

// Function to get GPK RC info/version
const getGpkRCInfo = async (device) => await writeCommand(device, { id: commandId.gpkRCInfo });

// Module exports
export const getConnectKbd = (id) => deviceStatusMap[id]
export { getKBD, getKBDList }
export { start, stop, close }
export { setActiveTab, getActiveTab }
export { setEditingPomodoro, setMainWindow }
export { startWindowMonitoring, getActiveWindows }
export { updateAutoLayerSettings }
export { getSelectedAppSettings, addNewAppToAutoLayerSettings }
export { encodeDeviceId, parseDeviceId }
export { getGpkRCInfo, getDeviceConfig, saveDeviceConfig, writeTimeToOled, getPomodoroConfig }