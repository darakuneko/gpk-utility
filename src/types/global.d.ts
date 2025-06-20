// Global type definitions for GPK Utility
import { Device, DeviceConfig, AppInfo, ActiveWindowResult, CommandResult } from './device';
import { 
  ImportResult, 
  ExportResponse, 
  SaveResult,
  GenericEventCallback 
} from './api-types';
import { DeviceConfigResponse } from './ipc-responses';

// Window API exposed by preload script
declare global {
  interface Window {
    api: {
      // Device operations
      getConnectedDevices: () => Promise<Device[]>;
      connectDevice: (device: Device) => Promise<void>;
      disconnectDevice: (device: Device) => Promise<void>;
      sendCommand: (command: number[]) => Promise<CommandResult>;
      
      // Config operations
      getDeviceSettings: (device: Device) => Promise<DeviceConfig>;
      saveDeviceSettings: (device: Device, settings: DeviceConfig) => Promise<void>;
      
      // File operations
      importFile: () => Promise<ImportResult>;
      exportFile: () => Promise<ExportResponse>;
      exportDeviceJson: (device: Device, settings: DeviceConfig) => Promise<void>;
      
      // Store operations
      storeGet: <T = unknown>(key: string) => Promise<T>;
      storeSet: <T = unknown>(key: string, value: T) => Promise<void>;
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
      
      // Event listeners with overloads for specific events
      on(channel: 'configUpdated', func: (data: { deviceId: string; config: Record<string, unknown> }) => void): void;
      on(channel: 'changeConnectDevice', func: (devices: Device[]) => void): void;
      on(channel: 'activeWindow', func: (windowInfo: string) => void): void;
      on<T extends string>(channel: T, func: GenericEventCallback): void;
      off(channel: 'configUpdated', func: (data: { deviceId: string; config: Record<string, unknown> }) => void): void;
      off(channel: 'changeConnectDevice', func: (devices: Device[]) => void): void;
      off(channel: 'activeWindow', func: (windowInfo: string) => void): void;
      off<T extends string>(channel: T, func: GenericEventCallback): void;
      onConfigSaveComplete: (callback: (data: { success: boolean; timestamp: number }) => void) => void;
      
      // Device management
      getDeviceType: (device: Device) => Promise<string>;
      setActiveTab: (deviceId: string, tabId: string) => Promise<void>;
      dispatchSaveDeviceConfig: (device: Device, configTypes?: string[]) => Promise<DeviceConfigResponse>;
      setSliderActive: (deviceId: string, active: boolean) => void;
      
      // Extended store operations  
      getStoreSetting: <T = unknown>(key: string) => Promise<T>;
      saveStoreSetting: <T = unknown>(key: string, value: T) => Promise<SaveResult>;
      getAllStoreSettings: () => Promise<Record<string, unknown>>;
      
      // Notification settings
      getCachedNotifications: () => Promise<Array<{ title: string; body: string; publishedAt: { _seconds: number } }>>;
      loadTraySettings: () => Promise<{ success: boolean; minimizeToTray?: boolean; backgroundStart?: boolean }>;
      saveTraySettings: (settings: { minimizeToTray?: boolean; backgroundStart?: boolean }) => Promise<{ success: boolean; error?: string }>;
      
      // Window monitoring
      getActiveWindows: () => Promise<ActiveWindowResult[]>;
      
      // Pomodoro settings
      loadPomodoroDesktopNotificationSettings: (deviceId: string) => Promise<{ success: boolean; enabled: boolean }>;
      savePomodoroDesktopNotificationSettings: (deviceId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      
      // OLED settings
      saveOledSettings: (device: Device, settings: { enabled: boolean }) => Promise<void>;
      
      // Trackpad settings
      saveTrackpadConfig: (device: Device, config: import('./device').TrackpadConfig) => Promise<void>;
      
      // LED settings
      saveLedConfig: (device: Device) => Promise<CommandResult>;
      saveLedLayerConfig: (device: Device) => Promise<CommandResult>;
      getLedConfig: (device: Device) => Promise<CommandResult>;
      getLedLayerConfig: (device: Device) => Promise<CommandResult>;
      switchLayer: (device: Device, targetLayer: number) => Promise<CommandResult>;
    };
  }
}

export {};