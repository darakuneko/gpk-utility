import HID from 'node-hid'
import dayjs from 'dayjs';

// Device type enum definition
const DeviceType = {
    KEYBOARD: "keyboard",
    KEYBOARD_OLED: "keyboard_oled",
    KEYBOARD_TP: "keyboard_tp",
    MACROPAD: "macropad",
    MACROPAD_TP: "macropad_tp",
    MACROPAD_TP_BTNS: "macropad_tp_btns", 
    UNKNOWN: "unknown"
}

const getDeviceType = () => DeviceType

// Convert DeviceType enum to string for external interfaces
const deviceTypeToString = (type) => {
    return type;
}

// Convert string to DeviceType enum for incoming data
const stringToDeviceType = (typeStr) => {
    const normalizedStr = typeStr.toLowerCase();
    switch (normalizedStr) {
        case "keyboard":
            return DeviceType.KEYBOARD;
        case "keyboard_oled":
            return DeviceType.KEYBOARD_OLED;
        case "keyboard_tp":
            return DeviceType.KEYBOARD_TP;
        case "macropad":
            return DeviceType.MACROPAD;
        case "macropad_tp":
            return DeviceType.MACROPAD_TP;
        case "macropad_tp_btns":
            return DeviceType.MACROPAD_TP_BTNS;
            default:
            return DeviceType.UNKNOWN; // Default to unknown for unknown values
    }
}

// Device health monitoring variables
let deviceHealthMonitor = null;
let deviceHealthCheckInterval = 10000; // Check every 10 seconds

// Function to start device health monitoring
const startDeviceHealthMonitoring = () => {
    if (deviceHealthMonitor) {
        clearInterval(deviceHealthMonitor);
    }
    
    deviceHealthMonitor = setInterval(async () => {
        await checkDeviceHealth();
    }, deviceHealthCheckInterval);
};

// Function to stop device health monitoring
const stopDeviceHealthMonitoring = () => {
    if (deviceHealthMonitor) {
        clearInterval(deviceHealthMonitor);
        deviceHealthMonitor = null;
    }
};

// Function to check device health and attempt recovery
const checkDeviceHealth = async () => {
    try {
        const deviceIds = Object.keys(deviceStatusMap);
        
        for (const deviceId of deviceIds) {
            const deviceStatus = deviceStatusMap[deviceId];
            const hidInstance = hidDeviceInstances[deviceId];
            
            // Skip health check if device is explicitly marked as disconnected
            if (!deviceStatus || deviceStatus.connected === false) {
                continue;
            }
            
            // Check if HID instance exists but is marked as closed
            if (hidInstance && hidInstance.closed) {
                console.warn(`Device ${deviceId} HID instance is closed, attempting recovery...`);
                
                // Mark device as disconnected
                deviceStatus.connected = false;
                
                // Clean up closed instance
                try {
                    hidInstance.removeAllListeners();
                    hidInstance.close();
                } catch (e) {}
                hidDeviceInstances[deviceId] = null;
                
                // Notify UI about disconnection
                if (global.mainWindow) {
                    global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                        deviceId: deviceId,
                        connected: false,
                        gpkRCVersion: deviceStatus.gpkRCVersion || 0,
                        deviceType: deviceStatus.deviceType || DeviceType.KEYBOARD,
                        config: deviceStatus.config || {}
                    });
                }
            }
            
            // Check if device status indicates it should be connected but HID instance is missing
            if (deviceStatus.connected && !hidInstance) {
                console.warn(`Device ${deviceId} status shows connected but HID instance is missing`);
                
                // Try to find the device and recreate HID instance
                try {
                    const deviceInfo = parseDeviceId(deviceId);
                    if (deviceInfo) {
                        const foundDevice = await getKBD(deviceInfo);
                        if (foundDevice) {
                            const newDeviceId = await addKbd(deviceInfo);
                            
                            if (hidDeviceInstances[newDeviceId]) {
                                deviceStatus.connected = true;
                            }
                        } else {
                            deviceStatus.connected = false;
                            
                            // Notify UI about disconnection
                            if (global.mainWindow) {
                                global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: deviceId,
                                    connected: false,
                                    gpkRCVersion: deviceStatus.gpkRCVersion || 0,
                                    deviceType: deviceStatus.deviceType || DeviceType.KEYBOARD,
                                    config: deviceStatus.config || {}
                                });
                            }
                        }
                    }
                } catch (recoveryError) {
                    console.error(`Failed to recover device ${deviceId}:`, recoveryError);
                    deviceStatus.connected = false;
                }
            }
        }
    } catch (healthCheckError) {
        console.error("Error during device health check:", healthCheckError);
    }
};

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
// Store last formatted date for each device
const lastFormattedDateMap = new Map();

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

