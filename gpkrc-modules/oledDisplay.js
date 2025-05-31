import dayjs from 'dayjs';
import { commandId, actionId, dataToBytes, encodeDeviceId } from './communication.js';

// Store last formatted date for each device
const lastFormattedDateMap = new Map();

// OLED functions
const writeTimeToOled = async (device, forceWrite = false) => {
    // Note: writeCommand function will be imported from deviceManagement.js
    const { writeCommand } = await import('./deviceManagement.js');
    
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

export { writeTimeToOled, lastFormattedDateMap };