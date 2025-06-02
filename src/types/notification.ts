// Notification specific types

export interface NotificationData {
    id: string;
    title: string;
    message: string;
    timestamp: number;
    type: 'info' | 'success' | 'warning' | 'error';
    deviceId?: string;
    deviceName?: string;
    read?: boolean;
    actions?: NotificationAction[];
}

export interface NotificationAction {
    label: string;
    action: string;
    data?: Record<string, string | number>;
}

export interface PomodoroNotification extends NotificationData {
    type: 'pomodoro';
    pomodoroPhase: 'work' | 'break' | 'long_break';
    remainingTime: number;
    totalTime: number;
}

export interface DeviceNotification extends NotificationData {
    type: 'device';
    deviceId: string;
    deviceName: string;
    connectionStatus: 'connected' | 'disconnected' | 'error';
}

// Additional notification properties that might be dynamic
export interface NotificationExtensions {
    priority?: 'low' | 'normal' | 'high';
    persistent?: boolean;
    autoClose?: number; // milliseconds
    sound?: string;
    icon?: string;
}