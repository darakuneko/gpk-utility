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
    customSetValue: 0x01,  // Corresponds to C side: id_gpk_rc_set_value (for setting values)
    customGetValue: 0x02,  // Corresponds to C side: id_gpk_rc_get_value (for getting values)
    gpkRCOperation: 0x03,  // Corresponds to C side: id_gpk_rc_operation (for general operations like layer move, oled write)
};

// Action IDs
const actionId = {
    // Actions for customSetValue (commandId: 0x02)
    setValueComplete: 0x01,
    trackpadSetValue: 0x02,
    pomodoroSetValue: 0x03,

    // Actions for customGetValue (commandId: 0x03)
    deviceGetValue: 0x01,
    trackpadGetValue: 0x02,
    pomodoroGetValue: 0x03,
    pomodoroActiveGetValue: 0x04,

    // Actions for gpkRCOperation (commandId: 0x04)
    layerMove: 0x01,
    oledWrite: 0x02,    
};

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

const encodeDeviceId = (device) => {
    if (!device || !device.manufacturer || !device.product || !device.vendorId || !device.productId) {
        console.error("Invalid device object for ID encoding:", device);
        return "unknown-device";
    }
    return `${device.manufacturer}${DEVICE_ID_SEPARATOR}${device.product}${DEVICE_ID_SEPARATOR}${device.vendorId}${DEVICE_ID_SEPARATOR}${device.productId}`;
}

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


function receiveTrackpadSpecificConfig(buffer) { // buffer here is actualData
    return {
        hf_waveform_number: buffer[0],
        can_hf_for_layer: (buffer[1] & 0b10000000) >> 7,
        can_drag: (buffer[1] & 0b01000000) >> 6,
        scroll_term: joinScrollTerm(buffer[1], buffer[2]),
        drag_term: joinDragTerm(buffer[2], buffer[3]),
        can_trackpad_layer: (buffer[3] & 0b00000010) >> 1,
        can_reverse_scrolling_direction: buffer[3] & 0b00000001,
        drag_strength_mode: (buffer[4] & 0b10000000) >> 7,
        drag_strength: (buffer[4] & 0b01111100) >> 2,
        default_speed: joinDefaultSpeed(buffer[4], buffer[5]),
        scroll_step: buffer[5] & 0b00001111,
        can_short_scroll: (buffer[6] & 0b10000000) >> 7,
        tap_term: (buffer[7] << 8) | buffer[8],
        swipe_term: (buffer[9] << 8) | buffer[10],
        pinch_term: (buffer[11] << 8) | buffer[12],
        gesture_term: (buffer[13] << 8) | buffer[14],
        short_scroll_term: (buffer[15] << 8) | buffer[16],
        pinch_distance: (buffer[17] << 8) | buffer[18]
    };
}

function receivePomodoroConfig(buffer) {
    return {
        pomodoro: {
            work_time: buffer[0],
            break_time: buffer[1],
            long_break_time: buffer[2],
            work_interval: buffer[3],
            work_hf_pattern: buffer[4],
            break_hf_pattern: buffer[5],
            timer_active: (buffer[6] & 0b10000000) >> 7,
            notify_haptic_enable: (buffer[6] & 0b01000000) >> 6,
            continuous_mode: (buffer[6] & 0b00100000) >> 5,
            phase: buffer[6] & 0b00000011,
            pomodoro_cycle: buffer[7]
        }
    }
}

