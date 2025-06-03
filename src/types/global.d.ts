// Global type definitions for GPK Utility
import { Device, DeviceConfig, AppInfo } from './device';

// Window API exposed by preload script
declare global {
  interface Window {
    api: {
      // Device operations
      getConnectedDevices: () => Promise<Device[]>;
      connectDevice: (device: Device) => Promise<void>;
      disconnectDevice: (device: Device) => Promise<void>;
      sendCommand: (command: unknown[]) => Promise<unknown>;
      
      // Config operations
      getDeviceSettings: (device: Device) => Promise<DeviceConfig>;
      saveDeviceSettings: (device: Device, settings: DeviceConfig) => Promise<void>;
      
      // File operations
      importFile: () => Promise<unknown>;
      exportFile: () => Promise<unknown>;
      exportDeviceJson: (device: Device, settings: DeviceConfig) => Promise<void>;
      
      // Store operations
      storeGet: (key: string) => Promise<unknown>;
      storeSet: (key: string, value: unknown) => Promise<void>;
      storeDelete: (key: string) => Promise<void>;
      storeClear: () => Promise<void>;
      
      // Locale operations
      setAppLocale: (locale: string) => Promise<{ success: boolean; error?: string }>;
      
      // Notification operations
      showNotification: (title: string, body: string) => void;
      
      // Version info
      getVersion: () => Promise<string>;
      
      // App info
      getAppInfo: () => Promise<AppInfo>;
      getStoreFilePath: () => Promise<{ success: boolean; path?: string }>;
      
      // External links
      openExternalLink: (url: string) => void;
      
      // Event listeners
      on: <T extends string>(channel: T, func: (...args: unknown[]) => void) => void;
      off: <T extends string>(channel: T, func: (...args: unknown[]) => void) => void;
      onConfigSaveComplete: (callback: (data: { success: boolean; timestamp: number }) => void) => void;
      
      // Device management
      getDeviceType: (device: Device) => Promise<string>;
      setActiveTab: (deviceId: string, tabId: string) => Promise<void>;
      dispatchSaveDeviceConfig: (device: Device) => Promise<unknown>;
      setSliderActive: (deviceId: string, active: boolean) => void;
      
      // Extended store operations  
      getStoreSetting: (key: string) => Promise<unknown>;
      saveStoreSetting: (key: string, value: unknown) => Promise<{ success: boolean; error?: string }>;
      getAllStoreSettings: () => Promise<Record<string, unknown>>;
      
      // Notification settings
      getCachedNotifications: () => Promise<Array<{ title: string; body: string; publishedAt: { _seconds: number } }>>;
      loadTraySettings: () => Promise<{ success: boolean; minimizeToTray?: boolean; backgroundStart?: boolean }>;
      saveTraySettings: (settings: { minimizeToTray?: boolean; backgroundStart?: boolean }) => Promise<{ success: boolean; error?: string }>;
      
      // Window monitoring
      getActiveWindows: () => Promise<unknown[]>;
      
      // Pomodoro settings
      loadPomodoroDesktopNotificationSettings: (deviceId: string) => Promise<{ success: boolean; enabled: boolean }>;
      savePomodoroDesktopNotificationSettings: (deviceId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      
      // OLED settings
      saveOledSettings: (device: Device, settings: unknown) => Promise<void>;
      
      // Trackpad settings
      saveTrackpadConfig: (device: Device, config: unknown) => Promise<void>;
    };
  }
}

export {};