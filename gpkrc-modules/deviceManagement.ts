import HID from 'node-hid'
import Store from 'electron-store';

import type { 
    HIDDevice, 
    DeviceWithId, 
    Device as GPKDevice,
    DeviceConfig, 
    DeviceStatus,
    CommandResult,
    PomodoroConfig
} from '../src/types/device';
import type { HIDDeviceInstance } from '../src/types/api-types';
import type { StoreSchema } from '../src/types/store';

import { DeviceType, stringToDeviceType } from './deviceTypes';
import { commandId, actionId, encodeDeviceId, DEFAULT_USAGE, PACKET_PADDING } from './communication';
import { 
    startDeviceHealthMonitoring, 
    isDeviceHealthMonitoringActive,
    injectDeviceHealthDependencies
} from './deviceHealth';
import { injectOledDependencies, writeTimeToOled } from './oledDisplay';
import { injectPomodoroDependencies, receivePomodoroConfig, receivePomodoroActiveStatus } from './pomodoroConfig';
import { injectTrackpadDependencies, receiveTrackpadSpecificConfig } from './trackpadConfig';
import { injectLedDependencies, receiveLedConfig, receiveLedLayerConfig } from './ledConfig';
import { injectWindowMonitoringDependencies, cleanupDeviceLayerTracking } from './windowMonitoring';
import { stopDeviceHealthMonitoring } from './deviceHealth';

interface Command {
    id: number;
    data?: number[];
}

// Type conversion utilities
// Currently unused - remove if not needed in future
// const hidDeviceToGPKDevice = (hidDevice: HID.Device, id: string): GPKDevice => ({
//     ...hidDevice,
//     id,
//     manufacturer: hidDevice.manufacturer || '',
//     product: hidDevice.product || '',
//     connected: true
// });

interface WriteCommandResult {
    success: boolean;
    message?: string;
}

interface ElectronWindow {
    webContents: {
        send: (channel: string, data: unknown) => void;
    };
    restore?: () => void; // Add missing property from BrowserWindow
}

// Global variables with proper types
const deviceStatusMap: Record<string, DeviceStatus | undefined> = {}
const hidDeviceInstances: Record<string, HID.HID | null> = {}
const activeTabPerDevice: Record<string, string> = {}
const isEditingPomodoroPerDevice: Record<string, boolean> = {}
let settingsStore: Store<StoreSchema> | null = null
let mainWindow: ElectronWindow | null = null

const getKBD = async (device: GPKDevice, retryCount: number = 0): Promise<HID.Device | undefined> => {
    const maxRetries = 3;
    
    const searchDevice = (): HID.Device | undefined => HID.devices().find((d): boolean =>
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
        await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 200 * (retryCount + 1)));
        
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

const getKBDList = (): DeviceWithId[] => HID.devices().filter((d): boolean =>
        (d.serialNumber?.match(/^vial:/i) ? true : false) &&
        d.usage === DEFAULT_USAGE.usage &&
        d.usagePage === DEFAULT_USAGE.usagePage
    ).sort((a, b): number => `${a.manufacturer}${a.product}` > `${b.manufacturer}${b.product}` ? 1 : -1)
    .map((device): DeviceWithId => {
        const id = encodeDeviceId(device as HIDDevice)
        if (deviceStatusMap[id]) {
            return {
                ...device,
                id: id,
                deviceType: deviceStatusMap[id]!.deviceType,
                gpkRCVersion: deviceStatusMap[id]!.gpkRCVersion,
                path: device.path || ''
            } as DeviceWithId
        } else {
            return {
                ...device,
                id: id,
                path: device.path || ''
            } as DeviceWithId
        }
    })

// Function to set the active tab
const setActiveTab = (device: GPKDevice, tabName: string): void => {
    // Device already has encoded ID, use it directly
    const id = device.id
    activeTabPerDevice[id] = tabName
}

// Function to get the active tab
const getActiveTab = (device: GPKDevice): string | undefined => {
    // Device already has encoded ID, use it directly
    const id = device.id
    return activeTabPerDevice[id]
}