function receivePomodoroActiveStatus(buffer) {
    return {
        timer_active: (buffer[0] & 0b10000000) >> 7,
        phase: buffer[0] & 0b00000011,
        minutes: buffer[1],
        seconds: buffer[2],
        current_work_Interval: buffer[3],
        current_pomodoro_cycle: buffer[4]
    };
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
    
    if (!d || !d.path) {
        console.error(`Device not found or path not available for device: ${id}`);
        return id; // Still return id even if device is not connected
    }
    if(!hidDeviceInstances[id]){ 
        try {
            hidDeviceInstances[id] = new HID.HID(d.path);
            // Fetch device info using customGetValue and deviceGetValue action
            hidDeviceInstances[id].write(commandToBytes({id: commandId.customGetValue, data: [actionId.deviceGetValue]}));
        } catch (error) {
            console.error(`Failed to initialize HID device ${id}:`, error);
            return id;
        }
    }
    return id;
};

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
                            const receivedCmdId = buffer[1];
                            const receivedActionId = buffer[2];
                            const actualData = buffer.slice(3);

                            deviceStatusMap[id].connected = true;
                            if (receivedCmdId === commandId.customSetValue) {
                                if(receivedActionId === actionId.setValueComplete) {
                                    // Notify UI that data saving is complete
                                    global.mainWindow.webContents.send("configSaveComplete", {
                                        deviceId: id,
                                        success: true,
                                        timestamp: Date.now()
                                    });
                                }
                            }
                            if (receivedCmdId === commandId.customGetValue) {
                                if (receivedActionId === actionId.deviceGetValue) {
                                    // initialize config with default values
                                    deviceStatusMap[id].config = { 
                                        init: undefined,
                                        pomodoro: {
                                            phase: undefined
                                        }, 
                                        trackpad: {}, 
                                        oled_enabled: undefined 
                                    };
                                    
                                    deviceStatusMap[id].gpkRCVersion = actualData[0];
                                    deviceStatusMap[id].init = actualData[1];
                                    deviceStatusMap[id].deviceType = actualData.toString('utf8', 2, 16).replace(/\0/g, '');
                                    deviceStatusMap[id].disableCanTrackpadLayer = actualData[16];

                                    if (settingsStore) {
                                        const oledSettings = settingsStore.get('oledSettings');
                                        if (oledSettings && oledSettings[id] !== undefined) {
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
                                } else if (receivedActionId === actionId.trackpadGetValue) {
                                    deviceStatusMap[id].config.trackpad = receiveTrackpadSpecificConfig(actualData);

                                    global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                                        deviceId: id,
                                        connected: deviceStatusMap[id].connected,
                                        gpkRCVersion: deviceStatusMap[id].gpkRCVersion,
                                        deviceType: deviceStatusMap[id].deviceType,
                                        config: deviceStatusMap[id].config
                                    });
                                } else if (receivedActionId === actionId.pomodoroGetValue) {
                                    const receivedPomoConfig = receivePomodoroConfig(actualData); // Parses only pomodoro settings
                                
                                    const oldPhase = deviceStatusMap[id].config.pomodoro.phase;
                                    const newPhase = receivedPomoConfig.pomodoro.phase;
                                    const oldTimerActive = deviceStatusMap[id].config.pomodoro.timer_active;
                                    const newTimerActive = receivedPomoConfig.pomodoro.timer_active;
                                    const notificationsEnabled = deviceStatusMap[id].config.pomodoro.notifications_enabled; // Preserve existing UI-side setting
                                    
                                    // Update the pomodoro part of the config
                                    deviceStatusMap[id].config.pomodoro = {
                                        ...deviceStatusMap[id].config.pomodoro, // Preserve other pomodoro settings not in receivedPomoConfig
                                        ...receivedPomoConfig.pomodoro
                                    };
                                    
                                    if (notificationsEnabled !== undefined) {
                                        deviceStatusMap[id].config.pomodoro.notifications_enabled = notificationsEnabled;
                                    }
                                    
                                    const phaseChanged = oldPhase !== newPhase || oldTimerActive !== newTimerActive;
                                    global.mainWindow.webContents.send("deviceConnectionPomodoroPhaseChanged", {
                                        deviceId: id,
                                        pomodoroConfig: deviceStatusMap[id].config.pomodoro,
                                        phaseChanged: phaseChanged,
                                    });
                                } else if (receivedActionId === actionId.pomodoroActiveGetValue) {
                                    const pomodoroActiveUpdate = receivePomodoroActiveStatus(actualData);
                                    const oldPhase = deviceStatusMap[id].config.pomodoro.phase;
                                    const oldTimerActive = deviceStatusMap[id].config.pomodoro.timer_active;
                                    
                                    const preservedPomodoroConfig = { ...deviceStatusMap[id].config.pomodoro };

                                    preservedPomodoroConfig.timer_active = pomodoroActiveUpdate.timer_active;
                                    preservedPomodoroConfig.phase = pomodoroActiveUpdate.phase;
                                    preservedPomodoroConfig.minutes = pomodoroActiveUpdate.minutes;
                                    preservedPomodoroConfig.seconds = pomodoroActiveUpdate.seconds;
                                    preservedPomodoroConfig.current_work_Interval = pomodoroActiveUpdate.current_work_Interval;
                                    preservedPomodoroConfig.current_pomodoro_cycle = pomodoroActiveUpdate.current_pomodoro_cycle;

                                    deviceStatusMap[id].config.pomodoro = preservedPomodoroConfig;

                                    const phaseChanged = oldPhase !== pomodoroActiveUpdate.phase || oldTimerActive !== pomodoroActiveUpdate.timer_active;

                                    global.mainWindow.webContents.send("deviceConnectionPomodoroPhaseChanged", {
                                        deviceId: id,
                                        pomodoroConfig: deviceStatusMap[id].config.pomodoro,
                                        phaseChanged: phaseChanged,
                                    });
                                }
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
        if (!hidDeviceInstances[id]) {
            console.error(`Device ${id} is not connected or properly initialized`);
            return { success: false, message: "Device not connected" };
        }
        
        const bytes = commandToBytes(command);
        await hidDeviceInstances[id].write(bytes);    
        return { success: true };
    } catch (err) {
        console.error("Error writing command:", err);
        throw err;
    }
}

