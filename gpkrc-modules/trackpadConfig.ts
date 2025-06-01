import { commandId, actionId } from './communication';

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

interface TrackpadConfig {
    hf_waveform_number: number;
    can_hf_for_layer: number;
    can_drag: number;
    scroll_term: number;
    drag_term: number;
    can_trackpad_layer: number;
    can_reverse_scrolling_direction: number;
    drag_strength_mode: number;
    drag_strength: number;
    default_speed: number;
    scroll_step: number;
    can_short_scroll: number;
    tap_term: number;
    swipe_term: number;
    pinch_term: number;
    gesture_term: number;
    short_scroll_term: number;
    pinch_distance: number;
}

interface CommandResult {
    success: boolean;
    message?: string;
    error?: string;
}

export function joinScrollTerm(a: number, b: number): number {
    const lower6Bits = a & 0b00111111;
    const upper4Bits = (b & 0b11110000) >> 4;
    return (lower6Bits << 4) | upper4Bits;
}

export function joinDragTerm(a: number, b: number): number {
    const lower4Bits = a & 0b00001111;
    const upper6Bits = (b & 0b11111100) >> 2;
    return (lower4Bits << 6) | upper6Bits;
}

export function joinDefaultSpeed(a: number, b: number): number {
    const lower2Bits = a & 0b00000011;
    const upper4Bits = (b & 0b11110000) >> 4;
    return (lower2Bits << 4) | upper4Bits;
}

export function receiveTrackpadSpecificConfig(buffer: number[]): TrackpadConfig { // buffer here is actualData
    return {
        hf_waveform_number: buffer[0],
        can_hf_for_layer: (buffer[1] & 0b10000000) >> 7,
        can_drag: (buffer[1] & 0b01000000) >> 6,
        scroll_term: joinScrollTerm(buffer[1], buffer[2]),
        drag_term: joinDragTerm(buffer[2], buffer[3]),
        can_trackpad_layer: (buffer[3] & 0b00000010) >> 1,
        can_reverse_scrolling_direction: buffer[3] & 0b00000001,
        drag_strength_mode: (buffer[4] & 0b10000000) >> 7,
        drag_strength: (buffer[4] & 0b01111100) >> 2,
        default_speed: joinDefaultSpeed(buffer[4], buffer[5]),
        scroll_step: buffer[5] & 0b00001111,
        can_short_scroll: (buffer[6] & 0b10000000) >> 7,
        tap_term: (buffer[7] << 8) | buffer[8],
        swipe_term: (buffer[9] << 8) | buffer[10],
        pinch_term: (buffer[11] << 8) | buffer[12],
        gesture_term: (buffer[13] << 8) | buffer[14],
        short_scroll_term: (buffer[15] << 8) | buffer[16],
        pinch_distance: (buffer[17] << 8) | buffer[18]
    };
}

export const saveTrackpadConfig = async (device: Device, trackpadDataBytes: number[]): Promise<CommandResult> => {
    // Note: writeCommand function will be imported from deviceManagement.js
    const { writeCommand } = await import('./deviceManagement.js');
    
    try {
        const result = await writeCommand(device, { id: commandId.customSetValue, data: [actionId.trackpadSetValue, ...trackpadDataBytes] });
        if (!result.success) {
            throw new Error(result.message || "Failed to save trackpad config");
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Add 500ms delay
        return result;
    } catch (error) {
        console.error("Error saving trackpad config:", error);
        throw error;
    }
};

export const getTrackpadConfigData = async (device: Device): Promise<CommandResult> => {
    // Note: writeCommand function will be imported from deviceManagement.js
    const { writeCommand } = await import('./deviceManagement.js');
    
    const result = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.trackpadGetValue] });
    if (!result.success) {
        throw new Error(result.message || "Failed to get trackpad config");
    }
    return result;
};