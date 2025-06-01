// Global type definitions for GPK Utility

// Window API exposed by preload script
declare global {
  interface Window {
    api: {
      // Device operations
      getConnectedDevices: () => Promise<any[]>;
      connectDevice: (device: any) => Promise<void>;
      disconnectDevice: (device: any) => Promise<void>;
      sendCommand: (command: any[]) => Promise<any>;
      
      // Config operations
      getDeviceSettings: (device: any) => Promise<any>;
      saveDeviceSettings: (device: any, settings: any) => Promise<void>;
      
      // File operations
      importConfigs: () => Promise<string>;
      exportConfigs: () => Promise<void>;
      exportDeviceJson: (device: any, settings: any) => Promise<void>;
      
      // Store operations
      storeGet: (key: string) => Promise<any>;
      storeSet: (key: string, value: any) => Promise<void>;
      storeDelete: (key: string) => Promise<void>;
      storeClear: () => Promise<void>;
      
      // Notification operations
      showNotification: (title: string, body: string) => void;
      
      // Version info
      getVersion: () => Promise<string>;
      
      // App info
      getAppInfo: () => Promise<any>;
      getStoreFilePath: () => Promise<{ success: boolean; path?: string }>;
      
      // External links
      openExternalLink: (url: string) => void;
    };
  }
}

export {};