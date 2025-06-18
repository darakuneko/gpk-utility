import type { Device, CommandResult, WriteCommandFunction, TrackpadConfig } from '../src/types/device';

import { commandId, actionId } from './communication';

// Dependency injection
let writeCommandFunction: WriteCommandFunction | null = null;

export const injectTrackpadDependencies = (writeCommand: WriteCommandFunction): void => {
    writeCommandFunction = writeCommand;
};

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
        hf_waveform_number: buffer[0] || 0,
        can_hf_for_layer: ((buffer[1] || 0) & 0b10000000) >> 7,
        can_drag: ((buffer[1] || 0) & 0b01000000) >> 6,
        scroll_term: joinScrollTerm(buffer[1] || 0, buffer[2] || 0),
        drag_term: joinDragTerm(buffer[2] || 0, buffer[3] || 0),
        can_trackpad_layer: ((buffer[3] || 0) & 0b00000010) >> 1,
        can_reverse_scrolling_direction: (buffer[3] || 0) & 0b00000001,
        drag_strength_mode: ((buffer[4] || 0) & 0b10000000) >> 7,
        drag_strength: ((buffer[4] || 0) & 0b01111100) >> 2,
        default_speed: joinDefaultSpeed(buffer[4] || 0, buffer[5] || 0),
        scroll_step: (buffer[5] || 0) & 0b00001111,
        can_short_scroll: ((buffer[6] || 0) & 0b10000000) >> 7,
        tap_term: ((buffer[7] || 0) << 8) | (buffer[8] || 0),
        swipe_term: ((buffer[9] || 0) << 8) | (buffer[10] || 0),
        pinch_term: ((buffer[11] || 0) << 8) | (buffer[12] || 0),
        gesture_term: ((buffer[13] || 0) << 8) | (buffer[14] || 0),
        short_scroll_term: ((buffer[15] || 0) << 8) | (buffer[16] || 0),
        pinch_distance: ((buffer[17] || 0) << 8) | (buffer[18] || 0)
    };
}

export const saveTrackpadConfig = async (device: Device, trackpadDataBytes: number[]): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in trackpadConfig");
    }
    
    
    try {
        const result = await writeCommandFunction(device, [commandId.customSetValue, actionId.trackpadSetValue, ...trackpadDataBytes]);
        if (!result.success) {
            throw new Error(result.error || "Failed to save trackpad config");
        }
        await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 500)); // Add 500ms delay
        return result;
    } catch (error) {
        console.error("Error saving trackpad config:", error);
        throw error;
    }
};

export const getTrackpadConfigData = async (device: Device): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in trackpadConfig");
    }
    
    const result = await writeCommandFunction(device, [commandId.customGetValue, actionId.trackpadGetValue]);
    if (!result.success) {
        throw new Error(result.error || "Failed to get trackpad config");
    }
    return result;
};