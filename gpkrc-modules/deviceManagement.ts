import HID from 'node-hid'
import { DeviceType, stringToDeviceType } from './deviceTypes';
import { commandId, actionId, commandToBytes, encodeDeviceId, parseDeviceId, DEFAULT_USAGE, PACKET_PADDING } from './communication';
import { 
    startDeviceHealthMonitoring, 
    isDeviceHealthMonitoringActive,
    injectDeviceHealthDependencies
} from './deviceHealth';
import { injectOledDependencies, writeTimeToOled } from './oledDisplay';
import { injectPomodoroDependencies, receivePomodoroConfig, receivePomodoroActiveStatus } from './pomodoroConfig';
import { injectTrackpadDependencies, receiveTrackpadSpecificConfig } from './trackpadConfig';
import { injectWindowMonitoringDependencies, cleanupDeviceLayerTracking } from './windowMonitoring';
import { stopDeviceHealthMonitoring } from './deviceHealth';
import type { 
    HIDDevice, 
    DeviceWithId, 
    Device,
    DeviceConfig, 
    DeviceStatus,
    CommandResult,
    PomodoroConfig,
    WriteCommandFunction
} from '../src/types/device';

interface Command {
    id: number;
    data?: number[];
}

interface WriteCommandResult {
    success: boolean;
    message?: string;
}

interface ElectronWindow {
    webContents: {
        send: (channel: string, data: any) => void;
    };
}

// Global variables with proper types
let deviceStatusMap: Record<string, DeviceStatus | undefined> = {}
let hidDeviceInstances: Record<string, HID.HID | null> = {}
let activeTabPerDevice: Record<string, string> = {}
let isEditingPomodoroPerDevice: Record<string, boolean> = {}
let settingsStore: any = null
let mainWindow: ElectronWindow | null = null

