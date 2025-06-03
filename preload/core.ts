import { ipcRenderer } from 'electron';

import type { CommandResult } from '../src/types/device';

import type { Device, StoreSettings } from './types';
import type { GenericEventCallback } from './eventTypes';

// Global state variables

export const listeners = new Map<GenericEventCallback, (event: Electron.IpcRendererEvent, ...args: unknown[]) => void>();
export let cachedDeviceRegistry: Device[] = [];
export let keyboardPollingInterval: NodeJS.Timeout | null = null;
export let windowMonitoringInterval: NodeJS.Timeout | null = null;

// Device processing lock mechanism to prevent concurrent processing
export const deviceProcessingLocks = new Map<string, boolean>();

// Flag to prevent duplicate event listener registration
export let eventListenersRegistered = false;

// Slider activity tracking variables
export let isSliderActive = false;
export let activeSliderDeviceId: string | null = null;

// Store settings cache
export let cachedStoreSettings: StoreSettings = {
    autoLayerSettings: {},
    oledSettings: {},
    pomodoroDesktopNotificationsSettings: {},
    savedNotifications: [],
    traySettings: {
        minimizeToTray: true,
        backgroundStart: false
    },
    pollingInterval: 1000, // Default polling interval: 1000ms
    locale: 'en'
};

// Device processing lock functions to prevent concurrent processing
export const lockDeviceProcessing = (deviceId: string): boolean => {
    if (deviceProcessingLocks.has(deviceId)) {
        return false; // Already locked
    }
    deviceProcessingLocks.set(deviceId, true);
    return true; // Lock successful
};

export const unlockDeviceProcessing = (deviceId: string): void => {
    deviceProcessingLocks.delete(deviceId);
};

// Get current polling interval from settings or use default
export const getPollingInterval = (): number => {
    return cachedStoreSettings.pollingInterval || 1000;
};

// Function to start keyboard polling at regular intervals
export const startKeyboardPolling = (keyboardSendLoop: () => Promise<void>): void => {
    if (keyboardPollingInterval) {
        clearInterval(keyboardPollingInterval);
    }
    
    const interval = getPollingInterval();
    
    // Set up interval using the current polling interval setting
    keyboardPollingInterval = setInterval(async (): Promise<void> => {
        await keyboardSendLoop();
    }, interval);
};

// Function to start window monitoring at faster intervals
export const startWindowMonitoring = (startWindowMonitoringCommand: () => Promise<void>): void => {
    if (windowMonitoringInterval) {
        clearInterval(windowMonitoringInterval);
    }
    
    const interval = getPollingInterval();
    
    // Set up interval for regular execution
    windowMonitoringInterval = setInterval(async (): Promise<void> => {
        await startWindowMonitoringCommand();
    }, interval);
};

// Load store settings from main process
export const loadStoreSettings = async (): Promise<void> => {
    try {
        const result = await ipcRenderer.invoke('getAllStoreSettings') as { success: boolean; settings: StoreSettings };
        if (result.success) {
            cachedStoreSettings = result.settings;
        } else {
            console.error('[ERROR] loadStoreSettings: Failed to load settings');
        }
    } catch (err) {
        console.error("[ERROR] loadStoreSettings:", err);
    }
};

// Save store setting and update cache
export const saveStoreSetting = async <K extends keyof StoreSettings>(key: K, value: StoreSettings[K], deviceId: string | null = null): Promise<CommandResult> => {
    try {
        const result = await ipcRenderer.invoke('saveStoreSetting', { key, value }) as CommandResult;
        if (result.success) {
            // Update local cache
            (cachedStoreSettings as StoreSettings)[key] = value;
            
            // Handle polling interval changes
            if (key === 'pollingInterval') {
                // Clear existing intervals
                if (keyboardPollingInterval) {
                    clearInterval(keyboardPollingInterval);
                }
                
                if (windowMonitoringInterval) {
                    clearInterval(windowMonitoringInterval);
                }
                
                // Signal that intervals need to be restarted
                window.dispatchEvent(new CustomEvent('restartPollingIntervals'));
            }
            
            // If deviceId is provided, dispatch configSaveComplete event
            if (deviceId) {
                window.dispatchEvent(new CustomEvent('configSaveComplete', {
                    detail: {
                        deviceId,
                        success: true,
                        timestamp: Date.now()
                    }
                }));
            }
        }
        return result;
    } catch (err) {
        console.error(`[ERROR] saveStoreSetting ${key}:`, err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
};

// Update cached device registry
export const updateCachedDeviceRegistry = (newRegistry: Device[]): void => {
    cachedDeviceRegistry = newRegistry;
};

// Update event listeners registration status
export const setEventListenersRegistered = (status: boolean): void => {
    eventListenersRegistered = status;
};

// Update slider state
export const setSliderActive = (active: boolean): void => {
    isSliderActive = active;
    if (active) {
        activeSliderDeviceId = null;
    }
};

// Get slider state
export const getSliderState = (): { isSliderActive: boolean; activeSliderDeviceId: string | null } => {
    return { isSliderActive, activeSliderDeviceId };
};