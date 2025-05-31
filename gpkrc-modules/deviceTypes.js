// Device type enum definition
const DeviceType = {
    KEYBOARD: "keyboard",
    KEYBOARD_OLED: "keyboard_oled",
    KEYBOARD_TP: "keyboard_tp",
    MACROPAD: "macropad",
    MACROPAD_TP: "macropad_tp",
    MACROPAD_TP_BTNS: "macropad_tp_btns", 
    UNKNOWN: "unknown"
}

const getDeviceType = () => DeviceType

// Convert string to DeviceType enum for incoming data
const stringToDeviceType = (typeStr) => {
    const normalizedStr = typeStr.toLowerCase();
    switch (normalizedStr) {
        case "keyboard":
            return DeviceType.KEYBOARD;
        case "keyboard_oled":
            return DeviceType.KEYBOARD_OLED;
        case "keyboard_tp":
            return DeviceType.KEYBOARD_TP;
        case "macropad":
            return DeviceType.MACROPAD;
        case "macropad_tp":
            return DeviceType.MACROPAD_TP;
        case "macropad_tp_btns":
            return DeviceType.MACROPAD_TP_BTNS;
            default:
            return DeviceType.UNKNOWN; // Default to unknown for unknown values
    }
}

export { DeviceType, getDeviceType, stringToDeviceType };