// Device config functions
const getDeviceConfig = async (device) => {
    await writeCommand(device, { id: commandId.customGetValue, data: [actionId.trackpadGetValue] });
    await writeCommand(device, { id: commandId.customGetValue, data: [actionId.pomodoroGetValue] });
}
// Note: The following function to save device config is commented out.
const saveTrackpadConfig = async (device, trackpadDataBytes) => {
    try {
        const result = await writeCommand(device, { id: commandId.customSetValue, data: [actionId.trackpadSetValue, ...trackpadDataBytes] });
        await new Promise(resolve => setTimeout(resolve, 500)); // Add 500ms delay
        return result;
    } catch (error) {
        throw error;
    }
};

const savePomodoroConfigData = async (device, pomodoroDataBytes) => {
    try {
        const result = await writeCommand(device, { id: commandId.customSetValue, data: [actionId.pomodoroSetValue, ...pomodoroDataBytes] });
        await new Promise(resolve => setTimeout(resolve, 500)); // Add 500ms delay
        return result;
    } catch (error) {
        console.error("Error saving pomodoro config data:", error);
        return { success: false, error: error.message };
    }
};

// OLED functions
const writeTimeToOled = async (device, formattedDate) => {
    try {
        const dataBytes = dataToBytes(formattedDate);
        return await writeCommand(device, { id: commandId.gpkRCOperation, data: [actionId.oledWrite, ...dataBytes] });
    } catch (error) {
        throw error;
    }
};

const getPomodoroConfig = async (device) => await writeCommand(device, { id: commandId.customGetValue, data: [actionId.pomodoroGetValue] });

const getPomodoroActiveConfig = async (device) => await writeCommand(device, { id: commandId.customGetValue, data: [actionId.pomodoroActiveGetValue] });

const getTrackpadConfigData = async (device) => await writeCommand(device, { id: commandId.customGetValue, data: [actionId.trackpadGetValue] });


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
                    id: commandId.gpkRCOperation,
                    data: [actionId.layerMove, targetLayer]
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

// Function to get GPK RC info/version (now uses customGetValue with deviceGetValue action)
const getDeviceInitConfig = async (device) => await writeCommand(device, { id: commandId.customGetValue, data: [actionId.deviceGetValue] });

// Module exports
export const getConnectKbd = (id) => deviceStatusMap[id]
export { getKBD, getKBDList }
export { start, stop, close }
export { setActiveTab, getActiveTab }
export { setMainWindow }
export { startWindowMonitoring, getActiveWindows }
export { updateAutoLayerSettings }
export { getSelectedAppSettings, addNewAppToAutoLayerSettings }
export { encodeDeviceId, parseDeviceId }
export { getDeviceInitConfig, getDeviceConfig, writeTimeToOled, getPomodoroConfig } // Commented out saveDeviceConfig
// Add new exports
export { saveTrackpadConfig, savePomodoroConfigData, getPomodoroActiveConfig, getTrackpadConfigData }