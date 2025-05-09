import HID from 'node-hid'

let connectKbd = {}
let kbd = {}
// Flag to determine if polling is in progress to get data from device
let isReceiving = {}
let receiveIntervals = {}
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
    oledWrite: 103,
    switchLayer: 114,
    setOledState: 116,
    gpkRCVersion: 117,
    customSet: 118,
    customGet: 119,
    customSave: 120,
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

const lengthToBytes = (length) => {
    const lengthBuffer = new ArrayBuffer(4)
    const lengthDataView = new DataView(lengthBuffer)
    lengthDataView.setUint32(0, length, true)
    return new Uint8Array(lengthBuffer)
}

const commandToBytes = ({ id, data }) => {
    const bytes = data ? dataToBytes(data) : []
    let unpadded
    if (id !== commandId.customSet &&
        id !== commandId.customGet &&
        id !== commandId.customSave) {
        unpadded = [
            0, id,
            ...lengthToBytes(bytes.length),
            ...bytes
        ]
    } else {
        unpadded = [0, id, ...bytes]
    }
    
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
        if (connectKbd[id]) {
            return {...device, id: id, deviceType: connectKbd[id].deviceType, gpkRCVersion: connectKbd[id].gpkRCVersion}
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

function receiveTrackpadConfig(data) {
    return {
        init: 1, // Always set to 1 to ensure settings items are displayed
        hf_waveform_number: (data[6] & 0b11111110) >> 1,
        can_hf_for_layer: (data[7] & 0b10000000) >> 7,
        can_drag: (data[7] & 0b01000000) >> 6,
        scroll_term: joinScrollTerm(data[7], data[8]),
        drag_term: joinDragTerm(data[8], data[9]),
        can_trackpad_layer: (data[9] & 0b00000010) >> 1,
        can_reverse_scrolling_direction: data[9] & 0b00000001,
        drag_strength_mode: (data[10] & 0b10000000) >> 7,
        drag_strength: (data[10] & 0b01111100) >> 2,
        default_speed: joinDefaultSpeed(data[10], data[11]),
        scroll_step: data[11] & 0b00001111,
        can_short_scroll: (data[12] & 0b10000000) >> 7,
        pomodoro_work_time: data[13],
        pomodoro_break_time: data[14],
        pomodoro_long_break_time: data[15],
        pomodoro_cycles: data[16],
        pomodoro_work_hf_pattern: data[17],
        pomodoro_break_hf_pattern: data[18],
        pomodoro_long_break_hf_pattern: data[19],
        pomodoro_timer_active: (data[20] & 0b10000000) >> 7,
        pomodoro_state: data[20] & 0b00000011,
        pomodoro_minutes: data[21],
        pomodoro_seconds: data[22],
        pomodoro_current_cycle: data[23],
        auto_layer_enabled: 0,
        auto_layer_settings: []
    }
}

// Function to periodically receive data from the device at 1-second intervals
const startPeriodicReceive = (device) => {
    const id = encodeDeviceId(device)
    if (receiveIntervals[id]) {
        clearInterval(receiveIntervals[id])
    }
    
    receiveIntervals[id] = setInterval(() => {
        if (kbd[id] && connectKbd[id] && !isReceiving[id]) {            
            writeCommand(device, { id: commandId.customGet })
        }
    }, 1000)
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
    if(!kbd[id]){ 
        kbd[id] = new HID.HID(d.path);
        const bytes = commandToBytes({id: commandId.gpkRCVersion});
        kbd[id].write(bytes);
    }
}

const start = async (device) => {
    try {
        addKbd(device);
        const id = encodeDeviceId(device);
        if(!connectKbd[id]){
            try {
                connectKbd[id] = {
                    config: {},
                    deviceType: "keyboard",
                    gpkRCVersion: 0,
                    connected: true,
                };
                isReceiving[id] = false;
                activeTabPerDevice[id] = "mouse";
                
                kbd[id].on('error', (err) => {
                    stop(device);
                });
                
                kbd[id].on('data', buffer => {
                    try {
                        const gpkRCVersion = buffer.toString()
                        const identifier = buffer.slice(0, 6).toString();   
                        if(identifier === "gpktps") {
                            const receivedConfig = receiveTrackpadConfig(buffer);
                            connectKbd[id].config = receivedConfig;
                            connectKbd[id].connected = true;
                            connectKbd[id].gpkRCVersion = 1;
                            const changeDeviceType = connectKbd[id].deviceType !== "trackpad"
                            if (global.mainWindow && changeDeviceType) {
                                connectKbd[id].deviceType = "trackpad";
                                global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: true,
                                    gpkRCVersion: 1,
                                    deviceType: "trackpad",
                                });
                            }                    
                            isReceiving[id] = false;
                        } else if(connectKbd[id].deviceType !== "trackpad" && gpkRCVersion.match(/gpk_rc_1/)){
                            const changeVersion = connectKbd[id].gpkRCVersion === 0
                            if (global.mainWindow && changeVersion) {
                                connectKbd[id].gpkRCVersion = 1;
                                global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: true,
                                    gpkRCVersion: 1,
                                    deviceType: connectKbd[id].deviceType
                                });
                            }
                            isReceiving[id] = false;
                        }
                    } catch (err) {
                        isReceiving[id] = false;
                    }
                });
                
                // Start periodic data reception
                startPeriodicReceive(device, commandId);
                
                // Get initial configuration
                writeCommand(device, { id: commandId.customGet });
            } catch (err) {
                return;
            }
        } else {
            // Reset receiving flag if connection already exists
            isReceiving[id] = false;
            // Retrieve configuration even if connection already exists
            writeCommand(device, { id: commandId.customGet });
        }
    } catch (err) {
    }
}

