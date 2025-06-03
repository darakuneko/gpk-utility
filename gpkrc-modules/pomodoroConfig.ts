import type { Device, CommandResult, WriteCommandFunction, PomodoroConfig, PomodoroActiveStatus } from '../src/types/device';

import { commandId, actionId } from './communication';

// Dependency injection
let writeCommandFunction: WriteCommandFunction | null = null;

export const injectPomodoroDependencies = (writeCommand: WriteCommandFunction): void => {
    writeCommandFunction = writeCommand;
};

export function receivePomodoroConfig(buffer: number[]): {pomodoro: PomodoroConfig} {
    return {
        pomodoro: {
            work_time: buffer[0] || 0,
            break_time: buffer[1] || 0,
            long_break_time: buffer[2] || 0,
            work_interval: buffer[3] || 0,
            work_hf_pattern: buffer[4] || 0,
            break_hf_pattern: buffer[5] || 0,
            timer_active: ((buffer[6] || 0) & 0b10000000) >> 7,
            notify_haptic_enable: ((buffer[6] || 0) & 0b01000000) >> 6,
            continuous_mode: ((buffer[6] || 0) & 0b00100000) >> 5,
            phase: (buffer[6] || 0) & 0b00000011,
            pomodoro_cycle: buffer[7] || 0
        }
    };
}

export function receivePomodoroActiveStatus(buffer: number[]): PomodoroActiveStatus {
    return {
        timer_active: ((buffer[0] || 0) & 0b10000000) >> 7,
        phase: (buffer[0] || 0) & 0b00000011,
        minutes: buffer[1] || 0,
        seconds: buffer[2] || 0,
        current_work_Interval: buffer[3] || 0,
        current_pomodoro_cycle: buffer[4] || 0
    };
}

export const savePomodoroConfigData = async (device: Device, pomodoroDataBytes: number[]): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in pomodoroConfig");
    }
    
    try {
        const result = await writeCommandFunction(device, [commandId.customSetValue, actionId.pomodoroSetValue, ...pomodoroDataBytes]);
        if (!result.success) {
            throw new Error(result.error || "Failed to save pomodoro config");
        }
        await new Promise<void>((resolve): ReturnType<typeof setTimeout> => setTimeout(resolve, 500)); // Add 500ms delay
        return result;
    } catch (error) {
        console.error("Error saving pomodoro config data:", error);
        return { success: false, error: (error as Error).message };
    }
};

export const getPomodoroConfig = async (device: Device): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in pomodoroConfig");
    }
    
    const result = await writeCommandFunction(device, [commandId.customGetValue, actionId.pomodoroGetValue]);
    if (!result.success) {
        throw new Error(result.error || "Failed to get pomodoro config");
    }
    return result;
};

export const getPomodoroActiveStatus = async (device: Device): Promise<CommandResult> => {
    if (!writeCommandFunction) {
        throw new Error("WriteCommand function not injected in pomodoroConfig");
    }
    
    const result = await writeCommandFunction(device, [commandId.customGetValue, actionId.pomodoroActiveGetValue]);
    if (!result.success) {
        throw new Error(result.error || "Failed to get pomodoro active status");
    }
    return result;
};