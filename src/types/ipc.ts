// IPC-related type definitions

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
    devices: any[];
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
    [key: string]: any;
}

export interface NotificationQueryPayload {
    deviceId: string;
    type: string;
}

export interface PomodoroPhaseData {
    deviceId: string;
    phase: number;
    minutes: number;
}

export interface DeviceConnectionPomodoroData {
    deviceId: string;
    pomodoroConfig: any;
    phaseChanged: boolean;
}

export interface IpcResponse {
    success: boolean;
    error?: string;
    data?: any;
}