const setMainWindow = (window: ElectronWindow): void => {
    mainWindow = window
    ;(global as { mainWindow?: ElectronWindow }).mainWindow = window
}

const addKbd = async (device: GPKDevice): Promise<string> => { 
    const d = await getKBD(device);
    // GPKDevice already has encoded ID, use it directly
    const id = device.id;
    
    if (!d || !d.path) {
        // Note: This is normal during device reconnection - HID path becomes available after detection
        throw new Error(`Device not found or path not available for device: ${id}`);
    }
    
    // Clean up any existing instance before creating a new one
    if (hidDeviceInstances[id]) {
        try {
            hidDeviceInstances[id]!.removeAllListeners();
            hidDeviceInstances[id]!.close();
        } catch (closeError) {
            console.error(`Error closing existing HID instance for ${id}:`, closeError);
        }
        hidDeviceInstances[id] = null;
    }
    
    try {
        hidDeviceInstances[id] = new HID.HID(d.path);
        
        // Verify HID instance was created successfully
        if (!hidDeviceInstances[id] || !hidDeviceInstances[id]!.write) {
            throw new Error(`HID instance not properly initialized for ${id}`);
        }
                
        // Fetch device info using customGetValue and deviceGetValue action
        // Add a small delay before sending the first command
        setTimeout((): void => {
            try {
                if (hidDeviceInstances[id]) {
                    const bytes = [0, commandId.gpkRCPrefix, commandId.customGetValue, actionId.deviceGetValue];
                    const padding = Array(PACKET_PADDING - (bytes.length % PACKET_PADDING)).fill(0);
                    hidDeviceInstances[id]!.write(bytes.concat(padding));
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

const start = async (device: GPKDevice): Promise<string> => {
    if (!device) {
        throw new Error("Device information is required");
    }
    
    try {
        // Device already has encoded ID, use it directly
        const id = device.id;

        
        // Reset device status first
        deviceStatusMap[id] = {
            config: {
                pomodoro: {},
                trackpad: {},
            },
            deviceType: DeviceType.KEYBOARD,
            gpkRCVersion: 0,
            connected: true,
            initializing: true, // Track initialization state
        };
        
        // Add device and create HID instance with retry logic
        let newId: string;
        let retryCount = 0;
        const maxRetries = 1;
        
        while (retryCount < maxRetries) {
            try {
                // Convert HIDDevice to GPKDevice for addKbd
                const gpkDevice: GPKDevice = {
                    ...device,
                    id,
                    manufacturer: device.manufacturer || '',
                    product: device.product || ''
                };
                newId = await addKbd(gpkDevice);
                // If addKbd succeeds and HID instance exists, break the retry loop
                if (hidDeviceInstances[newId]) {
                    break;
                }
                throw new Error(`HID instance not created despite successful addKbd call`);
            } catch (addError) {
                retryCount++;
                const errorMessage = addError instanceof Error ? addError.message : String(addError);
                
                // Note: "Device not found or path not available" errors during reconnection are normal
                if (!errorMessage.includes("Device not found or path not available")) {
                    console.warn(`Failed to add device ${id} (attempt ${retryCount}/${maxRetries}):`, errorMessage);
                }
                
                if (retryCount >= maxRetries) {
                    console.error(`Failed to create HID instance for ${id} after ${maxRetries} attempts`);
                    // Mark device as connected but not properly initialized
                    if (deviceStatusMap[id]) {
                        deviceStatusMap[id].initializing = false;
                        deviceStatusMap[id].connected = false;
                    }
                    throw new Error(`Failed to initialize device ${id} after ${maxRetries} attempts: ${addError instanceof Error ? addError.message : String(addError)}`);
                }
                
                // Wait before retry
                await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 1000 * retryCount));
            }
        }
        
        // Ensure device status exists for the returned ID
        if (!deviceStatusMap[newId!]) {
            deviceStatusMap[newId!] = {
                config: {
                    pomodoro: {},
                    trackpad: {},
                },
                deviceType: DeviceType.KEYBOARD,
                gpkRCVersion: 0,
                connected: true,
                initializing: true,
            };
        }
        
        activeTabPerDevice[newId!] = "mouse";
        
        if (hidDeviceInstances[newId!]) {
            let initializationComplete = false;
            
            hidDeviceInstances[newId!]!.on('error', (err: Error): void => {
                console.error(`Device error: ${newId}`, err);
                
                // Completely remove all traces of the device (treat as fresh connection next time)
                try {
                    if (hidDeviceInstances[newId!]) {
                        hidDeviceInstances[newId!]!.removeAllListeners();
                        hidDeviceInstances[newId!]!.close();
                    }
                } catch (closeError) {
                    console.error(`Error closing HID instance after error for ${newId}:`, closeError);
                }
                hidDeviceInstances[newId!] = null;
                
                // Completely remove device status
                if (deviceStatusMap[newId!]) {
                    delete deviceStatusMap[newId!];
                }
                
                // Clean up all related data
                if (activeTabPerDevice[newId!]) {
                    delete activeTabPerDevice[newId!];
                }
                
                if (isEditingPomodoroPerDevice[newId!]) {
                    delete isEditingPomodoroPerDevice[newId!];
                }
                
                // Clean up layer tracking
                cleanupDeviceLayerTracking(newId!);
                
                // Notify UI about device disconnection
                if ((global as { mainWindow?: ElectronWindow }).mainWindow) {
                    (global as { mainWindow?: ElectronWindow }).mainWindow!.webContents.send("deviceConnectionStateChanged", {
                        deviceId: newId!,
                        connected: false,
                        gpkRCVersion: deviceStatusMap[newId!]?.gpkRCVersion || 0,
                        deviceType: deviceStatusMap[newId!]?.deviceType || DeviceType.KEYBOARD,
                        config: deviceStatusMap[newId!]?.config || {}
                    });
                }
            });
            
            hidDeviceInstances[newId!]!.on('data', async (buffer: Buffer): Promise<void> => {
                try {
                    if (buffer[0] === commandId.gpkRCPrefix) {
                        const receivedCmdId = buffer[1];
                        const receivedActionId = buffer[2];
                        const actualData = buffer.slice(3);

                        deviceStatusMap[id]!.connected = true;
                        if (receivedCmdId === commandId.customSetValue) {
                            if(receivedActionId === actionId.setValueComplete) {
                                // Notify UI that data saving is complete
                                (global as { mainWindow?: ElectronWindow }).mainWindow!.webContents.send("configSaveComplete", {
                                    deviceId: id,
                                    success: true,
                                    timestamp: Date.now()
                                });
                            }
                        }
                        if (receivedCmdId === commandId.customGetValue) {
                            if (receivedActionId === actionId.deviceGetValue) {
                                deviceStatusMap[id]!.config = { 
                                    pomodoro: {},
                                    trackpad: {}
                                };
                                
                                deviceStatusMap[id]!.gpkRCVersion = actualData[0] || 0;
                                deviceStatusMap[id]!.init = actualData[1] || 0;
                                const deviceTypeStr = actualData.toString('utf8', 2).split('\0')[0] || '';
                                deviceStatusMap[id]!.deviceType = stringToDeviceType(deviceTypeStr);

                                if (settingsStore) {
                                    const oledSettings = settingsStore.get('oledSettings');
                                    if (oledSettings && oledSettings[id] !== undefined) {
                                        if(oledSettings[id].enabled) {
                                            // Note: writeTimeToOled function will be imported from oledDisplay.js
                                            // Use imported writeTimeToOled function
                                            // Convert HIDDevice to Device
                                            const gpkDevice: GPKDevice = {
                                                ...device,
                                                id,
                                                manufacturer: device.manufacturer || '',
                                                product: device.product || '',
                                                connected: true
                                            };
                                            void writeTimeToOled(gpkDevice); 
                                        }
                                        deviceStatusMap[id]!.config.oled_enabled = oledSettings[id].enabled ? 1 : 0;
                                    }
                                }

                                // Mark initialization as complete
                                deviceStatusMap[id]!.initializing = false;
                                initializationComplete = true;

                                (global as { mainWindow?: ElectronWindow }).mainWindow!.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id]!.connected,
                                    gpkRCVersion: deviceStatusMap[id]!.gpkRCVersion,
                                    deviceType: deviceStatusMap[id]!.deviceType,
                                    config: deviceStatusMap[id]!.config 
                                });
                            } else if (receivedActionId === actionId.trackpadGetValue) {
                                // Note: receiveTrackpadSpecificConfig function will be imported from trackpadConfig.js
                                // Use imported receiveTrackpadSpecificConfig function
                                deviceStatusMap[id]!.config.trackpad = receiveTrackpadSpecificConfig(Array.from(actualData));

                                (global as { mainWindow?: ElectronWindow }).mainWindow!.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id]!.connected,
                                    gpkRCVersion: deviceStatusMap[id]!.gpkRCVersion,
                                    deviceType: deviceStatusMap[id]!.deviceType,
                                    config: deviceStatusMap[id]!.config
                                });
                            } else if (receivedActionId === actionId.pomodoroGetValue) {
                                // Note: receivePomodoroConfig function will be imported from pomodoroConfig.js
                                // Use imported receivePomodoroConfig function
                                const receivedPomoConfig = receivePomodoroConfig(Array.from(actualData)); // Parses only pomodoro settings
                            
                                const oldPhase = deviceStatusMap[id]!.config.pomodoro.phase;
                                const newPhase = receivedPomoConfig.pomodoro.phase;
                                const oldTimerActive = deviceStatusMap[id]!.config?.pomodoro?.timer_active;
                                const newTimerActive = receivedPomoConfig.pomodoro.timer_active;
                                const notificationsEnabled = deviceStatusMap[id]!.config.pomodoro.notifications_enabled; // Preserve existing UI-side setting
                                
                                // Update the pomodoro part of the config
                                deviceStatusMap[id]!.config.pomodoro = {
                                    ...deviceStatusMap[id]!.config.pomodoro, // Preserve other pomodoro settings not in receivedPomoConfig
                                    ...receivedPomoConfig.pomodoro
                                };
                                
                                if (notificationsEnabled !== undefined) {
                                    deviceStatusMap[id]!.config.pomodoro.notifications_enabled = notificationsEnabled;
                                }
                                
                                const phaseChanged = oldPhase !== newPhase || oldTimerActive !== newTimerActive;
                                (global as { mainWindow?: ElectronWindow }).mainWindow!.webContents.send("deviceConnectionPomodoroPhaseChanged", {
                                    deviceId: id,
                                    pomodoroConfig: deviceStatusMap[id]!.config.pomodoro,
                                    phaseChanged: phaseChanged,
                                });
                            } else if (receivedActionId === actionId.pomodoroActiveGetValue) {
                                // Note: receivePomodoroActiveStatus function will be imported from pomodoroConfig.js
                                // Use imported receivePomodoroActiveStatus function
                                const pomodoroActiveUpdate = receivePomodoroActiveStatus(Array.from(actualData));
                                const oldPhase = deviceStatusMap[id]!.config.pomodoro.phase;
                                const oldTimerActive = deviceStatusMap[id]!.config.pomodoro.timer_active;
                                
                                const preservedPomodoroConfig = { ...deviceStatusMap[id]!.config.pomodoro };

                                preservedPomodoroConfig.timer_active = pomodoroActiveUpdate.timer_active;
                                preservedPomodoroConfig.phase = pomodoroActiveUpdate.phase;
                                preservedPomodoroConfig.minutes = pomodoroActiveUpdate.minutes;
                                preservedPomodoroConfig.seconds = pomodoroActiveUpdate.seconds;
                                preservedPomodoroConfig.current_work_Interval = pomodoroActiveUpdate.current_work_Interval;
                                preservedPomodoroConfig.current_pomodoro_cycle = pomodoroActiveUpdate.current_pomodoro_cycle;

                                deviceStatusMap[id]!.config.pomodoro = preservedPomodoroConfig;

                                const phaseChanged = oldPhase !== pomodoroActiveUpdate.phase || oldTimerActive !== pomodoroActiveUpdate.timer_active;

                                (global as { mainWindow?: ElectronWindow }).mainWindow!.webContents.send("deviceConnectionPomodoroPhaseChanged", {
                                    deviceId: id,
                                    pomodoroConfig: deviceStatusMap[id]!.config.pomodoro,
                                    phaseChanged: phaseChanged,
                                });
                            } else if (receivedActionId === actionId.ledGetValue) {
                                const receivedLedConfig = receiveLedConfig(Array.from(actualData));
                                deviceStatusMap[id]!.config.led = receivedLedConfig.led;

                                (global as { mainWindow?: ElectronWindow }).mainWindow!.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id]!.connected,
                                    gpkRCVersion: deviceStatusMap[id]!.gpkRCVersion,
                                    deviceType: deviceStatusMap[id]!.deviceType,
                                    config: deviceStatusMap[id]!.config
                                });
                            } else if (receivedActionId === actionId.ledLayerGetValue) {
                                const receivedLedLayerConfig = receiveLedLayerConfig(Array.from(actualData));
                                if (deviceStatusMap[id]!.config.led) {
                                    deviceStatusMap[id]!.config.led.layers = receivedLedLayerConfig.layers;
                                } else {
                                    // Create default LED config if it doesn't exist
                                    deviceStatusMap[id]!.config.led = {
                                        enabled: 255,
                                        mouse_speed_accel: { r: 0, g: 0, b: 0 },
                                        scroll_step_accel: { r: 255, g: 0, b: 0 },
                                        pomodoro: {
                                            work: { r: 0, g: 255, b: 255 },
                                            break: { r: 0, g: 0, b: 255 },
                                            long_break: { r: 0, g: 0, b: 0 }
                                        },
                                        layers: receivedLedLayerConfig.layers
                                    };
                                }

                                // Mark LED initialization as complete
                                deviceStatusMap[id]!.initializing = false;

                                (global as { mainWindow?: ElectronWindow }).mainWindow!.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id]!.connected,
                                    gpkRCVersion: deviceStatusMap[id]!.gpkRCVersion,
                                    deviceType: deviceStatusMap[id]!.deviceType,
                                    config: deviceStatusMap[id]!.config,
                                    initializing: deviceStatusMap[id]!.initializing
                                });
                            }
                        }
                    }
                } catch (dataProcessingError) {
                    console.error(`Error processing device data for ${newId}:`, dataProcessingError);
                    
                    const errorMessage = dataProcessingError instanceof Error ? dataProcessingError.message : String(dataProcessingError);
                    // If error suggests HID communication issues, trigger error event
                    if (errorMessage.includes("could not read from HID device") ||
                        errorMessage.includes("HID device disconnected")) {
                        console.error(`HID communication error detected for ${newId}, triggering cleanup`);
                        
                        // Trigger the error event which will handle cleanup
                        if (hidDeviceInstances[newId!]) {
                            hidDeviceInstances[newId!]!.emit('error', dataProcessingError);
                        }
                    }
                }
            });
            
            // Wait for device initialization to complete or timeout
            const timeout = 10000; // Increased timeout to 10 seconds
            const startTime = Date.now();
                        
            while (!initializationComplete && (Date.now() - startTime) < timeout) {
                await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 1000)); // Increased check interval
            }
            
            // Additional validation: ensure HID instance is still valid after timeout
            if (hidDeviceInstances[newId!]) {
                try {
                    // Test HID instance readiness
                    if (!(hidDeviceInstances[newId!] as HID.HID & { read?: () => void }).read) {
                        console.warn(`Device ${newId!} HID instance not fully ready after timeout`);
                    } else {
                        // HID instance is ready, continue normal operation
                    }
                } catch (hidTestError) {
                    console.warn(`Device ${newId!} HID instance validation failed:`, hidTestError);
                }
            }
        } else {
            console.warn(`Device ${newId!} started but no HID instance available`);
            // Ensure device status reflects the lack of HID instance
            if (deviceStatusMap[newId!]) {
                deviceStatusMap[newId!]!.initializing = false;
                deviceStatusMap[newId!]!.connected = false;
            }
        }
        
        return newId!;
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        // Note: "Device not found or path not available" errors during reconnection are normal
        if (!errorMessage.includes("Device not found or path not available")) {
            console.error(`Error starting device:`, errorMessage);
        }
        throw err;
    } finally {
        // Start device health monitoring if not already running
        if (!isDeviceHealthMonitoringActive()) {
            startDeviceHealthMonitoring();
        }
    }
}

