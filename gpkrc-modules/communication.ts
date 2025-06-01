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

    // Actions for customGetValue (commandId: 0x03)
    deviceGetValue: 0x01,
    trackpadGetValue: 0x02,
    pomodoroGetValue: 0x03,
    pomodoroActiveGetValue: 0x04,

    // Actions for gpkRCOperation (commandId: 0x04)
    layerMove: 0x01,
    oledWrite: 0x02,    
} as const;

export const PACKET_PADDING = 64;
export const DEVICE_ID_SEPARATOR = '::';

export const DEFAULT_USAGE = {
    usage: 0x61,
    usagePage: 0xFF60
} as const;

// Types
interface Device {
    manufacturer: string;
    product: string;
    vendorId: number;
    productId: number;
    path?: string;
}

interface Command {
    id: number;
    data?: any;
}

interface ParsedDevice extends Device {
    id: string;
}

export const dataToBytes = (data: string | number[] | undefined): number[] => {
    if (typeof data === 'string') {
        return [...data].map(c => c.charCodeAt(0)).concat(0);
    } else if (Array.isArray(data)) {
        // Convert undefined values to 0
        return data.map(item => item === undefined ? 0 : item);
    }
    return [];
};

export const commandToBytes = ({ id, data }: Command): number[] => {
    const bytes = data ? dataToBytes(data) : [];
    const unpadded = [
        0, 
        commandId.gpkRCPrefix, 
        id,
        ...bytes
    ];
    const padding = Array(PACKET_PADDING - (unpadded.length % PACKET_PADDING)).fill(0);
    return unpadded.concat(padding);
};

export const encodeDeviceId = (device: Device | null): string => {
    if (!device || !device.manufacturer || !device.product || !device.vendorId || !device.productId) {
        console.error("Invalid device object for ID encoding:", device);
        return "unknown-device";
    }
    return `${device.manufacturer}${DEVICE_ID_SEPARATOR}${device.product}${DEVICE_ID_SEPARATOR}${device.vendorId}${DEVICE_ID_SEPARATOR}${device.productId}`;
};

export const parseDeviceId = (id: string): ParsedDevice | null => {
    const deviceKeys = id.split(DEVICE_ID_SEPARATOR);
    if (deviceKeys.length >= 4) {
        return {
            manufacturer: deviceKeys[0],
            product: deviceKeys[1],
            vendorId: parseInt(deviceKeys[2], 10),
            productId: parseInt(deviceKeys[3], 10),
            id
        };
    }
    return null;
};