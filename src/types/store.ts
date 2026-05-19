// Store-related type definitions
import type { DeviceConfig, LayerSetting } from './device';
import type { NotificationData } from './ipc';

export interface WindowBounds {
    width: number;
    height: number;
    x?: number;
    y?: number;
}

export interface SavedConfig {
    id: string;
    name: string;
    deviceId: string;
    config: DeviceConfig;
    autoLayerSettings?: AutoLayerSetting;
    oledEnabled?: boolean;
    pomodoroNotifEnabled?: boolean;
    savedAt: number;
}

export interface AutoLayerSetting {
    enabled: boolean;
    layerSettings: LayerSetting[];
}

export interface OledSetting {
    enabled: boolean;
}

export interface TraySettings {
    minimizeToTray: boolean;
    backgroundStart: boolean;
}

export interface StoreSchema {
    autoLayerSettings: Record<string, AutoLayerSetting>;
    oledSettings: Record<string, OledSetting>;
    pomodoroDesktopNotificationsSettings: Record<string, boolean>;
    savedNotifications: NotificationData[];
    traySettings: TraySettings;
    windowBounds: WindowBounds;
    locale: string;
    notificationApiEndpoint: string;
    savedConfigs?: SavedConfig[];
    // Legacy fields for backward compatibility
    minimizeToTray?: boolean;
    backgroundStart?: boolean;
}

export type StoreKey = keyof StoreSchema;
export type StoreValue<K extends StoreKey> = StoreSchema[K];