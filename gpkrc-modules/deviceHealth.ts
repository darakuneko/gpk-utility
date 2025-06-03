import type { DeviceStatus } from '../src/types/device';
import type { HIDDeviceInstance } from '../src/types/api-types';

import { DeviceType } from './deviceTypes';
import { parseDeviceId } from './communication';

// Device health monitoring variables
let deviceHealthMonitor: NodeJS.Timeout | null = null;
const deviceHealthCheckInterval = 10000; // Check every 10 seconds

// Dependency injection interfaces  
interface DeviceHealthDependencies {
    deviceStatusMap: Record<string, DeviceStatus>;
    hidDeviceInstances: Record<string, HIDDeviceInstance | null>;
    getKBD: (device: { vendorId: number; productId: number } | { id: string }, retryCount?: number) => Promise<HIDDeviceInstance | null>;
    addKbd: (device: { vendorId: number; productId: number } | { id: string }) => Promise<string>;
    mainWindow?: {
        webContents: {
            send: (channel: string, data: {
                deviceId: string;
                connected: boolean;
                gpkRCVersion: number;
                deviceType: string;
                config: Record<string, unknown>;
            }) => void;
        };
    } | null;
}

let dependencies: DeviceHealthDependencies | null = null;

// Function to inject dependencies
export const injectDeviceHealthDependencies = (deps: DeviceHealthDependencies): void => {
    dependencies = deps;
};

// Function to start device health monitoring
export const startDeviceHealthMonitoring = (): void => {
    if (deviceHealthMonitor) {
        clearInterval(deviceHealthMonitor);
    }
    
    deviceHealthMonitor = setInterval(async (): Promise<void> => {
        await checkDeviceHealth();
    }, deviceHealthCheckInterval);
};

// Function to stop device health monitoring
export const stopDeviceHealthMonitoring = (): void => {
    if (deviceHealthMonitor) {
        clearInterval(deviceHealthMonitor);
        deviceHealthMonitor = null;
    }
};

// Function to check device health and attempt recovery
export const checkDeviceHealth = async (): Promise<void> => {
    if (!dependencies) {
        console.warn('Device health dependencies not injected');
        return;
    }
    
    const { deviceStatusMap, hidDeviceInstances, getKBD, addKbd, mainWindow } = dependencies;
    
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
                    hidInstance.removeAllListeners?.();
                    hidInstance.close?.();
                } catch {
                    // Ignore cleanup errors - device is being disconnected
                }
                hidDeviceInstances[deviceId] = null;
                
                // Notify UI about disconnection
                if (mainWindow) {
                    mainWindow.webContents.send("deviceConnectionStateChanged", {
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
                            if (mainWindow) {
                                mainWindow.webContents.send("deviceConnectionStateChanged", {
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
export const isDeviceHealthMonitoringActive = (): boolean => {
    return deviceHealthMonitor !== null;
};