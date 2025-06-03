// API Command and Response Types for GPK Utility

// Re-export commonly used types from ipc-responses
export type { SaveResult, NotificationResult } from './ipc-responses';

export interface DeviceCommand {
    id: number;
    data?: number[];
}

export interface CommandPayload {
    deviceId: string;
    commands: DeviceCommand[];
}

// Translation system types
export interface TranslationParams {
    [key: string]: string | number;
}

export interface TranslationFunction {
    (key: string, params?: TranslationParams): string;
}

// Event system types
export interface GenericEventCallback {
    (...args: unknown[]): void; // Use unknown for type safety
}

export interface SwitchUpdateEvent {
    id: string;
    value: boolean | number;
}

export interface ConfigSaveEvent {
    success: boolean;
    timestamp: number;
    deviceId?: string;
}

// Store operation types
export interface StoreKeyValue {
    key: string;
    value: string | number | boolean | Record<string, unknown> | unknown[]; // Common store value types
}

export interface StoreDeleteOperation {
    key: string;
}

// Settings-specific types
export interface PollingIntervalSetting {
    value: number; // milliseconds
}

export interface AutoLayerSettingsStore {
    [deviceId: string]: {
        enabled: boolean;
        layerSettings: import('./device').LayerSetting[];
    };
}

export interface TraySettingsStore {
    enabled: boolean;
    minimizeToTray: boolean;
}

export interface NotificationSettingsStore {
    [deviceId: string]: {
        enabled: boolean;
    };
}

// HID Device types for low-level operations
export interface HIDDeviceInstance {
    path: string;
    vendorId: number;
    productId: number;
    serialNumber?: string;
    manufacturer?: string;
    product?: string;
    interface?: number;
    release?: number;
    usagePage?: number;
    usage?: number;
    closed?: boolean;
    removeAllListeners?: () => void;
    close?: () => void;
}

export interface HIDWriteResult {
    success: boolean;
    bytesWritten?: number;
    error?: string;
}

export interface HIDReadResult {
    success: boolean;
    data?: number[];
    error?: string;
}

// File operation types
export interface FileImportOptions {
    filePath: string;
    overwriteExisting?: boolean;
}

export interface FileExportOptions {
    filePath: string;
    includeSettings?: boolean;
    deviceIds?: string[];
}

// Notification system types
export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    urgency?: 'low' | 'normal' | 'critical';
}

export interface PomodoroNotificationConfig {
    deviceId: string;
    enabled: boolean;
    workPhaseMessage?: string;
    breakPhaseMessage?: string;
}

// Window monitoring types
export interface WindowInfo {
    title: string;
    executableName: string;
    application: string;
    name: string;
    path?: string;
    pid?: number;
}

export interface WindowMonitoringResult {
    windows: WindowInfo[];
    timestamp: number;
}

// OLED display types
export interface OLEDDisplayContent {
    text?: string;
    image?: Buffer;
    duration?: number;
}

export interface OLEDDisplayOptions {
    brightness?: number;
    contrast?: number;
    invertDisplay?: boolean;
}

// Update system types
export interface UpdateNotification {
    title: string;
    body: string;
    publishedAt: {
        _seconds: number;
    };
}

export interface UpdateCheckResult {
    hasUpdates: boolean;
    notifications?: UpdateNotification[];
}

// App version and info types
export interface AppVersionInfo {
    name: string;
    version: string;
    description?: string;
    author: {
        name?: string;
        email?: string;
        url?: string;
    };
    homepage?: string;
}

// Error types for API operations
export interface APIError {
    code: string;
    message: string;
    details?: unknown; // Error details can vary
}

export interface APIResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: APIError;
}