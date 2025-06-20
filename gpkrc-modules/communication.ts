// Command ID definitions
export const commandId = {
    gpkRCPrefix: 0xFA,
    customSetValue: 0x01,  // Corresponds to C side: id_gpk_rc_set_value (for setting values)
    customGetValue: 0x02,  // Corresponds to C side: id_gpk_rc_get_value (for getting values)
    gpkRCOperation: 0x03,  // Corresponds to C side: id_gpk_rc_operation (for general operations like layer move, oled write)
} as const;

// Action IDs
export const actionId = {
    // Actions for customSetValue (commandId: 0x02)
    setValueComplete: 0x01,
    trackpadSetValue: 0x02,
    pomodoroSetValue: 0x03,
    ledSetValue: 0x04,
    ledLayerSetValue: 0x05,

    // Actions for customGetValue (commandId: 0x03)
    deviceGetValue: 0x01,
    trackpadGetValue: 0x02,
    pomodoroGetValue: 0x03,
    pomodoroActiveGetValue: 0x04,
    ledGetValue: 0x05,
    ledLayerGetValue: 0x06,

    // Actions for gpkRCOperation (commandId: 0x04)
    layerMove: 0x01,
    oledWrite: 0x02,    
} as const;

export const PACKET_PADDING = 64;
export const DEVICE_ID_SEPARATOR = '::';

// Command interface
export interface Command {
    id: number;
    data?: string | number[] | undefined;
}

export const DEFAULT_USAGE = {
    usage: 0x61,
    usagePage: 0xFF60
} as const;

// Types
import type { HIDDevice } from '../src/types/device';
import type { EncodedDeviceId } from '../src/types/device-id';
import { createEncodedDeviceId } from '../src/types/device-id';


interface ParsedDevice {
    manufacturer: string;
    product: string;
    vendorId: number;
    productId: number;
    id: string;
    path?: string;
}

// Type guard for devices with required encoding properties
export const hasRequiredDeviceProperties = (device: unknown): device is HIDDevice & { manufacturer: string; product: string } => {
    return Boolean(device && 
           typeof device === 'object' &&
           'manufacturer' in device &&
           'product' in device &&
           'vendorId' in device &&
           'productId' in device &&
           typeof device.manufacturer === 'string' && 
           typeof device.product === 'string' && 
           typeof device.vendorId === 'number' && 
           typeof device.productId === 'number' &&
           // Ensure it's not already a Device with encoded ID
           !('id' in device));
};

export const dataToBytes = (data: string | number[] | undefined): number[] => {
    if (typeof data === 'string') {
        return [...data].map((c): number => c.charCodeAt(0)).concat(0);
    } else if (Array.isArray(data)) {
        // Convert undefined values to 0
        return data.map((item): number => item === undefined ? 0 : item);
    }
    return [];
};

export const commandToBytes = ({ id, data }: Command): number[] => {
    const bytes = data ? dataToBytes(data) : dataToBytes(undefined);
    const unpadded = [
        0, 
        commandId.gpkRCPrefix, 
        id,
        ...bytes
    ];
    const padding = Array(PACKET_PADDING - (unpadded.length % PACKET_PADDING)).fill(0);
    return unpadded.concat(padding);
};

export const encodeDeviceId = (device: HIDDevice | null): EncodedDeviceId => {
    if (!device) {
        console.error("encodeDeviceId: device is null or undefined");
        return createEncodedDeviceId("unknown::device::0::0");
    }
    
    // Check if device already has an encoded ID (common mistake)
    if ('id' in device && typeof device.id === 'string') {
        console.error("encodeDeviceId: Device already has an encoded ID. Use device.id directly instead.", device);
        // Try to return the existing ID if it's valid
        try {
            return createEncodedDeviceId(device.id);
        } catch {
            return createEncodedDeviceId("unknown::device::0::0");
        }
    }
    
    if (!hasRequiredDeviceProperties(device)) {
        console.error("encodeDeviceId: Device missing required properties (manufacturer, product, vendorId, productId)", device);
        return createEncodedDeviceId("unknown::device::0::0");
    }
    
    const idString = `${device.manufacturer}${DEVICE_ID_SEPARATOR}${device.product}${DEVICE_ID_SEPARATOR}${device.vendorId}${DEVICE_ID_SEPARATOR}${device.productId}`;
    return createEncodedDeviceId(idString);
};

export const parseDeviceId = (id: string): ParsedDevice | null => {
    const deviceKeys = id.split(DEVICE_ID_SEPARATOR);
    if (deviceKeys.length >= 4) {
        return {
            manufacturer: deviceKeys[0] || '',
            product: deviceKeys[1] || '',
            vendorId: parseInt(deviceKeys[2] || '0', 10),
            productId: parseInt(deviceKeys[3] || '0', 10),
            id
        };
    }
    return null;
};