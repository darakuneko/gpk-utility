const { contextBridge, ipcRenderer } = require('electron');

let connectDevices = [];
let isPolling = false;
let isSliderActive = false;
let activeSliderDeviceId = null;
let keyboardPollingInterval = null;
let lastPollingTime = Date.now();

const command = {
    start: async (device) => await ipcRenderer.invoke('start', device),
    stop: async (device) => await ipcRenderer.invoke('stop', device),
    close: async () => await ipcRenderer.invoke('close'),
    sleep: async (msec) => await ipcRenderer.invoke('sleep', msec),
    encodeDeviceId: async (device) => await ipcRenderer.invoke('encodeDeviceId', device),
    getKBDList: async () => await ipcRenderer.invoke('getKBDList'),
    changeConnectDevice: (dat) => ipcRenderer.send("changeConnectDevice", dat),
    getConnectKbd: async (id) => await ipcRenderer.invoke('getConnectKbd', id),
    getConfig: async (device) => await ipcRenderer.invoke('getConfig', device),
    gpkRCVersion: async (device) => await ipcRenderer.invoke('gpkRCVersion', device),
    dateTimeOledWrite: async (device) => await ipcRenderer.invoke('dateTimeOledWrite', device),
    sendDeviceConfig: async (data) => {
        try {
            const result = await ipcRenderer.invoke('sendDeviceConfig', data);
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    setConnectDevices: async (devices) => {
        connectDevices = devices
    },
    exportFile: async (data) => await ipcRenderer.invoke('exportFile', data),
    importFile: async () => await ipcRenderer.invoke('importFile'),
    setActiveTab: async (device, tabName) => await ipcRenderer.invoke('setActiveTab', device, tabName),
    setEditingPomodoro: async (device, isEditing) => await ipcRenderer.invoke('setEditingPomodoro', device, isEditing),
    startWindowMonitoring: async () => await ipcRenderer.invoke('startWindowMonitoring'),
    getActiveWindows: async () => await ipcRenderer.invoke('getActiveWindows'),
}

const keyboardSendLoop = async () => {
   try {
       if (isPolling) {
           return connectDevices;
       }
       
       isPolling = true;
       
       const kbdList = await command.getKBDList();
       const connectedIds = new Set(kbdList.map(device => device.id));
       
       // Update connection status for existing devices
       connectDevices = connectDevices.map(device => {
           const isConnected = connectedIds.has(device.id);
           if (!isConnected && device.connected) {
               ipcRenderer.send('deviceDisconnected', device.id);
               return {
                   ...device,
                   connected: false,
                   config: {}
               };
           }
           return device;
       });
       
       // Add new devices
       kbdList.forEach(device => {
           if (!connectDevices.find(cd => cd.id === device.id)) {
               connectDevices.push(device);
           }
       });
       
       const currentTime = Date.now();
       const timeSinceLastPoll = currentTime - lastPollingTime;
       const shouldForceUpdate = timeSinceLastPoll >= 5000;

       // Process each device
       const updatedDevices = await Promise.all(connectDevices.map(async (device, index) => {
           // Skip disconnected devices that aren't in current list
           if (!device.connected && !connectedIds.has(device.id)) {
               return device;
           }
           
           const isDeviceActive = isSliderActive && activeSliderDeviceId === device.id;
           const connectKbd = await command.getConnectKbd(device.id);
           
           // Handle disconnected device
           if (!connectKbd && device.connected) {
               return {
                   ...device,
                   connected: false,
                   config: {}
               };
           }
           
           // Handle device that needs initialization
           if (connectedIds.has(device.id) && (!connectKbd || !connectKbd.connected || !device.connected)) {
               const updatedDevice = { ...device };
               
               if (!connectKbd) {
                   await command.start(device);
               }
               
               updatedDevice.connected = true;
               
               try {
                   await command.getConfig(updatedDevice);
               } catch (error) {
                   console.error(`Error getting config for device: ${device.id}`, error);
               }
               
               return updatedDevice;
           }
           
           // Handle connected device with configuration
           if (connectKbd && connectKbd.config) {
               const updatedDevice = { ...device };
               const connectKbd_changed = connectKbd.config.changed;
               const connectKbd_oledSettings_enabled = connectKbd.config?.oledSettings?.enabled === true;
               const connectKbd_pomodoro_timer_active = connectKbd.config?.pomodoro_timer_active === 1;
               const device_pomodoro_timer_active = device.config?.pomodoro_timer_active === 1;
               
               // Update OLED even during slider operation
               if (connectKbd_oledSettings_enabled) {
                   await command.dateTimeOledWrite(device);
               }
               
               // Update pomodoro timer state even during slider operation
               if (connectKbd_pomodoro_timer_active) {
                   if (device_pomodoro_timer_active) {
                       // Update only timer-related fields
                       updatedDevice.config = {
                           ...updatedDevice.config,
                           pomodoro_minutes: connectKbd.config.pomodoro_minutes,
                           pomodoro_seconds: connectKbd.config.pomodoro_seconds,
                           pomodoro_state: connectKbd.config.pomodoro_state,
                           pomodoro_current_cycle: connectKbd.config.pomodoro_current_cycle
                       };
                   } else {
                       // Full config update
                       updatedDevice.config = { ...connectKbd.config };
                       if (connectKbd_changed) {
                           const originalChanged = updatedDevice.config.changed;
                           updatedDevice.config = { 
                               ...connectKbd.config, 
                               changed: originalChanged 
                           };
                       }
                   }
               }
               
               // Skip updating during slider operation
               if (isDeviceActive) {
                   updatedDevice.connected = connectKbd.connected;
                   return updatedDevice;
               }
               
               // Keep changed state if modified
               if (connectKbd_changed) {
                   return updatedDevice;
               }
               
               // Force config update periodically
               if (shouldForceUpdate && device.connected) {
                   try {
                       await command.getConfig(updatedDevice);
                       // Get fresh data after forced update
                       const freshKbd = await command.getConnectKbd(device.id);
                       if (freshKbd && freshKbd.config) {
                           updatedDevice.config = { ...freshKbd.config, changed: false };
                       }
                   } catch (error) {
                       console.error(`Error forcing config update: ${device.id}`, error);
                   }
               } else {
                   // Normal update
                   updatedDevice.connected = true;
                   updatedDevice.config = { ...connectKbd.config, changed: false };
                   
                   if (updatedDevice.config.init === undefined) {
                       updatedDevice.config.init = 1;
                   }
               }
               
               return updatedDevice;
           }
           
           // Handle device with local changes
           if (device && device.config && device.config.changed) {
               const updatedDevice = { ...device };
               
               try {
                   await command.sendDeviceConfig(device);
                   const updatedConfig = await command.getConfig(device);
                   
                   if (updatedConfig && updatedConfig.config) {
                       updatedDevice.config = { ...updatedConfig.config, changed: false };
                   } else {
                       updatedDevice.config.changed = false;
                   }
               } catch (error) {
                   console.error(`Error sending device config: ${device.id}`, error);
                   updatedDevice.config.changed = false;
               }
               
               return updatedDevice;
           }
           
           return device;
       }));
       
       // Update and notify
       connectDevices = updatedDevices;
       await command.changeConnectDevice(connectDevices);
       
       isPolling = false;
       return connectDevices;
   } catch (err) {
       console.error("Error in keyboardSendLoop:", err);
       isPolling = false;
       return connectDevices;
   }
}

const startKeyboardPolling = () => {
    if (keyboardPollingInterval) {
        clearTimeout(keyboardPollingInterval);
        keyboardPollingInterval = null;
    }
    
    lastPollingTime = Date.now();
    scheduleNextPoll(1000);
};

const scheduleNextPoll = (delay) => {
    keyboardPollingInterval = setTimeout(async () => {
        try {
            const currentTime = Date.now();
            const timeSinceLastPoll = currentTime - lastPollingTime;
            
            if (isPolling) {
                scheduleNextPoll(1000);
                return;
            }
            
            lastPollingTime = currentTime;
            const startTime = Date.now();
            
            await keyboardSendLoop();
            
            const executionTime = Date.now() - startTime;
            const nextDelay = Math.max(1000 - executionTime, 0);
            
            scheduleNextPoll(nextDelay);
        } catch (err) {
            scheduleNextPoll(1000);
        }
    }, delay);
};

startKeyboardPolling();

setTimeout(() => {
    if (!keyboardPollingInterval) {
        startKeyboardPolling();
    }
}, 2000);

const setupEventListeners = () => {
    ipcRenderer.on("configUpdated", (event, { deviceId, config, identifier }) => {
        const deviceIndex = connectDevices.findIndex(device => device.id === deviceId);
        if (deviceIndex !== -1) {
            connectDevices[deviceIndex].config = { ...config };
            if (identifier) {
                connectDevices[deviceIndex].identifier = identifier;
            }
            command.changeConnectDevice(connectDevices);
        }
    });

    ipcRenderer.on("deviceConnectionStateChanged", (event, { deviceId, connected, gpkRCVersion, deviceType }) => {
        const deviceIndex = connectDevices.findIndex(device => device.id === deviceId);
        if (deviceIndex >= 0) {
            const device = connectDevices[deviceIndex];
            // Only update if connection status changes or command version changes
            let changed = false;
            if (device.connected !== connected){
                connectDevices[deviceIndex].connected = connected;
                changed = true;
            } 
            if(device.gpkRCVersion !== gpkRCVersion) {
                connectDevices[deviceIndex].gpkRCVersion = gpkRCVersion;
                changed = true;
            }
            if(device.deviceType !== deviceType) {
                connectDevices[deviceIndex].deviceType = deviceType;
                changed = true;
            }
            if(changed) {
                command.changeConnectDevice(connectDevices);
            }
        }
    });
}

setupEventListeners();

contextBridge.exposeInMainWorld("api", {
    start: async (device) => await command.start(device),
    stop: async (device) => await command.stop(device),
    gpkRCVersion: async (device) => await command.gpkRCVersion(device),
    keyboardSendLoop: async () => {
        // Device list retrieval for UI initialization
        // Return current device list if polling is already in progress
        if (isPolling) {
            return connectDevices;
        }
        
        // First execution if polling has not started yet
        if (!keyboardPollingInterval) {
            startKeyboardPolling();
            
            // Wait for first result after polling starts
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return connectDevices;
    },
    sendDeviceConfig: async (data) => await command.sendDeviceConfig(data),
    setConnectDevices: (device) => command.setConnectDevices(device),
    exportFile: async () => await command.exportFile(connectDevices),
    importFile: async () => {
        try {
            const dat = await command.importFile();
            if (!dat) {
                return { success: false, message: "No file was imported" };
            }
            
            try {
                const json = JSON.parse(dat);
                
                if (!Array.isArray(json)) {
                    return { success: false, error: "Invalid file format: JSON array expected" };
                }
                
                const updatedDevices = await Promise.all(connectDevices.map(async (cd) => {
                    const matchingConfig = json.find((j) =>
                        j.id === cd.id &&
                        j.manufacturer === cd.manufacturer &&
                        j.product === cd.product &&
                        j.productId === cd.productId &&
                        j.vendorId === cd.vendorId
                    );
                    
                    if (matchingConfig) {
                        try {
                            await command.sendDeviceConfig(matchingConfig);
                            return matchingConfig;
                        } catch (err) {
                            console.error(`Error applying config to device ${cd.id}:`, err);
                            return cd;
                        }
                    }
                    
                    return cd;
                }));
                
                connectDevices = updatedDevices;
                await command.changeConnectDevice(connectDevices);
                
                return { success: true, devicesUpdated: updatedDevices.length };
            } catch (parseErr) {
                console.error("JSON parse error:", parseErr);
                return { success: false, error: "Invalid JSON format" };
            }
        } catch (err) {
            console.error("Import file error:", err);
            return { success: false, error: err.message || "Unknown error during import" };
        }
    },
    setSliderActive: (active, deviceId = null) => {
        isSliderActive = active;
        activeSliderDeviceId = active ? deviceId : null;
    },
    setActiveTab: async (device, tabName) => await command.setActiveTab(device, tabName),
    setEditingPomodoro: async (device, isEditing) => await command.setEditingPomodoro(device, isEditing),
    startWindowMonitoring: async () => await command.startWindowMonitoring(),
    getActiveWindows: async () => await command.getActiveWindows(),
    // Save and load AutoLayer settings
    saveAutoLayerSettings: async (settings) => await ipcRenderer.invoke('saveAutoLayerSettings', settings),
    loadAutoLayerSettings: async () => await ipcRenderer.invoke('loadAutoLayerSettings'),
    // Save and load OLED settings
    saveOledSettings: async (deviceId, enabled) => await ipcRenderer.invoke('saveOledSettings', deviceId, enabled),
    loadOledSettings: async (deviceId) => await ipcRenderer.invoke('loadOledSettings', deviceId),
    // Save and load tray settings
    saveTraySettings: async (settings) => await ipcRenderer.invoke('saveTraySettings', settings),
    loadTraySettings: async () => await ipcRenderer.invoke('loadTraySettings'),
    on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    off: (channel, func) => {
        ipcRenderer.removeListener(channel, func);
    }
});

// Cleanup handlers
process.on('exit', () => {
    if (keyboardPollingInterval) {
        clearInterval(keyboardPollingInterval);
    }
});

