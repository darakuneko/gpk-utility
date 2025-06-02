// IPC-related type definitions
import { Device } from './common';

// Define PomodoroConfig locally since it's not in common
export interface PomodoroConfig {
    timer_active?: number;
    phase?: number;
    work_time?: number;
    break_time?: number;
    long_break_time?: number;
    notifications_enabled?: number | boolean;
}

export interface PomodoroNotificationData {
    deviceName: string;
    deviceId: string;
    phase: number;
    minutes: number;
}

export interface ConfigSaveCompleteDetail {
    deviceId: string;
    success: boolean;
    timestamp: number;
    importOperation?: boolean;
}

export interface ImportResult {
    success: boolean;
    message?: string;
    error?: string;
    devicesUpdated?: number;
}

export interface ExportData {
    devices: Device[];
    appSettings: {
        traySettings: {
            minimizeToTray: boolean;
            backgroundStart: boolean;
        };
        locale: string;
    };
}

export interface NotificationData {
    id?: string;
    [key: string]: unknown;
}

export interface NotificationQueryPayload {
    deviceId: string;
    type: string;
    collection?: string;
    filters?: Array<{ field: string; op: string; value: unknown }>;
    orderBy?: string | { field: string; direction: string; };
    limit?: number;
}

export interface PomodoroPhaseData {
    deviceId: string;
    deviceName: string;
    phase: number;
    minutes: number;
}

export interface DeviceConnectionPomodoroData {
    deviceId: string;
    pomodoroConfig: PomodoroConfig;
    phaseChanged: boolean;
}

export interface IpcResponse {
    success: boolean;
    error?: string;
    data?: unknown;
}