const getKBD = async (device, retryCount = 0) => {
    const maxRetries = 3;
    
    const searchDevice = () => HID.devices().find(d =>
        (device ?
            (d.manufacturer === device.manufacturer &&
                d.product === device.product &&
                d.vendorId === device.vendorId &&
                d.productId === device.productId) : false) &&
        d.usage === DEFAULT_USAGE.usage &&
        d.usagePage === DEFAULT_USAGE.usagePage
    );
    
    let foundDevice = searchDevice();
    
    if (!foundDevice && retryCount < maxRetries) {        
        // Wait before retry with progressive delay
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        
        // Force HID device refresh
        try {
            HID.devices(); // Refresh device list
        } catch (refreshError) {
            console.warn(`HID device list refresh failed:`, refreshError);
        }
        
        foundDevice = await getKBD(device, retryCount + 1);
    }

    return foundDevice;
}

const getKBDList = () => HID.devices().filter(d =>
        d.serialNumber.match(/^vial:/i) &&
        d.usage === DEFAULT_USAGE.usage &&
        d.usagePage === DEFAULT_USAGE.usagePage
    ).sort((a, b) => `${a.manufacturer}${a.product}` > `${b.manufacturer}${b.product}` ? 1 : -1)
    .map(device => {
        const id = encodeDeviceId(device)        
        if (deviceStatusMap[id]) {
            return {...device, id: id, deviceType: deviceTypeToString(deviceStatusMap[id].deviceType), gpkRCVersion: deviceStatusMap[id].gpkRCVersion}
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

const addKbd = async (device) => { 
    const d = await getKBD(device);
    const id = encodeDeviceId(device);
    
    if (!d || !d.path) {
        console.error(`Device not found or path not available for device: ${id}`);
        throw new Error(`Device not found or path not available for device: ${id}`);
    }
    
    // Clean up any existing instance before creating a new one
    if (hidDeviceInstances[id]) {
        try {
            hidDeviceInstances[id].removeAllListeners();
            hidDeviceInstances[id].close();
        } catch (closeError) {
            console.error(`Error closing existing HID instance for ${id}:`, closeError);
        }
        hidDeviceInstances[id] = null;
    }
    
    try {
        hidDeviceInstances[id] = new HID.HID(d.path);
        
        // Verify HID instance was created successfully
        if (!hidDeviceInstances[id] || !hidDeviceInstances[id].write) {
            throw new Error(`HID instance not properly initialized for ${id}`);
        }
                
        // Fetch device info using customGetValue and deviceGetValue action
        // Add a small delay before sending the first command
        setTimeout(() => {
            try {
                if (hidDeviceInstances[id]) {
                    hidDeviceInstances[id].write(commandToBytes({id: commandId.customGetValue, data: [actionId.deviceGetValue]}));
                }
            } catch (writeError) {
                console.error(`Failed to send initial command to ${id}:`, writeError);
            }
        }, 200); // Increased delay for better reliability
    } catch (error) {
        console.error(`Failed to initialize HID device ${id}:`, error);
        hidDeviceInstances[id] = null; // Ensure we don't leave a broken instance
        throw error; // Propagate error to caller
    }
    
    return id;
};

const start = async (device) => {
    if (!device) {
        throw new Error("Device information is required");
    }
    
    try {
        const id = encodeDeviceId(device);

        
        // Reset device status first
        deviceStatusMap[id] = {
            config: {},
            deviceType: DeviceType.KEYBOARD,
            gpkRCVersion: 0,
            connected: true,
            initializing: true, // Track initialization state
        };
        
        // Add device and create HID instance with retry logic
        let newId;
        let retryCount = 0;
        const maxRetries = 1;
        
        while (retryCount < maxRetries) {
            try {
                newId = await addKbd(device);
                // If addKbd succeeds and HID instance exists, break the retry loop
                if (hidDeviceInstances[newId]) {
                    break;
                }
                throw new Error(`HID instance not created despite successful addKbd call`);
            } catch (addError) {
                retryCount++;
                console.warn(`Failed to add device ${id} (attempt ${retryCount}/${maxRetries}):`, addError.message);
                
                if (retryCount >= maxRetries) {
                    console.error(`Failed to create HID instance for ${id} after ${maxRetries} attempts`);
                    // Mark device as connected but not properly initialized
                    if (deviceStatusMap[id]) {
                        deviceStatusMap[id].initializing = false;
                        deviceStatusMap[id].connected = false;
                    }
                    throw new Error(`Failed to initialize device ${id} after ${maxRetries} attempts: ${addError.message}`);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
        
        // Ensure device status exists for the returned ID
        if (!deviceStatusMap[newId]) {
            deviceStatusMap[newId] = {
                config: {},
                deviceType: DeviceType.KEYBOARD,
                gpkRCVersion: 0,
                connected: true,
                initializing: true,
            };
        }
        
        activeTabPerDevice[newId] = "mouse";
        
        if (hidDeviceInstances[newId]) {
            let initializationComplete = false;
            
            hidDeviceInstances[newId].on('error', (err) => {
                console.error(`Device error: ${newId}`, err);
                
                // Mark device as disconnected and clean up HID instance
                if (deviceStatusMap[newId]) {
                    deviceStatusMap[newId].connected = false;
                }
                
                // Clean up the problematic HID instance
                try {
                    if (hidDeviceInstances[newId]) {
                        hidDeviceInstances[newId].removeAllListeners();
                        hidDeviceInstances[newId].close();
                    }
                } catch (closeError) {
                    console.error(`Error closing HID instance after error for ${newId}:`, closeError);
                }
                hidDeviceInstances[newId] = null;
                
                // Notify UI about device disconnection
                if (global.mainWindow) {
                    global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                        deviceId: newId,
                        connected: false,
                        gpkRCVersion: deviceStatusMap[newId]?.gpkRCVersion || 0,
                        deviceType: deviceStatusMap[newId]?.deviceType || DeviceType.KEYBOARD,
                        config: deviceStatusMap[newId]?.config || {}
                    });
                }
            });
            
            hidDeviceInstances[newId].on('data', buffer => {
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
                                const deviceTypeStr = actualData.toString('utf8', 2).split('\0')[0];
                                deviceStatusMap[id].deviceType = stringToDeviceType(deviceTypeStr);

                                if (settingsStore) {
                                    const oledSettings = settingsStore.get('oledSettings');
                                    if (oledSettings && oledSettings[id] !== undefined) {
                                        if(oledSettings[id].enabled) {
                                            writeTimeToOled(device); 
                                        }
                                        deviceStatusMap[id].config.oled_enabled = oledSettings[id].enabled ? 1 : 0;
                                    }
                                }

                                // Mark initialization as complete
                                deviceStatusMap[id].initializing = false;
                                initializationComplete = true;


                                global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id].connected,
                                    gpkRCVersion: deviceStatusMap[id].gpkRCVersion,
                                    deviceType: deviceTypeToString(deviceStatusMap[id].deviceType),
                                    config: deviceStatusMap[id].config 
                                });
                            } else if (receivedActionId === actionId.trackpadGetValue) {
                                deviceStatusMap[id].config.trackpad = receiveTrackpadSpecificConfig(actualData);

                                global.mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id].connected,
                                    gpkRCVersion: deviceStatusMap[id].gpkRCVersion,
                                    deviceType: deviceTypeToString(deviceStatusMap[id].deviceType),
                                    config: deviceStatusMap[id].config
                                });
                            } else if (receivedActionId === actionId.pomodoroGetValue) {
                                const receivedPomoConfig = receivePomodoroConfig(actualData); // Parses only pomodoro settings
                            
                                const oldPhase = deviceStatusMap[id].config.pomodoro.phase;
                                const newPhase = receivedPomoConfig.pomodoro.phase;
                                const oldTimerActive = deviceStatusMap[id].config?.pomodoro?.timer_active;
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
                } catch (dataProcessingError) {
                    console.error(`Error processing device data for ${newId}:`, dataProcessingError);
                    
                    // If error suggests HID communication issues, trigger error event
                    if (dataProcessingError.message.includes("could not read from HID device") ||
                        dataProcessingError.message.includes("HID device disconnected")) {
                        console.error(`HID communication error detected for ${newId}, triggering cleanup`);
                        
                        // Trigger the error event which will handle cleanup
                        if (hidDeviceInstances[newId]) {
                            hidDeviceInstances[newId].emit('error', dataProcessingError);
                        }
                    }
                }
            });
            
            // Wait for device initialization to complete or timeout
            const timeout = 10000; // Increased timeout to 10 seconds
            const startTime = Date.now();
                        
            while (!initializationComplete && (Date.now() - startTime) < timeout) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Increased check interval
            }
            
            // Additional validation: ensure HID instance is still valid after timeout
            if (hidDeviceInstances[newId]) {
                try {
                    // Test HID instance readiness
                    if (!hidDeviceInstances[newId].read) {
                        console.warn(`Device ${newId} HID instance not fully ready after timeout`);
                    } else {
                    }
                } catch (hidTestError) {
                    console.warn(`Device ${newId} HID instance validation failed:`, hidTestError);
                }
            }
        } else {
            console.warn(`Device ${newId} started but no HID instance available`);
            // Ensure device status reflects the lack of HID instance
            if (deviceStatusMap[newId]) {
                deviceStatusMap[newId].initializing = false;
                deviceStatusMap[newId].connected = false;
            }
        }
        
        return newId;
    } catch (err) {
        console.error(`Error starting device:`, err);
        throw err;
    } finally {
        // Start device health monitoring if not already running
        if (!deviceHealthMonitor) {
            startDeviceHealthMonitoring();
        }
    }
}