const stop = async (device: GPKDevice): Promise<void> => {
    // Device already has encoded ID, use it directly
    const id = device.id;

    if (hidDeviceInstances[id]) {
        try {
            hidDeviceInstances[id]!.removeAllListeners();
            hidDeviceInstances[id]!.close();
        } catch (error) {
            console.error(`Error during device stop for ${id}:`, error);
        }
        hidDeviceInstances[id] = null;
    }
    
    // Completely remove device status (treat as new device next time)
    if (deviceStatusMap[id]) {
        delete deviceStatusMap[id];
    }
    
    // Clean up other related data
    if (activeTabPerDevice[id]) {
        delete activeTabPerDevice[id];
    }
    
    if (isEditingPomodoroPerDevice[id]) {
        delete isEditingPomodoroPerDevice[id];
    }
    
    // Clean up layer tracking
    // Use imported cleanupDeviceLayerTracking function
    cleanupDeviceLayerTracking(id);
}

const _close = (id: string): boolean => {
    if (!hidDeviceInstances[id]) {
        return false;
    }
    
    try {
         hidDeviceInstances[id]!.close()
    } catch (err) {
        console.error(`Error in _close for ${id}:`, err);
    }
    return true;
}

const close = async (): Promise<void> => {
    // Note: stopDeviceHealthMonitoring will be called from deviceHealth.js
    // Use imported stopDeviceHealthMonitoring function
    stopDeviceHealthMonitoring();
    
    if (!hidDeviceInstances) {
        return;
    }
    
    Object.keys(hidDeviceInstances).forEach((id): void => {
        _close(id);
    });
}

