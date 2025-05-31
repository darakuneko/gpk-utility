import { commandId, actionId } from './communication.js';

function receivePomodoroConfig(buffer) {
    return {
        pomodoro: {
            work_time: buffer[0],
            break_time: buffer[1],
            long_break_time: buffer[2],
            work_interval: buffer[3],
            work_hf_pattern: buffer[4],
            break_hf_pattern: buffer[5],
            timer_active: (buffer[6] & 0b10000000) >> 7,
            notify_haptic_enable: (buffer[6] & 0b01000000) >> 6,
            continuous_mode: (buffer[6] & 0b00100000) >> 5,
            phase: buffer[6] & 0b00000011,
            pomodoro_cycle: buffer[7]
        }
    }
}

function receivePomodoroActiveStatus(buffer) {
    return {
        timer_active: (buffer[0] & 0b10000000) >> 7,
        phase: buffer[0] & 0b00000011,
        minutes: buffer[1],
        seconds: buffer[2],
        current_work_Interval: buffer[3],
        current_pomodoro_cycle: buffer[4]
    };
}

const savePomodoroConfigData = async (device, pomodoroDataBytes) => {
    // Note: writeCommand function will be imported from deviceManagement.js
    const { writeCommand } = await import('./deviceManagement.js');
    
    try {
        const result = await writeCommand(device, { id: commandId.customSetValue, data: [actionId.pomodoroSetValue, ...pomodoroDataBytes] });
        if (!result.success) {
            throw new Error(result.message || "Failed to save pomodoro config");
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Add 500ms delay
        return result;
    } catch (error) {
        console.error("Error saving pomodoro config data:", error);
        return { success: false, error: error.message };
    }
};

const getPomodoroConfig = async (device) => {
    // Note: writeCommand function will be imported from deviceManagement.js
    const { writeCommand } = await import('./deviceManagement.js');
    
    const result = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.pomodoroGetValue] });
    if (!result.success) {
        throw new Error(result.message || "Failed to get pomodoro config");
    }
    return result;
};

const getPomodoroActiveStatus = async (device) => {
    // Note: writeCommand function will be imported from deviceManagement.js
    const { writeCommand } = await import('./deviceManagement.js');
    
    const result = await writeCommand(device, { id: commandId.customGetValue, data: [actionId.pomodoroActiveGetValue] });
    if (!result.success) {
        throw new Error(result.message || "Failed to get pomodoro active status");
    }
    return result;
};

export { 
    receivePomodoroConfig, 
    receivePomodoroActiveStatus, 
    savePomodoroConfigData, 
    getPomodoroConfig, 
    getPomodoroActiveStatus 
};