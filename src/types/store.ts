// Store-related type definitions
import type { LayerSetting } from './device';
import type { Notification } from './ipc';

export interface WindowBounds {
    width: number;
    height: number;
    x?: number;
    y?: number;
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
    savedNotifications: Notification[];
    traySettings: TraySettings;
    windowBounds: WindowBounds;
    locale: string;
    notificationApiEndpoint: string;
    // Legacy fields for backward compatibility
    minimizeToTray?: boolean;
    backgroundStart?: boolean;
}

export type StoreKey = keyof StoreSchema;
export type StoreValue<K extends StoreKey> = StoreSchema[K];