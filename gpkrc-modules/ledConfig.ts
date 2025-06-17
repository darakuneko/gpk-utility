import type { Device, CommandResult, WriteCommandFunction, LedConfig, LedLayerConfig } from '../src/types/device';

import { commandId, actionId } from './communication';

// Dependency injection
let writeCommandFunction: WriteCommandFunction | null = null;

export const injectLedDependencies = (writeCommand: WriteCommandFunction): void => {
    writeCommandFunction = writeCommand;
};

export function receiveLedConfig(buffer: number[]): {led: LedConfig} {
    const led: LedConfig = {
        enabled: buffer[0] || 0,
        mouse_speed_accel: {
            r: buffer[1] || 0,
            g: buffer[2] || 0,
            b: buffer[3] || 0
        },
        scroll_step_accel: {
            r: buffer[4] || 0,
            g: buffer[5] || 0,
            b: buffer[6] || 0
        },
        pomodoro: {
            work: {
                r: buffer[7] || 0,
                g: buffer[8] || 0,
                b: buffer[9] || 0
            },
            break: {
                r: buffer[10] || 0,
                g: buffer[11] || 0,
                b: buffer[12] || 0
            },
            long_break: {
                r: buffer[13] || 0,
                g: buffer[14] || 0,
                b: buffer[15] || 0
            }
        }
    };
    
    // Handle layer data (variable length)
    const layerDataStart = 16;
    const layerCount = buffer[layerDataStart] || 0;
    led.layers = [];
    
    for (let i = 0; i < layerCount; i++) {
        const layerBase = layerDataStart + 1 + (i * 4);
        led.layers.push({
            layer_id: buffer[layerBase] || 0,
            r: buffer[layerBase + 1] || 0,
            g: buffer[layerBase + 2] || 0,
            b: buffer[layerBase + 3] || 0
        });
    }
    
    return { led };
}

export function receiveLedLayerConfig(buffer: number[]): {layers: LedLayerConfig[]} {
    const layers: LedLayerConfig[] = [];
    const layerCount = buffer[0] || 0;
    
    for (let i = 0; i < layerCount; i++) {
        const layerBase = 1 + (i * 4);
        layers.push({
            layer_id: buffer[layerBase] || 0,
            r: buffer[layerBase + 1] || 0,
            g: buffer[layerBase + 2] || 0,
            b: buffer[layerBase + 3] || 0
        });
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
    
    // Basic LED settings
    ledDataBytes.push(ledConfig.enabled || 0);
    
    // Mouse speed accel RGB
    ledDataBytes.push(ledConfig.mouse_speed_accel?.r || 0);
    ledDataBytes.push(ledConfig.mouse_speed_accel?.g || 0);
    ledDataBytes.push(ledConfig.mouse_speed_accel?.b || 0);
    
    // Scroll step accel RGB
    ledDataBytes.push(ledConfig.scroll_step_accel?.r || 0);
    ledDataBytes.push(ledConfig.scroll_step_accel?.g || 0);
    ledDataBytes.push(ledConfig.scroll_step_accel?.b || 0);
    
    // Pomodoro RGB settings
    ledDataBytes.push(ledConfig.pomodoro?.work?.r || 0);
    ledDataBytes.push(ledConfig.pomodoro?.work?.g || 0);
    ledDataBytes.push(ledConfig.pomodoro?.work?.b || 0);
    
    ledDataBytes.push(ledConfig.pomodoro?.break?.r || 0);
    ledDataBytes.push(ledConfig.pomodoro?.break?.g || 0);
    ledDataBytes.push(ledConfig.pomodoro?.break?.b || 0);
    
    ledDataBytes.push(ledConfig.pomodoro?.long_break?.r || 0);
    ledDataBytes.push(ledConfig.pomodoro?.long_break?.g || 0);
    ledDataBytes.push(ledConfig.pomodoro?.long_break?.b || 0);
    
    // Layer data
    const layerCount = ledConfig.layers?.length || 0;
    ledDataBytes.push(layerCount);
    
    if (ledConfig.layers) {
        for (const layer of ledConfig.layers) {
            ledDataBytes.push(layer.layer_id);
            ledDataBytes.push(layer.r);
            ledDataBytes.push(layer.g);
            ledDataBytes.push(layer.b);
        }
    }
    
    return await saveLedConfigData(device, ledDataBytes);
};