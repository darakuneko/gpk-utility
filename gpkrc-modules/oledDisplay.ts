import dayjs from 'dayjs';

import type { Device, CommandResult, WriteCommandFunction } from '../src/types/device';

import { commandId, actionId, dataToBytes } from './communication';

// Store last formatted date for each device
export const lastFormattedDateMap = new Map<string, string>();

// Dependency injection
let writeCommandFunction: WriteCommandFunction | null = null;

export const injectOledDependencies = (writeCommand: WriteCommandFunction): void => {
    writeCommandFunction = writeCommand;
};

// OLED functions
export const writeTimeToOled = async (device: Device, forceWrite: boolean = false): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        console.warn('WriteCommand function not injected in oledDisplay');
        return { success: false, error: 'WriteCommand function not available' };
    }
    
    try {
        // Format date using dayjs
        const formattedDate = dayjs().format('YYYY/MM/DD ddd HH:mm ');
        // Device object already has encoded ID, no need to re-encode
        const deviceId = device.id;
        
        if (forceWrite || lastFormattedDateMap.get(deviceId) !== formattedDate) {
            lastFormattedDateMap.set(deviceId, formattedDate);
            const dataBytes = dataToBytes(formattedDate);
            const result = await writeCommandFunction(device, [commandId.gpkRCOperation, actionId.oledWrite, ...dataBytes]);
            
            if (!result.success) {
                console.error("Failed to write time to OLED:", result.error);
                return { success: false, error: result.error || 'Unknown error' };
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