const stop = (device) => {
    const id = encodeDeviceId(device);

    
    if (hidDeviceInstances[id]) {
        try {
            hidDeviceInstances[id].removeAllListeners();
            _close(id);
        } catch (error) {
            console.error(`Error during device stop for ${id}:`, error);
        }
        hidDeviceInstances[id] = null;
    }
    
    // Clean up device status and related data
    if (deviceStatusMap[id]) {
        deviceStatusMap[id].connected = false;
        deviceStatusMap[id] = undefined;
    }
    
    // Clean up other related data
    if (activeTabPerDevice[id]) {
        delete activeTabPerDevice[id];
    }
    
    if (isEditingPomodoroPerDevice[id]) {
        delete isEditingPomodoroPerDevice[id];
    }
    
    if (currentLayers[id]) {
        delete currentLayers[id];
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
    // Stop device health monitoring
    stopDeviceHealthMonitoring();
    
    if (!hidDeviceInstances) {
        return;
    }
    
    Object.keys(hidDeviceInstances).forEach(id => {
        _close(id);
    });
}

const writeCommand = async (device, command, retryCount = 0) => {
    const id = encodeDeviceId(device);
    const maxRetries = 2; // Allow 2 retries for communication failures
    
    try {
        // Check if device is connected and HID instance exists
        if (!hidDeviceInstances[id]) {
            console.error(`Device ${id} writeCommand failed: HID instance not found`);
            return { success: false, message: "Device not connected - HID instance not found" };
        }
        
        // Check if device status indicates it's connected
        if (deviceStatusMap[id] && deviceStatusMap[id].connected === false) {
            console.error(`Device ${id} writeCommand failed: marked as disconnected in status map`);
            return { success: false, message: "Device marked as disconnected" };
        }
        
        // Additional check: verify HID instance hasn't been closed
        if (hidDeviceInstances[id].closed) {
            console.error(`Device ${id} writeCommand failed: HID instance is closed`);
            
            // Mark device as disconnected
            if (deviceStatusMap[id]) {
                deviceStatusMap[id].connected = false;
            }
            
            return { success: false, message: "Device connection lost - HID instance closed" };
        }
        
        const bytes = commandToBytes(command);
        await hidDeviceInstances[id].write(bytes);    

        return { success: true };
    } catch (err) {
        console.error(`Error writing command to device ${id} (attempt ${retryCount + 1}):`, err);
        
        // If write fails, mark device as potentially disconnected
        if (deviceStatusMap[id]) {
            deviceStatusMap[id].connected = false;
        }
        
        // Check if this is a recoverable error and we haven't exceeded retries
        const isRecoverableError = err.message.includes("cannot write to hid device") ||
                                   err.message.includes("could not read from HID device") ||
                                   err.message.includes("HID device disconnected") ||
                                   err.message.includes("Device or resource busy");
        
        if (isRecoverableError && retryCount < maxRetries) {            
            // Clean up current HID instance
            if (hidDeviceInstances[id]) {
                try {
                    hidDeviceInstances[id].removeAllListeners();
                    hidDeviceInstances[id].close();
                } catch (closeError) {
                    console.error(`Error closing invalid HID instance for ${id}:`, closeError);
                }
                hidDeviceInstances[id] = null;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
            
            // Try to recreate HID instance
            try {
                const newDeviceId = await addKbd(device);
                
                if (hidDeviceInstances[newDeviceId]) {
                    // Restore connection status
                    if (deviceStatusMap[id]) {
                        deviceStatusMap[id].connected = true;
                    }
                    
                    // Wait a bit for device to stabilize
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Retry the command
                    return writeCommand(device, command, retryCount + 1);
                } else {
                    throw new Error("Failed to recreate HID instance");
                }
            } catch (recreateError) {
                console.error(`Failed to recreate HID instance for ${id}:`, recreateError);
                return { success: false, message: `Write error after recovery attempt: ${err.message}` };
            }
        } else {
            // Clean up invalid HID instance for non-recoverable errors or after max retries
            if (hidDeviceInstances[id]) {
                try {
                    hidDeviceInstances[id].removeAllListeners();
                    hidDeviceInstances[id].close();
                } catch (closeError) {
                    console.error(`Error closing invalid HID instance for ${id}:`, closeError);
                }
                hidDeviceInstances[id] = null;
            }
        }
        
        return { success: false, message: `Write error: ${err.message}` };
    }
}

// Device config functions
const getDeviceConfig = async (device, retryCount = 0) => {
    const id = encodeDeviceId(device);
    const maxRetries = 3; // Reduced retry count for faster feedback
    
    try {
        // Check if device has valid HID instance before attempting communication
        if (!hidDeviceInstances[id]) {
            throw new Error(`No HID instance available for device ${id}. Device may need to be reconnected.`);
        }
        
        // Additional validation: check if device status indicates it's connected
        if (deviceStatusMap[id] && deviceStatusMap[id].connected === false) {
            throw new Error(`Device ${id} marked as disconnected in status map`);
        }
        
        // Check if device is still initializing with more detailed logging
        if (deviceStatusMap[id] && deviceStatusMap[id].initializing === true) {
            throw new Error(`Device ${id} still initializing`);
        }
                
        // Additional check: test if HID instance is actually usable
        try {
            // Verify HID instance has required methods
            if (!hidDeviceInstances[id].read || !hidDeviceInstances[id].write) {
                console.warn(`HID instance for ${id} missing required methods`);
                throw new Error(`HID instance for ${id} not fully initialized`);
            }
            
            // Test if HID instance is responsive
            if (hidDeviceInstances[id].closed) {
                console.warn(`HID instance for ${id} is marked as closed`);
                throw new Error(`HID instance for ${id} is closed`);
            }

        } catch (hidCheckError) {
            console.warn(`HID instance check failed for ${id}:`, hidCheckError);
            // Clean up and throw error to trigger retry
            if (hidDeviceInstances[id]) {
                try {
                    hidDeviceInstances[id].removeAllListeners();
                    hidDeviceInstances[id].close();
                } catch (e) {}
                hidDeviceInstances[id] = null;
            }
            throw new Error(`HID instance not ready for ${id}: ${hidCheckError.message}`);
        }
        
        // Wait a bit before attempting communication to ensure device is ready
        await new Promise(resolve => setTimeout(resolve, 300)); // Increased initial delay
        
        const trackpadResult = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.trackpadGetValue] });

        
        if (!trackpadResult.success) {
            throw new Error(`Failed to request trackpad config: ${trackpadResult.message}`);
        }
        
        // Add delay between commands
        await new Promise(resolve => setTimeout(resolve, 300)); // Increased delay between commands
        
        const pomodoroResult = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.pomodoroGetValue] });

        
        if (!pomodoroResult.success) {
            throw new Error(`Failed to request pomodoro config: ${pomodoroResult.message}`);
        }
        

        return { success: true };
    } catch (err) {
        console.error(`Error getting device config for ${id} (attempt ${retryCount + 1}):`, err);
        
        // Retry if we haven't exceeded max retries and error indicates device might not be ready
        if (retryCount < maxRetries && 
            (err.message.includes("HID instance not found") || 
             err.message.includes("Device not connected") ||
             err.message.includes("cannot write to hid device") ||
             err.message.includes("could not read from HID device") ||
             err.message.includes("marked as disconnected") ||
             err.message.includes("still initializing") ||
             err.message.includes("not fully initialized") ||
             err.message.includes("not ready") ||
             err.message.includes("No HID instance available") ||
             err.message.includes("is closed") ||
             err.message.includes("Write error after recovery attempt"))) {

            await new Promise(resolve => setTimeout(resolve, 1500 * (retryCount + 1))); // Progressive retry delay
            return getDeviceConfig(device, retryCount + 1);
        }
        
        // If all retries failed, mark device as potentially needing reconnection
        if (deviceStatusMap[id]) {
            deviceStatusMap[id].connected = false;
            deviceStatusMap[id].initializing = false;
        }
        
        throw err;
    }
}
// Note: The following function to save device config is commented out.
const saveTrackpadConfig = async (device, trackpadDataBytes) => {
    try {
        const result = await writeCommand(device, { id: commandId.customSetValue, data: [actionId.trackpadSetValue, ...trackpadDataBytes] });
        if (!result.success) {
            throw new Error(result.message || "Failed to save trackpad config");
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Add 500ms delay
        return result;
    } catch (error) {
        console.error("Error saving trackpad config:", error);
        throw error;
    }
};

const savePomodoroConfigData = async (device, pomodoroDataBytes) => {
    try {
        const result = await writeCommand(device, { id: commandId.customSetValue, data: [actionId.pomodoroSetValue, ...pomodoroDataBytes] });
        if (!result.success) {
            throw new Error(result.message || "Failed to save pomodoro config");
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Add 500ms delay
        return result;
    } catch (error) {
        console.error("Error saving pomodoro config data:", error);
        return { success: false, error: error.message };
    }
};

// OLED functions
const writeTimeToOled = async (device, forceWrite = false) => {
    try {
        // Format date using dayjs
        const formattedDate = dayjs().format('YYYY/MM/DD ddd HH:mm ');
        const deviceId = encodeDeviceId(device);
        
        if (forceWrite || lastFormattedDateMap.get(deviceId) !== formattedDate) {
            lastFormattedDateMap.set(deviceId, formattedDate);
            const dataBytes = dataToBytes(formattedDate);
            const result = await writeCommand(device, { id: commandId.gpkRCOperation, data: [actionId.oledWrite, ...dataBytes] });
            
            if (!result.success) {
                console.error("Failed to write time to OLED:", result.message);
                return { success: false, error: result.message };
            }
            
            return result;
        } else {
            return { success: true, skipped: true };
        }
   } catch (error) {
        console.error("Error writing time to OLED:", error);
        return { success: false, error: error.message };
    }
};

const getPomodoroConfig = async (device) => {
    const result = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.pomodoroGetValue] });
    if (!result.success) {
        throw new Error(result.message || "Failed to get pomodoro config");
    }
    return result;
};

const getPomodoroActiveStatus = async (device) => {
    const result = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.pomodoroActiveGetValue] });
    if (!result.success) {
        throw new Error(result.message || "Failed to get pomodoro active status");
    }
    return result;
};

const getTrackpadConfigData = async (device) => {
    const result = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.trackpadGetValue] });
    if (!result.success) {
        throw new Error(result.message || "Failed to get trackpad config");
    }
    return result;
};


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
const getDeviceInitConfig = async (device) => {
    const result = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.deviceGetValue] });
    if (!result.success) {
        throw new Error(result.message || "Failed to get device init config");
    }
    return result;
};

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
export { getDeviceInitConfig, getDeviceConfig, writeTimeToOled, getPomodoroConfig } 
export { getDeviceType }
export { saveTrackpadConfig, savePomodoroConfigData, getPomodoroActiveStatus, getTrackpadConfigData }