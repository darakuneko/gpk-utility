import HID from 'node-hid'
import dayjs from 'dayjs';

// Import all modules
import { DeviceType, getDeviceType, stringToDeviceType } from './gpkrc-modules/deviceTypes.js';
import { 
    commandId, 
    actionId, 
    PACKET_PADDING, 
    DEVICE_ID_SEPARATOR, 
    DEFAULT_USAGE,
    dataToBytes, 
    commandToBytes, 
    encodeDeviceId, 
    parseDeviceId 
} from './gpkrc-modules/communication.js';
import { startDeviceHealthMonitoring, stopDeviceHealthMonitoring, checkDeviceHealth, isDeviceHealthMonitoringActive } from './gpkrc-modules/deviceHealth.js';
import { 
    deviceStatusMap, 
    hidDeviceInstances, 
    activeTabPerDevice, 
    isEditingPomodoroPerDevice,
    settingsStore,
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
} from './gpkrc-modules/deviceManagement.js';
import { 
    joinScrollTerm, 
    joinDragTerm, 
    joinDefaultSpeed, 
    receiveTrackpadSpecificConfig, 
    saveTrackpadConfig, 
    getTrackpadConfigData 
} from './gpkrc-modules/trackpadConfig.js';
import { 
    receivePomodoroConfig, 
    receivePomodoroActiveStatus, 
    savePomodoroConfigData, 
    getPomodoroConfig, 
    getPomodoroActiveStatus 
} from './gpkrc-modules/pomodoroConfig.js';
import { writeTimeToOled, lastFormattedDateMap } from './gpkrc-modules/oledDisplay.js';
import { 
    activeWindows, 
    currentLayers, 
    startWindowMonitoring, 
    checkAndSwitchLayer, 
    getActiveWindows, 
    getSelectedAppSettings, 
    addNewAppToAutoLayerSettings,
    cleanupDeviceLayerTracking
} from './gpkrc-modules/windowMonitoring.js';

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

// Function to get GPK RC info/version (now uses customGetValue with deviceGetValue action)
const getDeviceInitConfig = async (device) => {
    const result = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.deviceGetValue] });
    if (!result.success) {
        throw new Error(result.message || "Failed to get device init config");
    }
    return result;
};

// Module exports - re-export everything from modules
export { getConnectKbd }
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

// Export additional functions and variables that were in the original file
export { deviceStatusMap, hidDeviceInstances, activeTabPerDevice, isEditingPomodoroPerDevice, settingsStore }
export { activeWindows, currentLayers }
export { 
    commandId, 
    actionId, 
    PACKET_PADDING, 
    DEVICE_ID_SEPARATOR, 
    DEFAULT_USAGE,
    dataToBytes, 
    commandToBytes
}
export { DeviceType, stringToDeviceType }
export { 
    joinScrollTerm, 
    joinDragTerm, 
    joinDefaultSpeed, 
    receiveTrackpadSpecificConfig
}
export { 
    receivePomodoroConfig, 
    receivePomodoroActiveStatus
}
export { writeCommand, addKbd }
export { startDeviceHealthMonitoring, stopDeviceHealthMonitoring, checkDeviceHealth, isDeviceHealthMonitoringActive }
export { checkAndSwitchLayer, cleanupDeviceLayerTracking }
export { lastFormattedDateMap }