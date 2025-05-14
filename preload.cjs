const { contextBridge, ipcRenderer } = require('electron');

let cachedDeviceRegistry = [];
let isSliderActive = false;
let activeSliderDeviceId = null;
let keyboardPollingInterval = null;

// Function to start keyboard polling at regular intervals
const startKeyboardPolling = () => {
    if (keyboardPollingInterval) {
        clearInterval(keyboardPollingInterval);
    }
    
    // Initial execution
    keyboardSendLoop();
    
    // Set up interval for regular execution (1 second)
    keyboardPollingInterval = setInterval(async () => {
        await keyboardSendLoop();
    }, 1000);
};

// Initialize polling when the window is loaded
document.addEventListener('DOMContentLoaded', () => {
    startKeyboardPolling();
});

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
    getPomodoroConfig: async (device) => await ipcRenderer.invoke('getPomodoroConfig', device),
    getGpkRCInfo: async (device) => await ipcRenderer.invoke('getGpkRCInfo', device),
    dateTimeOledWrite: async (device) => await ipcRenderer.invoke('dateTimeOledWrite', device),
    sendDeviceConfig: async (device) => await ipcRenderer.invoke('sendDeviceConfig', device),
    setConnectDevices: async (devices) => {
        cachedDeviceRegistry = devices
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

       await command.startWindowMonitoring(); 

       const kbdList = await command.getKBDList();
       const connectedIds = new Set(kbdList.map(device => device.id));
       
       // Update connection status for existing devices
       cachedDeviceRegistry = cachedDeviceRegistry.map(device => {
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
           if (!cachedDeviceRegistry.find(cd => cd.id === device.id)) {
               cachedDeviceRegistry.push(device);
           }
       });       

       // Process each device
       await Promise.all(cachedDeviceRegistry.map(async (device) => {
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
           if (!connectKbd) {
               await command.start(device);
           } else {
            const existConfingInit = device.config?.init;
            const existConfingOledEnabled = device.config?.oled_enabled;

               if(!existConfingOledEnabled && !existConfingInit) {
                   await command.getConfig(device);
               }
               // Handle connected device with configuration
               if (device.config) {
                   const oled_enabled = device.config?.oled_enabled === 1;
                   const pomodoro_timer_active = device.config?.pomodoro_timer_active === 1;
                   if (oled_enabled) {
                       await command.dateTimeOledWrite(device);
                   }
                   if (pomodoro_timer_active) {
                        await command.getPomodoroConfig(device);
                   }
               }
            }
       }));
   } catch (err) {
       console.error("Error in keyboardSendLoop:", err);
   }
}

ipcRenderer.on("deviceConnectionStateChanged", (event, { deviceId, connected, gpkRCVersion, deviceType, config }) => {
        const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);

        const device = cachedDeviceRegistry[deviceIndex];
        // Only update if connection status changes or command version changes
        let changed = false;
        if (device.connected !== connected){
            cachedDeviceRegistry[deviceIndex].connected = connected;
            changed = true;
        } 
        if(device.gpkRCVersion !== gpkRCVersion) {
            cachedDeviceRegistry[deviceIndex].gpkRCVersion = gpkRCVersion;
            changed = true;
        }
        if(device.deviceType !== deviceType) {
            cachedDeviceRegistry[deviceIndex].deviceType = deviceType;
            changed = true;
        }
        if(device.config !== config) {
            cachedDeviceRegistry[deviceIndex].config = config;
            changed = true;
        }
        if(changed) {
            command.changeConnectDevice(cachedDeviceRegistry);
        }
    });

    // OLEDの設定が変更されたときのイベントリスナー
    ipcRenderer.on("oledSettingsChanged", (event, { deviceId, enabled }) => {
        const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
        if (deviceIndex !== -1) {
            if (!cachedDeviceRegistry[deviceIndex].config) {
                cachedDeviceRegistry[deviceIndex].config = {};
            }
            cachedDeviceRegistry[deviceIndex].config.oled_enabled = enabled ? 1 : 0;
            command.changeConnectDevice(cachedDeviceRegistry);
            // デバイス構成の更新をサーバーに送信
            command.sendDeviceConfig(cachedDeviceRegistry[deviceIndex]);
        }
    });

    ipcRenderer.on("deviceConnectionStatePomodoroChanged", (event, { deviceId, pomodoroConfig }) => {     
        const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
        cachedDeviceRegistry[deviceIndex].config.pomodoro_work_time = pomodoroConfig.pomodoro_work_time;
        cachedDeviceRegistry[deviceIndex].config.pomodoro_break_time = pomodoroConfig.pomodoro_break_time;
        cachedDeviceRegistry[deviceIndex].config.pomodoro_long_break_time = pomodoroConfig.pomodoro_long_break_time;
        cachedDeviceRegistry[deviceIndex].config.pomodoro_cycles = pomodoroConfig.pomodoro_cycles;
        cachedDeviceRegistry[deviceIndex].config.pomodoro_timer_active = pomodoroConfig.pomodoro_timer_active;    
        cachedDeviceRegistry[deviceIndex].config.pomodoro_state = pomodoroConfig.pomodoro_state;
        cachedDeviceRegistry[deviceIndex].config.pomodoro_minutes = pomodoroConfig.pomodoro_minutes;
        cachedDeviceRegistry[deviceIndex].config.pomodoro_seconds = pomodoroConfig.pomodoro_seconds;
        cachedDeviceRegistry[deviceIndex].config.pomodoro_current_cycle = pomodoroConfig.pomodoro_current_cycle;  

        command.changeConnectDevice(cachedDeviceRegistry);
    });

    ipcRenderer.on("configUpdated", (event, { deviceId, config, identifier }) => {
        const deviceIndex = cachedDeviceRegistry.findIndex(device => device.id === deviceId);
        if (deviceIndex !== -1) {
            cachedDeviceRegistry[deviceIndex].config = { ...config };
            command.changeConnectDevice(cachedDeviceRegistry);
        }
    });

contextBridge.exposeInMainWorld("api", {
    start: async (device) => await command.start(device),
    stop: async (device) => await command.stop(device),
    getGpkRCInfo: async (device) => await command.getGpkRCInfo(device),
    sendDeviceConfig: async (device) => await command.sendDeviceConfig(device),
    setConnectDevices: (device) => command.setConnectDevices(device),
    exportFile: async () => await command.exportFile(cachedDeviceRegistry),
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
                
                const updatedDevices = await Promise.all(cachedDeviceRegistry.map(async (cd) => {
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
                
                cachedDeviceRegistry = updatedDevices;
                await command.changeConnectDevice(cachedDeviceRegistry);
                
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