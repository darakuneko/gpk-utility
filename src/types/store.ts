// Store-related type definitions

export interface AutoLayerSetting {
    enabled: boolean;
    layerSettings: LayerSetting[];
}

export interface LayerSetting {
    applicationName: string;
    layer: number;
}

export interface TraySettings {
    minimizeToTray: boolean;
    backgroundStart: boolean;
}

export interface StoreSettings {
    autoLayerSettings: Record<string, AutoLayerSetting>;
    oledSettings: Record<string, { enabled: boolean }>;
    pomodoroDesktopNotificationsSettings: Record<string, boolean>;
    savedNotifications: NotificationData[];
    traySettings: TraySettings;
    pollingInterval: number;
    locale: string;
}

export interface NotificationData {
    id?: string;
    [key: string]: any;
}