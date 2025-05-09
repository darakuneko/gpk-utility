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
    importFile: async (fn) => await ipcRenderer.invoke('importFile', fn ),
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
       
       // Create a set of device IDs that are currently physically connected
       const connectedIds = new Set(kbdList.map(device => device.id));
       
       // First update existing devices connectivity status
       // Mark devices as disconnected if they no longer appear in kbdList
       connectDevices = connectDevices.map(device => {
           // Check if the device is in the current kbdList
           const isConnected = connectedIds.has(device.id);
           if (!isConnected && device.connected) {
               // Device was connected but is now disconnected
               // Notify main process about disconnection
               ipcRenderer.send('deviceDisconnected', device.id);
               
               return {
                   ...device,
                   connected: false,
                   config: {} // Clear config for disconnected devices
               };
           }
           return device;
       });
       
       // Add new devices that aren't in our tracking list yet
       if (kbdList && kbdList.length > 0) {
           kbdList.forEach(device => {
               if (!connectDevices.find(cd => cd.id === device.id)) {
                   connectDevices.push(device);
               }
           });
       }
       
       // Force config update on connected devices periodically
       const currentTime = Date.now();
       const timeSinceLastPoll = currentTime - lastPollingTime;
       const shouldForceUpdate = timeSinceLastPoll >= 5000; // Force update every 5 seconds

       const devicePromises = connectDevices.map(async (cd, i) => {
           // Skip processing for already marked disconnected devices
           if (!cd.connected && !connectedIds.has(cd.id)) {
               return cd;
           }
           
           const isDeviceActive = isSliderActive && activeSliderDeviceId === cd.id;
           let connectKbd = await command.getConnectKbd(cd.id);
           if(!connectKbd && cd.connected) {
               // Device appears disconnected
               connectDevices[i].connected = false;
               connectDevices[i].config = {};
               return connectDevices[i];
           } 
           else if(connectedIds.has(cd.id) && (!connectKbd || !connectKbd.connected || !cd.connected)) {
               // Device is physically connected but not initialized in our system
               if (!connectKbd) {
                   await command.start(cd);
                   connectKbd = await command.getConnectKbd(cd.id);
               }
               
               if (connectKbd) {
                   connectDevices[i].connected = true;
                   try {
                       await command.getConfig(connectDevices[i]);
                   } catch (e) {
                   }
               }
               return connectDevices[i];
           } 
           else if(connectKbd && connectKbd.config) {
                const connectKbd_changed = connectKbd.config.changed;
                const connectKbd_oledSettings_enabled = connectKbd.config?.oledSettings?.enabled === true
                const connectKbd_pomodoro_timer_active = connectKbd.config?.pomodoro_timer_active === 1
                const connectDevices_pomodoro_timer_active = connectDevices[i].config?.pomodoro_timer_active === 1

               // Update pomodoro timer related information even during slider operation
               if(connectKbd_oledSettings_enabled) { 
                    await command.dateTimeOledWrite(connectDevices[i]);
                }
               if (connectKbd_pomodoro_timer_active) {
                   if (connectDevices_pomodoro_timer_active) {
                       connectDevices[i].config.pomodoro_minutes = connectKbd.config.pomodoro_minutes;
                       connectDevices[i].config.pomodoro_seconds = connectKbd.config.pomodoro_seconds;
                       connectDevices[i].config.pomodoro_state = connectKbd.config.pomodoro_state;
                       connectDevices[i].config.pomodoro_current_cycle = connectKbd.config.pomodoro_current_cycle;
                   } else {
                       connectDevices[i].config = { ...connectKbd.config };
                       if (connectKbd_changed) {
                           const originalChanged = connectDevices[i].config.changed;
                           connectDevices[i].config = { ...connectKbd.config, changed: originalChanged };
                       }
                   }
               }
               
               // Skip updating device during slider operation
               if (isDeviceActive) {
                   connectDevices[i].connected = connectKbd.connected;
                   return connectDevices[i];
               }
               
               // Keep changed state if device config is modified
               if (connectKbd_changed) {
                   return connectDevices[i];
               }
               
               // Periodically force config update even if pomodoro is in editing mode
               if (shouldForceUpdate && cd.connected) {
                   try {
                       await command.getConfig(connectDevices[i]);
                       connectKbd = await command.getConnectKbd(cd.id);
                   } catch (e) {
                   }
               }
               
               connectDevices[i].connected = true;
               connectDevices[i].config = { ...connectKbd.config };
               
               if (connectDevices[i].config.init === undefined) {
                   connectDevices[i].config.init = 1;
               }

               connectDevices[i].config.changed = false;

               return connectDevices[i];
           } 
           else if(connectDevices[i] && connectDevices[i].config.changed) {

               await command.sendDeviceConfig(connectDevices[i]);
               const updatedConfig = await command.getConfig(connectDevices[i]);
               if (updatedConfig && updatedConfig.config) {
                   connectDevices[i].config = { ...updatedConfig.config };
               }
               connectDevices[i].config.changed = false;
               return connectDevices[i];
           }
           return connectDevices[i];
       });
       
       const updatedDevices = await Promise.all(devicePromises);
       
       // Always notify of device changes to ensure UI gets updated
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
        const dat = await command.importFile()
        if(dat) {
            try {
                const json = JSON.parse(dat)
                connectDevices = await Promise.all(connectDevices.map(async (cd) => {
                   const j = json.find((j) =>
                        j.id === cd.id &&
                        j.manufacturer === cd.manufacturer &&
                        j.product === cd.product &&
                        j.productId === cd.productId &&
                        j.vendorId === cd.vendorId)
                   if(j){
                       await command.sendDeviceConfig(j)
                       return j
                   }
                   return cd
               }))
               await command.changeConnectDevice(connectDevices)
            } catch (e) {
            }
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

