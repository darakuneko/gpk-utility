// IPC Response Types for GPK Utility

export interface BaseResponse {
  success: boolean;
  error?: string;
}

export interface DataResponse<T> extends BaseResponse {
  data?: T;
}

export interface SettingsResponse extends BaseResponse {
  settings?: Record<string, string | number | boolean | Record<string, unknown>>;
}

export interface DeviceConfigResponse extends BaseResponse {
  config?: import('./device').DeviceConfig;
}

export interface SaveResult extends BaseResponse {
  timestamp?: number;
}

export interface LoadResult<T> extends BaseResponse {
  data?: T;
}

export interface ImportResult extends BaseResponse {
  devicesUpdated?: number;
  message?: string;
}

export interface NotificationResult extends BaseResponse {
  enabled?: boolean;
}

export interface PomodoroNotificationSettings {
  enabled: boolean;
  deviceId: string;
}

export interface TraySettings {
  enabled: boolean;
  minimizeToTray: boolean;
}

export interface OledSettings {
  enabled: boolean;
}

export interface PollingSettings {
  interval: number;
}

// Store-related response types
export interface StoreGetResponse<T = unknown> extends BaseResponse {
  value?: T;
}

export interface StoreSetResponse extends BaseResponse {
  key: string;
}

export interface StoreDeleteResponse extends BaseResponse {
  key: string;
}

// Device command response types
export interface DeviceCommandResponse extends BaseResponse {
  deviceId: string;
  commandId?: number;
}

// File operation response types
export interface FileOperationResponse extends BaseResponse {
  filePath?: string;
  fileSize?: number;
}

export interface ExportResponse extends FileOperationResponse {
  exportedDevices?: number;
}

// Window monitoring response types
export interface ActiveWindowResponse extends BaseResponse {
  windows?: Array<{
    application: string;
    title: string;
    pid: number;
  }>;
}