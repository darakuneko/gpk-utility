// Command result specific types

export interface CommandResponseData {
    deviceId?: string;
    timestamp?: number;
    configType?: 'trackpad' | 'pomodoro' | 'oled' | 'layer';
    bytesWritten?: number;
    operationId?: string;
}

export interface DeviceConfigResponse extends CommandResponseData {
    config?: {
        init?: number;
        oled_enabled?: number;
        pomodoro?: {
            timer_active?: number;
            phase?: number;
            work_time?: number;
            break_time?: number;
        };
        trackpad?: Record<string, number | boolean>;
    };
}

export interface FileOperationResponse extends CommandResponseData {
    filePath?: string;
    fileSize?: number;
    operation?: 'export' | 'import';
}

export interface NotificationResponse extends CommandResponseData {
    notificationId?: string;
    delivered?: boolean;
    shown?: boolean;
}

// Union type for all possible command response data
export type CommandData = 
    | CommandResponseData
    | DeviceConfigResponse 
    | FileOperationResponse 
    | NotificationResponse
    | Record<string, string | number | boolean>;