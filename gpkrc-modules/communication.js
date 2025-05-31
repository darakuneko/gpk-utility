// Command ID definitions
const commandId = {
    gpkRCPrefix: 0xFA,
    customSetValue: 0x01,  // Corresponds to C side: id_gpk_rc_set_value (for setting values)
    customGetValue: 0x02,  // Corresponds to C side: id_gpk_rc_get_value (for getting values)
    gpkRCOperation: 0x03,  // Corresponds to C side: id_gpk_rc_operation (for general operations like layer move, oled write)
};

// Action IDs
const actionId = {
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
};

const PACKET_PADDING = 64
const DEVICE_ID_SEPARATOR = '::'

const DEFAULT_USAGE = {
    usage: 0x61,
    usagePage: 0xFF60
}

const dataToBytes = (data) => {
    if (typeof data === 'string') {
        return [...data].map(c => c.charCodeAt(0)).concat(0);
    } else if (Array.isArray(data)) {
        // Convert undefined values to 0
        return data.map(item => item === undefined ? 0 : item);
    }
    return data;
}

const commandToBytes = ({ id, data }) => {
    const bytes = data ? dataToBytes(data) : []
    const unpadded = [
        0, 
        commandId.gpkRCPrefix, 
        id,
        ...bytes
    ]
    const padding = Array(PACKET_PADDING - (unpadded.length % PACKET_PADDING)).fill(0)
    return unpadded.concat(padding)
}

const encodeDeviceId = (device) => {
    if (!device || !device.manufacturer || !device.product || !device.vendorId || !device.productId) {
        console.error("Invalid device object for ID encoding:", device);
        return "unknown-device";
    }
    return `${device.manufacturer}${DEVICE_ID_SEPARATOR}${device.product}${DEVICE_ID_SEPARATOR}${device.vendorId}${DEVICE_ID_SEPARATOR}${device.productId}`;
}

const parseDeviceId = (id) => {
    const deviceKeys = id.split(DEVICE_ID_SEPARATOR)
    if (deviceKeys.length >= 4) {
        return {
            manufacturer: deviceKeys[0],
            product: deviceKeys[1],
            vendorId: parseInt(deviceKeys[2], 10),
            productId: parseInt(deviceKeys[3], 10),
            id
        }
    }
    return null
}

export { 
    commandId, 
    actionId, 
    PACKET_PADDING, 
    DEVICE_ID_SEPARATOR, 
    DEFAULT_USAGE,
    dataToBytes, 
    commandToBytes, 
    encodeDeviceId, 
    parseDeviceId 
};