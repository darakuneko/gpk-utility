// Event callback type definitions for preload API
import type { Device, DeviceConfig } from './types';

// Event data types
export interface ConfigUpdatedEventData {
    deviceId: string;
    config: DeviceConfig;
}

export interface ChangeConnectDeviceEventData {
    devices: Device[];
}

export interface ActiveWindowEventData {
    windowInfo: {
        title: string;
        application: string;
        // Add other window properties as needed
    };
}

// Event callback function types
export type ConfigUpdatedCallback = (data: ConfigUpdatedEventData) => void;
export type ChangeConnectDeviceCallback = (devices: Device[]) => void;
export type ActiveWindowCallback = (windowInfo: ActiveWindowEventData['windowInfo']) => void;

// Generic event callback type for unknown events
export type GenericEventCallback = (...args: unknown[]) => void;

// Map of known event names to their callback types
export interface EventCallbackMap {
    'configUpdated': ConfigUpdatedCallback;
    'changeConnectDevice': ChangeConnectDeviceCallback;
    'activeWindow': ActiveWindowCallback;
    // Add other event types as discovered
}

// Helper type to get callback type for a specific event
export type EventCallback<T extends keyof EventCallbackMap> = EventCallbackMap[T];