const getKBD = async (device: HIDDevice, retryCount: number = 0): Promise<HIDDevice | null> => {
    const maxRetries = 3;
    
    const searchDevice = (): HIDDevice | undefined => HID.devices().find(d =>
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

    return foundDevice || null;
}

const getKBDList = (): DeviceWithId[] => HID.devices().filter(d =>
        d.serialNumber?.match(/^vial:/i) &&
        d.usage === DEFAULT_USAGE.usage &&
        d.usagePage === DEFAULT_USAGE.usagePage
    ).sort((a, b) => `${a.manufacturer}${a.product}` > `${b.manufacturer}${b.product}` ? 1 : -1)
    .map(device => {
        const id = encodeDeviceId(device)        
        if (deviceStatusMap[id]) {
            return {...device, id: id, deviceType: deviceStatusMap[id]!.deviceType, gpkRCVersion: deviceStatusMap[id]!.gpkRCVersion}
        } else {
            return {...device, id: id}
        }
    })

// Function to set the active tab
const setActiveTab = (device: HIDDevice, tabName: string): void => {
    const id = encodeDeviceId(device)
    activeTabPerDevice[id] = tabName
}

// Function to get the active tab
const getActiveTab = (device: HIDDevice): string | undefined => {
    const id = encodeDeviceId(device)
    return activeTabPerDevice[id]
}

const setMainWindow = (window: ElectronWindow): void => {
    mainWindow = window
    ;(global as any).mainWindow = window
}

const addKbd = async (device: HIDDevice): Promise<string> => { 
    const d = await getKBD(device);
    const id = encodeDeviceId(device);
    
    if (!d || !d.path) {
        console.error(`Device not found or path not available for device: ${id}`);
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
        setTimeout(() => {
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

const start = async (device: HIDDevice): Promise<string> => {
    if (!device) {
        throw new Error("Device information is required");
    }
    
    try {
        const id = encodeDeviceId(device);

        
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
                newId = await addKbd(device);
                // If addKbd succeeds and HID instance exists, break the retry loop
                if (hidDeviceInstances[newId]) {
                    break;
                }
                throw new Error(`HID instance not created despite successful addKbd call`);
            } catch (addError: any) {
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
            
            hidDeviceInstances[newId!]!.on('error', (err: Error) => {
                console.error(`Device error: ${newId}`, err);
                
                // Mark device as disconnected and clean up HID instance
                if (deviceStatusMap[newId!]) {
                    deviceStatusMap[newId!].connected = false;
                }
                
                // Clean up the problematic HID instance
                try {
                    if (hidDeviceInstances[newId!]) {
                        hidDeviceInstances[newId!]!.removeAllListeners();
                        hidDeviceInstances[newId!]!.close();
                    }
                } catch (closeError) {
                    console.error(`Error closing HID instance after error for ${newId}:`, closeError);
                }
                hidDeviceInstances[newId!] = null;
                
                // Notify UI about device disconnection
                if ((global as any).mainWindow) {
                    (global as any).mainWindow.webContents.send("deviceConnectionStateChanged", {
                        deviceId: newId,
                        connected: false,
                        gpkRCVersion: deviceStatusMap[newId!]?.gpkRCVersion || 0,
                        deviceType: deviceStatusMap[newId!]?.deviceType || DeviceType.KEYBOARD,
                        config: deviceStatusMap[newId!]?.config || {}
                    });
                }
            });
            
            hidDeviceInstances[newId!]!.on('data', async (buffer: Buffer) => {
                try {
                    if (buffer[0] === commandId.gpkRCPrefix) {
                        const receivedCmdId = buffer[1];
                        const receivedActionId = buffer[2];
                        const actualData = buffer.slice(3);

                        deviceStatusMap[id]!.connected = true;
                        if (receivedCmdId === commandId.customSetValue) {
                            if(receivedActionId === actionId.setValueComplete) {
                                // Notify UI that data saving is complete
                                (global as any).mainWindow.webContents.send("configSaveComplete", {
                                    deviceId: id,
                                    success: true,
                                    timestamp: Date.now()
                                });
                            }
                        }
                        if (receivedCmdId === commandId.customGetValue) {
                            if (receivedActionId === actionId.deviceGetValue) {
                                deviceStatusMap[id]!.config = { 
                                    init: undefined,
                                    pomodoro: {
                                        phase: undefined
                                    }, 
                                    trackpad: {}, 
                                    oled_enabled: undefined 
                                };
                                
                                deviceStatusMap[id]!.gpkRCVersion = actualData[0];
                                deviceStatusMap[id]!.init = actualData[1];
                                const deviceTypeStr = actualData.toString('utf8', 2).split('\0')[0];
                                deviceStatusMap[id]!.deviceType = stringToDeviceType(deviceTypeStr);

                                if (settingsStore) {
                                    const oledSettings = settingsStore.get('oledSettings');
                                    if (oledSettings && oledSettings[id] !== undefined) {
                                        if(oledSettings[id].enabled) {
                                            // Note: writeTimeToOled function will be imported from oledDisplay.js
                                            // Use imported writeTimeToOled function
                                            writeTimeToOled(device); 
                                        }
                                        deviceStatusMap[id]!.config.oled_enabled = oledSettings[id].enabled ? 1 : 0;
                                    }
                                }

                                // Mark initialization as complete
                                deviceStatusMap[id]!.initializing = false;
                                initializationComplete = true;


                                (global as any).mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id]!.connected,
                                    gpkRCVersion: deviceStatusMap[id]!.gpkRCVersion,
                                    deviceType: deviceStatusMap[id]!.deviceType,
                                    config: deviceStatusMap[id]!.config 
                                });
                            } else if (receivedActionId === actionId.trackpadGetValue) {
                                // Note: receiveTrackpadSpecificConfig function will be imported from trackpadConfig.js
                                // Use imported receiveTrackpadSpecificConfig function
                                deviceStatusMap[id]!.config.trackpad = receiveTrackpadSpecificConfig(actualData);

                                (global as any).mainWindow.webContents.send("deviceConnectionStateChanged", {
                                    deviceId: id,
                                    connected: deviceStatusMap[id]!.connected,
                                    gpkRCVersion: deviceStatusMap[id]!.gpkRCVersion,
                                    deviceType: deviceStatusMap[id]!.deviceType,
                                    config: deviceStatusMap[id]!.config
                                });
                            } else if (receivedActionId === actionId.pomodoroGetValue) {
                                // Note: receivePomodoroConfig function will be imported from pomodoroConfig.js
                                // Use imported receivePomodoroConfig function
                                const receivedPomoConfig = receivePomodoroConfig(actualData); // Parses only pomodoro settings
                            
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
                                (global as any).mainWindow.webContents.send("deviceConnectionPomodoroPhaseChanged", {
                                    deviceId: id,
                                    pomodoroConfig: deviceStatusMap[id]!.config.pomodoro,
                                    phaseChanged: phaseChanged,
                                });
                            } else if (receivedActionId === actionId.pomodoroActiveGetValue) {
                                // Note: receivePomodoroActiveStatus function will be imported from pomodoroConfig.js
                                // Use imported receivePomodoroActiveStatus function
                                const pomodoroActiveUpdate = receivePomodoroActiveStatus(actualData);
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

                                (global as any).mainWindow.webContents.send("deviceConnectionPomodoroPhaseChanged", {
                                    deviceId: id,
                                    pomodoroConfig: deviceStatusMap[id]!.config.pomodoro,
                                    phaseChanged: phaseChanged,
                                });
                            }
                        }
                    }
                } catch (dataProcessingError: any) {
                    console.error(`Error processing device data for ${newId}:`, dataProcessingError);
                    
                    // If error suggests HID communication issues, trigger error event
                    if (dataProcessingError.message.includes("could not read from HID device") ||
                        dataProcessingError.message.includes("HID device disconnected")) {
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
                await new Promise(resolve => setTimeout(resolve, 1000)); // Increased check interval
            }
            
            // Additional validation: ensure HID instance is still valid after timeout
            if (hidDeviceInstances[newId!]) {
                try {
                    // Test HID instance readiness
                    if (!(hidDeviceInstances[newId!] as any).read) {
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
            if (deviceStatusMap[newId!]) {
                deviceStatusMap[newId!].initializing = false;
                deviceStatusMap[newId!].connected = false;
            }
        }
        
        return newId!;
    } catch (err) {
        console.error(`Error starting device:`, err);
        throw err;
    } finally {
        // Start device health monitoring if not already running
        if (!isDeviceHealthMonitoringActive()) {
            startDeviceHealthMonitoring();
        }
    }
}

const stop = async (device: HIDDevice): Promise<void> => {
    const id = encodeDeviceId(device);

    if (hidDeviceInstances[id]) {
        try {
            hidDeviceInstances[id]!.removeAllListeners();
        } catch (error) {
            console.error(`Error during device stop for ${id}:`, error);
        }
        hidDeviceInstances[id] = null;
    }
    
    // Clean up device status and related data
    if (deviceStatusMap[id]) {
        deviceStatusMap[id]!.connected = false;
        deviceStatusMap[id] = undefined;
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
    
    Object.keys(hidDeviceInstances).forEach(id => {
        _close(id);
    });
}

const writeCommand = async (device: HIDDevice, command: number[], retryCount: number = 0): Promise<CommandResult> => {
    const id = encodeDeviceId(device);
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
        if ((hidDeviceInstances[id] as any).closed) {
            console.error(`Device ${id} writeCommand failed: HID instance is closed`);
            
            // Mark device as disconnected
            if (deviceStatusMap[id]) {
                deviceStatusMap[id]!.connected = false;
            }
            
            return { success: false, error: "Device connection lost - HID instance closed" };
        }
        
        // Ensure all array elements are integers
        const validatedCommand = command.map(val => Math.floor(Number(val)) || 0);
        
        // Add padding if needed
        const unpadded = [0, commandId.gpkRCPrefix, ...validatedCommand];
        const padding = Array(PACKET_PADDING - (unpadded.length % PACKET_PADDING)).fill(0);
        const bytes = unpadded.concat(padding);
        
        await hidDeviceInstances[id]!.write(bytes);    

        return { success: true };
    } catch (err: any) {
        console.error(`Error writing command to device ${id} (attempt ${retryCount + 1}):`, err);
        
        // If write fails, mark device as potentially disconnected
        if (deviceStatusMap[id]) {
            deviceStatusMap[id]!.connected = false;
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
                    hidDeviceInstances[id]!.removeAllListeners();
                    hidDeviceInstances[id]!.close();
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
                        deviceStatusMap[id]!.connected = true;
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
                return { success: false, error: `Write error after recovery attempt: ${err.message}` };
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
        
        return { success: false, error: `Write error: ${err.message}` };
    }
}

const getConnectKbd = (id: string): DeviceStatus | undefined => deviceStatusMap[id]

const updateAutoLayerSettings = (store: any): boolean => {
    if (!store) return false;
    
    settingsStore = store;
    return true;
}

// Initialize dependency injection
export const initializeDependencies = (): void => {
    // Inject dependencies for device health monitoring
    injectDeviceHealthDependencies({
        deviceStatusMap,
        hidDeviceInstances,
        getKBD,
        addKbd,
        mainWindow
    });

    // Inject dependencies for OLED display
    injectOledDependencies(writeCommand);

    // Inject dependencies for pomodoro config
    injectPomodoroDependencies(writeCommand);

    // Inject dependencies for trackpad config
    injectTrackpadDependencies(writeCommand);

    // Inject dependencies for window monitoring
    injectWindowMonitoringDependencies({
        deviceStatusMap,
        settingsStore,
        writeCommand,
        mainWindow
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