import dayjs from 'dayjs';
import { commandId, actionId, dataToBytes, encodeDeviceId } from './communication';

// Types
interface Device {
    path: string;
    vendorId: number;
    productId: number;
    manufacturer?: string;
    product?: string;
    serialNumber?: string;
    usage?: number;
    usagePage?: number;
}

interface CommandResult {
    success: boolean;
    message?: string;
    error?: string;
    skipped?: boolean;
}

// Store last formatted date for each device
export const lastFormattedDateMap = new Map<string, string>();

// OLED functions
export const writeTimeToOled = async (device: Device, forceWrite: boolean = false): Promise<CommandResult> => {
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
        return { success: false, error: (error as Error).message };
    }
};