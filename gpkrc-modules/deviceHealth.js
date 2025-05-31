import { DeviceType } from './deviceTypes.js';
import { encodeDeviceId, parseDeviceId } from './communication.js';

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
    // Note: This function needs access to deviceStatusMap, hidDeviceInstances, getKBD, and addKbd
    // These will be injected via dependency injection pattern when this module is used
    const { deviceStatusMap, hidDeviceInstances, getKBD, addKbd } = await import('../gpkrc.js');
    
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

// Function to check if device health monitoring is running
const isDeviceHealthMonitoringActive = () => {
    return deviceHealthMonitor !== null;
};

export { startDeviceHealthMonitoring, stopDeviceHealthMonitoring, checkDeviceHealth, isDeviceHealthMonitoringActive };