const stop = (device) => {
    const id = encodeDeviceId(device)
    if (kbd[id]) {
        kbd[id].removeAllListeners("data")
        _close(id)
        kbd[id] = undefined
        connectKbd[id] = undefined
        
        // Clear the interval
        if (receiveIntervals[id]) {
            clearInterval(receiveIntervals[id])
            receiveIntervals[id] = undefined
        }
    }
}

const _close = (id) => {
    try{
        kbd[id].close()
    } catch (e) {
    }
}

const close = () => {
    if(kbd) {
        Object.keys(kbd).forEach(id => {
            _close(id)
            // Clear the interval
            if (receiveIntervals[id]) {
                clearInterval(receiveIntervals[id])
                receiveIntervals[id] = undefined
            }
        })
    }
}

const writeCommand = async (device, command) => {
    try {
        const id = encodeDeviceId(device);
        addKbd(device);
        if (kbd[id]) {
            // If the command is a custom command, set the ID to customSet
            const bytes = commandToBytes(command);
            await kbd[id].write(bytes);
            // If write is successful, ensure connection state is updated
            if (connectKbd[id]) {
                connectKbd[id].connected = true;
                // Notify main process of connection state change for specific commands
                if (global.mainWindow && (command.id === commandId.customGet || command.id === commandId.customSave)) {
                    global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                        deviceId: id,
                        connected: true,
                        gpkRCVersion: connectKbd[id].gpkRCVersion,
                        deviceType: connectKbd[id].deviceType,
                    });
                }
            }   
        }
    } catch (err) {
        console.error("Error writing command:", err);
    }
}

// Device config functions
const getDeviceConfig = async (device) => {
    try {
        return await writeCommand(device, { id: commandId.customGet });
    } catch (error) {
        throw error;
    }
};

const saveDeviceConfig = async (device, data) => {
    try {
        return await writeCommand(device, { id: commandId.customSave, data });
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

// Called when slider operation starts
const setReceiving = (device, isActive) => {
    const id = encodeDeviceId(device)
    if (kbd[id]) {
        isReceiving[id] = isActive
    }
}

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
    if (!appName) return;
    
    Object.keys(connectKbd).forEach(id => {
        const device = connectKbd[id];
        if (!settingsStore || !device || !device.connected) return;
    
        const autoLayerSettings = settingsStore.get('autoLayerSettings') || {};
        
        if (!autoLayerSettings[id]) return;
                
        const settings = autoLayerSettings[id];
        if (settings && settings.enabled && Array.isArray(settings.layerSettings) && settings.layerSettings.length > 0) {
            // Find matching setting
            const matchingSetting = settings.layerSettings.find(s => s.appName === appName);
        
            const deviceInfo = parseDeviceId(id);
            if (deviceInfo) {
                
                if (!currentLayers[id]) {
                    currentLayers[id] = 0;
                }
                
                const targetLayer = matchingSetting ? (matchingSetting.layer || 0) : 0;
                // Only issue switch command if current layer is different
                if (currentLayers[id] !== targetLayer) {
                    writeCommand(deviceInfo, {
                        id: commandId.switchLayer,
                        data: [targetLayer] 
                    });
                    
                    // Update current layer
                    currentLayers[id] = targetLayer;
                }
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
const gpkRCVersion = async (device) => await writeCommand(device, { id: commandId.gpkRCVersion });

// Module exports
export const getConnectKbd = (id) => connectKbd[id]
export { getKBD, getKBDList }
export { start, stop, close }
export { setReceiving }
export { setActiveTab, getActiveTab }
export { setEditingPomodoro, setMainWindow }
export { startWindowMonitoring, getActiveWindows }
export { updateAutoLayerSettings }
export { getSelectedAppSettings, addNewAppToAutoLayerSettings }
export { encodeDeviceId, parseDeviceId }
export { gpkRCVersion, getDeviceConfig, saveDeviceConfig, writeTimeToOled }