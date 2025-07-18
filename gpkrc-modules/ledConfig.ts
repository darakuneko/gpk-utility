import type { Device, CommandResult, WriteCommandFunction, LedConfig, LedLayerConfig } from '../src/types/device';

import { commandId, actionId } from './communication';

// Dependency injection
let writeCommandFunction: WriteCommandFunction | null = null;

export const injectLedDependencies = (writeCommand: WriteCommandFunction): void => {
    writeCommandFunction = writeCommand;
};

export function receiveLedConfig(buffer: number[]): {led: LedConfig} {
    // Based on send_led_config firmware implementation:
    // data[0-2]: pomodoro work RGB
    // data[3-5]: pomodoro break RGB 
    // data[6-8]: pomodoro long_break RGB
    // data[9-11]: indicator speed RGB
    // data[12-14]: indicator step RGB
    // data[15-17]: indicator h_scroll RGB
    
    const led: LedConfig = {
        enabled: 1,
        pomodoro: {
            work: {
                r: buffer[0] || 0,
                g: buffer[1] || 0,
                b: buffer[2] || 0
            },
            break: {
                r: buffer[3] || 0,
                g: buffer[4] || 0,
                b: buffer[5] || 0
            },
            long_break: {
                r: buffer[6] || 0,
                g: buffer[7] || 0,
                b: buffer[8] || 0
            }
        },
        mouse_speed_accel: {
            r: buffer[9] || 0,
            g: buffer[10] || 0,
            b: buffer[11] || 0
        },
        scroll_step_accel: {
            r: buffer[12] || 0,
            g: buffer[13] || 0,
            b: buffer[14] || 0
        },
        horizontal_scroll: {
            r: buffer[15] || 0,
            g: buffer[16] || 0,
            b: buffer[17] || 0
        }
    };
    
    return { led };
}

export function receiveLedLayerConfig(buffer: number[]): {layers: LedLayerConfig[]} {
    // Based on send_led_layer_config firmware implementation:
    // data[0]: layer_count
    // data[1-n]: layer_colors (layer_count * 3 bytes each)
    
    const layers: LedLayerConfig[] = [];
    const layerCount = buffer[0] || 0;
    
    for (let i = 0; i < layerCount; i++) {
        const layerBase = 1 + (i * 3);
        const layer = {
            layer_id: i,
            r: buffer[layerBase] || 0,
            g: buffer[layerBase + 1] || 0,
            b: buffer[layerBase + 2] || 0
        };
        layers.push(layer);
    }
    
    return { layers };
}

export const saveLedConfigData = async (device: Device, ledDataBytes: number[]): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in ledConfig");
    }
    
    
    try {
        const result = await writeCommandFunction(device, [commandId.customSetValue, actionId.ledSetValue, ...ledDataBytes]);
        if (!result.success) {
            throw new Error(result.error || "Failed to save LED config");
        }
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error saving LED config:", errorMessage);
        return { success: false, error: errorMessage };
    }
};

export const saveLedLayerConfigData = async (device: Device, ledDataBytes: number[]): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in ledConfig");
    }
    
    
    try {
        const result = await writeCommandFunction(device, [commandId.customSetValue, actionId.ledLayerSetValue, ...ledDataBytes]);
        if (!result.success) {
            throw new Error(result.error || "Failed to save LED layer config");
        }
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error saving LED layer config:", errorMessage);
        return { success: false, error: errorMessage };
    }
};

export const getLedConfig = async (device: Device): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in ledConfig");
    }
    
    try {
        const result = await writeCommandFunction(device, [commandId.customGetValue, actionId.ledGetValue]);
        if (!result.success) {
            throw new Error(result.error || "Failed to get LED config");
        }
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error getting LED config:", errorMessage);
        return { success: false, error: errorMessage };
    }
};

export const getLedLayerConfig = async (device: Device): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in ledConfig");
    }
    
    try {
        const result = await writeCommandFunction(device, [commandId.customGetValue, actionId.ledLayerGetValue]);
        if (!result.success) {
            throw new Error(result.error || "Failed to get LED layer config");
        }
        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error getting LED layer config:", errorMessage);
        return { success: false, error: errorMessage };
    }
};

export const saveLedConfig = async (device: Device): Promise<CommandResult> => {
    if (!device.config?.led) {
        return { success: false, error: "No LED config found on device" };
    }
    
    const ledConfig = device.config.led;
    const ledDataBytes: number[] = [];
    
    // Based on receive_led_config firmware implementation:
    // data[0-2]: pomodoro work RGB
    // data[3-5]: pomodoro break RGB  
    // data[6-8]: pomodoro long_break RGB
    // data[9-11]: indicator speed RGB
    // data[12-14]: indicator step RGB
    // data[15-17]: indicator h_scroll RGB
    
    // Pomodoro work RGB
    ledDataBytes.push(ledConfig.pomodoro?.work?.r || 0);
    ledDataBytes.push(ledConfig.pomodoro?.work?.g || 0);
    ledDataBytes.push(ledConfig.pomodoro?.work?.b || 0);
    
    // Pomodoro break RGB
    ledDataBytes.push(ledConfig.pomodoro?.break?.r || 0);
    ledDataBytes.push(ledConfig.pomodoro?.break?.g || 0);
    ledDataBytes.push(ledConfig.pomodoro?.break?.b || 0);
    
    // Pomodoro long_break RGB
    ledDataBytes.push(ledConfig.pomodoro?.long_break?.r || 0);
    ledDataBytes.push(ledConfig.pomodoro?.long_break?.g || 0);
    ledDataBytes.push(ledConfig.pomodoro?.long_break?.b || 0);
    
    // Indicator speed RGB
    ledDataBytes.push(ledConfig.mouse_speed_accel?.r || 0);
    ledDataBytes.push(ledConfig.mouse_speed_accel?.g || 0);
    ledDataBytes.push(ledConfig.mouse_speed_accel?.b || 0);
    
    // Indicator step RGB
    ledDataBytes.push(ledConfig.scroll_step_accel?.r || 0);
    ledDataBytes.push(ledConfig.scroll_step_accel?.g || 0);
    ledDataBytes.push(ledConfig.scroll_step_accel?.b || 0);
    
    // Indicator h_scroll RGB
    ledDataBytes.push(ledConfig.horizontal_scroll?.r || 0);
    ledDataBytes.push(ledConfig.horizontal_scroll?.g || 0);
    ledDataBytes.push(ledConfig.horizontal_scroll?.b || 0);
    
    return await saveLedConfigData(device, ledDataBytes);
};

export const saveLedLayerConfig = async (device: Device): Promise<CommandResult> => {
    if (!device.config?.led) {
        return { success: false, error: "No LED config found on device" };
    }
    
    const ledConfig = device.config.led;
    const ledDataBytes: number[] = [];
    
    // Based on receive_led_layer_config firmware implementation:
    // data[0]: layer_count
    // data[1-n]: layer_colors (layer_count * 3 bytes each)
    
    const layerCount = ledConfig.layers?.length || 0;
    ledDataBytes.push(layerCount);
    
    // Pack layer colors - send actual layer count
    for (let i = 0; i < layerCount; i++) {
        if (ledConfig.layers && i < ledConfig.layers.length) {
            const layer = ledConfig.layers[i];
            ledDataBytes.push(layer?.r || 0);
            ledDataBytes.push(layer?.g || 0);
            ledDataBytes.push(layer?.b || 0);
        }
    }
    
    return await saveLedLayerConfigData(device, ledDataBytes);
};