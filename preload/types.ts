// Type definitions for device and configuration structures
import type { LayerSetting } from '../src/types/trackpad';
import type { CommandData } from '../src/types/command';
import type { NotificationData } from '../src/types/notification';
export interface Device {
    id: string;
    manufacturer?: string;
    product?: string;
    productId: number;
    vendorId: number;
    path?: string;
    connected: boolean;
    initializing?: boolean;
    checkDevice?: boolean;
    config?: DeviceConfig | null;
    needsRestart?: boolean;
    gpkRCVersion?: string;
    deviceType?: string;
    name?: string;
}

export interface DeviceConfig {
    init?: number;
    oled_enabled?: number;
    pomodoro?: PomodoroConfig;
    trackpad?: TrackpadConfig;
}

export interface PomodoroConfig {
    timer_active?: number;
    phase?: number;
    work_time?: number;
    break_time?: number;
    long_break_time?: number;
    notifications_enabled?: number | boolean;
}

export interface TrackpadConfig {
    auto_layer_enabled?: number;
    auto_layer_settings?: LayerSetting[];
    // Specific trackpad properties can be added here
    // Use TrackpadConfigProperties for detailed configuration
    [key: string]: number | boolean | LayerSetting[] | undefined;
}

export interface AutoLayerSetting {
    enabled: boolean;
    layerSettings: LayerSetting[];
}

export interface StoreSettings {
    autoLayerSettings: Record<string, AutoLayerSetting>;
    oledSettings: Record<string, { enabled: boolean }>;
    pomodoroDesktopNotificationsSettings: Record<string, boolean>;
    savedNotifications: NotificationData[];
    traySettings: {
        minimizeToTray: boolean;
        backgroundStart: boolean;
    };
    pollingInterval: number;
    locale: string;
}

export interface Notification {
    id?: string;
    title?: string;
    message?: string;
    timestamp?: number;
    type?: string;
    // Additional notification properties
    [key: string]: string | number | boolean | undefined;
}

export interface ExportData {
    devices: Device[];
    appSettings: {
        traySettings: StoreSettings['traySettings'];
        locale: string;
    };
}

export interface ImportResult {
    success: boolean;
    message?: string;
    error?: string;
    devicesUpdated?: number;
}

export interface CommandResult {
    success: boolean;
    error?: string;
    data?: CommandData;
    // Additional command result properties
    [key: string]: boolean | string | CommandData | undefined;
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

export interface SliderState {
    isSliderActive: boolean;
    activeSliderDeviceId: string | null;
}

export interface AppInfo {
    name: string;
    version: string;
    description: string;
    author: {
        name?: string;
        email?: string;
        url?: string;
        [key: string]: string | undefined;
    };
}

export interface TraySettings {
    minimizeToTray?: boolean;
    backgroundStart?: boolean;
}