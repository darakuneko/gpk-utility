// Type-safe store value definitions

import { StoreSettings } from '../../preload/types';

// Define specific store value types based on keys
export type StoreValue<K extends keyof StoreSettings> = 
    K extends 'autoLayerSettings' ? StoreSettings[K] :
    K extends 'oledSettings' ? StoreSettings[K] :
    K extends 'pomodoroDesktopNotificationsSettings' ? StoreSettings[K] :
    K extends 'savedNotifications' ? StoreSettings[K] :
    K extends 'traySettings' ? StoreSettings[K] :
    K extends 'pollingInterval' ? StoreSettings[K] :
    K extends 'locale' ? StoreSettings[K] :
    unknown;

// Translation parameter types
export interface TranslationParams {
    [key: string]: string | number;
}

// Auto layer setting structure
export interface AutoLayerSetting {
    enabled: boolean;
    layerSettings: LayerConfiguration[];
}

export interface LayerConfiguration {
    appName: string;
    layer: number;
    enabled: boolean;
}

// OLED setting structure
export interface OLEDSetting {
    enabled: boolean;
}

// Notification setting structure
export interface NotificationSetting {
    enabled: boolean;
}

// Tray setting structure
export interface TraySettings {
    minimizeToTray: boolean;
    backgroundStart: boolean;
}

// Window bounds structure
export interface WindowBounds {
    width: number;
    height: number;
    x?: number;
    y?: number;
}