const writeCommand = async (device: GPKDevice, command: number[], retryCount: number = 0): Promise<CommandResult> => {
    // Device already has encoded ID, use it directly
    const id = device.id;
    const maxRetries = 2; // Allow 2 retries for communication failures
    
    try {
        // Check if device is connected and HID instance exists
        if (!hidDeviceInstances[id]) {
            console.error(`Device ${id} writeCommand failed: HID instance not found`);
            return { success: false, error: "Device not connected - HID instance not found" };
        }
        
        // Check if device status indicates it's connected
        if (deviceStatusMap[id] && deviceStatusMap[id]!.connected === false) {
            console.error(`Device ${id} writeCommand failed: marked as disconnected in status map`);
            return { success: false, error: "Device marked as disconnected" };
        }
        
        // Additional check: verify HID instance hasn't been closed
        if ((hidDeviceInstances[id] as HID.HID & { closed?: boolean }).closed) {
            console.error(`Device ${id} writeCommand failed: HID instance is closed`);
            
            // Mark device as disconnected
            if (deviceStatusMap[id]) {
                deviceStatusMap[id]!.connected = false;
            }
            
            return { success: false, error: "Device connection lost - HID instance closed" };
        }
        
        // Ensure all array elements are integers
        const validatedCommand = command.map((val): number => Math.floor(Number(val)) || 0);
        
        // Add padding if needed
        const unpadded = [0, commandId.gpkRCPrefix, ...validatedCommand];
        const padding = Array(PACKET_PADDING - (unpadded.length % PACKET_PADDING)).fill(0);
        const bytes = unpadded.concat(padding);
        
        await hidDeviceInstances[id]!.write(bytes);    

        return { success: true };
    } catch (err) {
        console.error(`Error writing command to device ${id} (attempt ${retryCount + 1}):`, err);
        
        // If write fails, mark device as potentially disconnected
        if (deviceStatusMap[id]) {
            deviceStatusMap[id]!.connected = false;
        }
        
        const errorMessage = err instanceof Error ? err.message : String(err);
        // Check if this is a recoverable error and we haven't exceeded retries
        const isRecoverableError = errorMessage.includes("cannot write to hid device") ||
                                   errorMessage.includes("could not read from HID device") ||
                                   errorMessage.includes("HID device disconnected") ||
                                   errorMessage.includes("Device or resource busy");
        
        if (isRecoverableError && retryCount < maxRetries) {            
            // Clean up current HID instance
            if (hidDeviceInstances[id]) {
                try {
                    hidDeviceInstances[id]!.removeAllListeners();
                    hidDeviceInstances[id]!.close();
                } catch (closeError) {
                    console.error(`Error closing invalid HID instance for ${id}:`, closeError);
                }
                hidDeviceInstances[id] = null;
            }
            
            // Wait before retry
            await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 500 * (retryCount + 1)));
            
            // Try to recreate HID instance
            try {
                // Convert HIDDevice to GPKDevice for addKbd
                const gpkDevice: GPKDevice = {
                    ...device,
                    id,
                    manufacturer: device.manufacturer || '',
                    product: device.product || ''
                };
                const newDeviceId = await addKbd(gpkDevice);
                
                if (hidDeviceInstances[newDeviceId]) {
                    // Restore connection status
                    if (deviceStatusMap[id]) {
                        deviceStatusMap[id]!.connected = true;
                    }
                    
                    // Wait a bit for device to stabilize
                    await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 200));
                    
                    // Retry the command
                    return writeCommand(device, command, retryCount + 1);
                } else {
                    throw new Error("Failed to recreate HID instance");
                }
            } catch (recreateError) {
                console.error(`Failed to recreate HID instance for ${id}:`, recreateError);
                return { success: false, error: `Write error after recovery attempt: ${errorMessage}` };
            }
        } else {
            // Clean up invalid HID instance for non-recoverable errors or after max retries
            if (hidDeviceInstances[id]) {
                try {
                    hidDeviceInstances[id]!.removeAllListeners();
                    hidDeviceInstances[id]!.close();
                } catch (closeError) {
                    console.error(`Error closing invalid HID instance for ${id}:`, closeError);
                }
                hidDeviceInstances[id] = null;
            }
        }
        
        return { success: false, error: `Write error: ${errorMessage}` };
    }
}

