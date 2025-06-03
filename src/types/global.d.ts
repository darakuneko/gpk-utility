// Global type definitions for GPK Utility
import { Device, DeviceConfig, AppInfo } from './common';

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
    };
  }
}

export {};