const getConnectKbd = (id: string): DeviceStatus | undefined => deviceStatusMap[id]

const updateAutoLayerSettings = (store: Store<StoreSchema>): boolean => {
    if (!store) return false;
    
    settingsStore = store;
    return true;
}

// Initialize dependency injection
export const initializeDependencies = (): void => {
    // Inject dependencies for device health monitoring
    injectDeviceHealthDependencies({
        deviceStatusMap: deviceStatusMap as Record<string, DeviceStatus>,
        hidDeviceInstances: hidDeviceInstances as Record<string, HIDDeviceInstance | null>,
        getKBD: getKBD as (device: { vendorId: number; productId: number } | { id: string }, retryCount?: number) => Promise<HIDDeviceInstance | null>,
        addKbd: addKbd as (device: { vendorId: number; productId: number } | { id: string }) => Promise<string>,
        mainWindow: mainWindow
    });

    // Inject dependencies for OLED display
    injectOledDependencies(writeCommand);

    // Inject dependencies for pomodoro config
    injectPomodoroDependencies(writeCommand);

    // Inject dependencies for trackpad config
    injectTrackpadDependencies(writeCommand);

    // Inject dependencies for LED config
    injectLedDependencies(writeCommand);

    // Inject dependencies for window monitoring
    injectWindowMonitoringDependencies({
        deviceStatusMap: deviceStatusMap as Record<string, DeviceStatus>,
        settingsStore: settingsStore!,
        writeCommand,
        mainWindow: mainWindow
    });
};

export { 
    deviceStatusMap, 
    hidDeviceInstances, 
    activeTabPerDevice, 
    isEditingPomodoroPerDevice,
    settingsStore,
    mainWindow,
    getKBD, 
    getKBDList, 
    setActiveTab, 
    getActiveTab, 
    setMainWindow, 
    addKbd, 
    start, 
    stop, 
    close, 
    writeCommand, 
    getConnectKbd,
    updateAutoLayerSettings
};

// Export types
export type {
    HIDDevice,
    DeviceWithId,
    PomodoroConfig,
    DeviceConfig,
    DeviceStatus,
    Command,
    WriteCommandResult,
    ElectronWindow
};