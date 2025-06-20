import { ipcRenderer, IpcRendererEvent } from 'electron';

import type { DeviceConfig, PomodoroConfig } from './types';
import { cachedDeviceRegistry, setEventListenersRegistered, eventListenersRegistered } from './core';
import { command } from './device';

export const setupEventListeners = (): void => {
    if (eventListenersRegistered) {
        return; // Already registered
    }
    
    setEventListenersRegistered(true);
    
    ipcRenderer.on("deviceConnectionStateChanged", (event: IpcRendererEvent, { deviceId, connected, gpkRCVersion, deviceType, config, initializing }: {
        deviceId: string;
        connected: boolean;
        gpkRCVersion: string;
        deviceType: string;
        config: DeviceConfig;
        initializing?: boolean;
    }): void => {
        const deviceIndex = cachedDeviceRegistry.findIndex((device): boolean => device.id === deviceId);
        if (deviceIndex === -1) {
            return;
        }
        
        const device = cachedDeviceRegistry[deviceIndex];

        // Only update if connection status changes or command version changes
        let changed = false;
        if(device) {
            // Check if device initialization is complete (config exists and has init property)
            const initializationComplete = config && (config.init !== undefined || config.oled_enabled !== undefined);
            
            if (device.connected !== connected){
                cachedDeviceRegistry[deviceIndex]!.connected = connected;
                changed = true;
            } 
            if(device.gpkRCVersion !== gpkRCVersion) {
                cachedDeviceRegistry[deviceIndex]!.gpkRCVersion = gpkRCVersion;
                changed = true;
            }
            if(device.deviceType !== deviceType) {
                cachedDeviceRegistry[deviceIndex]!.deviceType = deviceType;
                changed = true;
            }
            
            if (device.config !== config) {
                cachedDeviceRegistry[deviceIndex]!.config = config;
                changed = true;
            }
            
            // Handle explicit initializing property from backend
            if (initializing !== undefined && device.initializing !== initializing) {
                cachedDeviceRegistry[deviceIndex]!.initializing = initializing;
                changed = true;
            }
            
            // Mark initialization as complete and device as connected when config is received (fallback)
            if (initializationComplete && device.initializing) {
                cachedDeviceRegistry[deviceIndex]!.initializing = false;
                cachedDeviceRegistry[deviceIndex]!.connected = true;
                changed = true;
            }
        }
        if(changed) {
            command.changeConnectDevice(cachedDeviceRegistry);
        }
    });

    // Event listener for when OLED settings are changed
    ipcRenderer.on("oledSettingsChanged", (event: IpcRendererEvent, { deviceId, enabled }: {
        deviceId: string;
        enabled: boolean;
    }): void => {
        const deviceIndex = cachedDeviceRegistry.findIndex((device): boolean => device.id === deviceId);
        if (deviceIndex !== -1) {
            // Ensure config object exists with safe structure
            if (!cachedDeviceRegistry[deviceIndex]!.config) {
                cachedDeviceRegistry[deviceIndex]!.config = {
                    pomodoro: {},
                    trackpad: {},
                    oled_enabled: 0
                };
            }
            cachedDeviceRegistry[deviceIndex]!.config!.oled_enabled = enabled ? 1 : 0;
            command.changeConnectDevice(cachedDeviceRegistry);
        }
    });

    ipcRenderer.on("deviceConnectionPomodoroPhaseChanged", (event: IpcRendererEvent, { deviceId, pomodoroConfig, phaseChanged }: {
        deviceId: string;
        pomodoroConfig: PomodoroConfig;
        phaseChanged: boolean;
    }): void => {     
        const deviceIndex = cachedDeviceRegistry.findIndex((device): boolean => device.id === deviceId);
        if (deviceIndex === -1) return;
        
        // Ensure config object exists with safe structure
        if (!cachedDeviceRegistry[deviceIndex]!.config) {
            cachedDeviceRegistry[deviceIndex]!.config = {
                pomodoro: {},
                trackpad: {},
                oled_enabled: 0
            };
        }
            
        // Save existing notification settings
        const notificationsEnabled = cachedDeviceRegistry[deviceIndex]!.config?.pomodoro?.notifications_enabled;
        
        // Check previous timer active state
        const oldTimerActive = cachedDeviceRegistry[deviceIndex]!.config?.pomodoro?.timer_active;
        
        // Update pomodoro config
        cachedDeviceRegistry[deviceIndex]!.config!.pomodoro = { ...pomodoroConfig };
        
        // Restore notification settings if they existed
        if (notificationsEnabled !== undefined) {
            cachedDeviceRegistry[deviceIndex]!.config!.pomodoro!.notifications_enabled = notificationsEnabled;
        }
        
        command.changeConnectDevice(cachedDeviceRegistry);
        
        // Check if timer active state changed
        const newTimerActive = pomodoroConfig.timer_active === 1;
        const timerActiveStateChanged = (oldTimerActive === 1) !== newTimerActive;
        
        // Send desktop notification if phase changed and timer is active
        if (phaseChanged && pomodoroConfig.timer_active === 1) {
            void (async (): Promise<void> => {
                try {
                    const result = await ipcRenderer.invoke('loadPomodoroDesktopNotificationSettings', deviceId);
                    const notificationsEnabled = result.success ? result.enabled : true;
                    if (notificationsEnabled) {
                        const deviceName = cachedDeviceRegistry[deviceIndex]!.product || cachedDeviceRegistry[deviceIndex]!.name || 'Keyboard';
                        const newPhase = pomodoroConfig.phase;
                        let minutes = 0;
                        switch (newPhase) {
                            case 1:
                                minutes = pomodoroConfig.work_time || 0;
                                break;
                            case 2:
                                minutes = pomodoroConfig.break_time || 0;
                                break;
                            case 3:
                                minutes = pomodoroConfig.long_break_time || 0;
                                break;
                        }
                        
                        ipcRenderer.send('pomodoroActiveChanged', {
                            deviceName,
                            deviceId,
                            phase: newPhase,
                            minutes
                        });
                    }
                } catch (error) {
                    console.error("Error checking notification settings:", error);
                }
            })();
        }
        
        // Notify main process about the phase change
        ipcRenderer.send('deviceConnectionPomodoroPhaseChanged', {
            deviceId,
            pomodoroConfig,
            phaseChanged: phaseChanged || timerActiveStateChanged // Include timer active state changes
        });
    });

    // Handle config save completion events
    ipcRenderer.on("configSaveComplete", (event: IpcRendererEvent, { deviceId, success, timestamp }: {
        deviceId: string;
        success: boolean;
        timestamp: number;
    }): void => {
        const deviceIndex = cachedDeviceRegistry.findIndex((device): boolean => device.id === deviceId);
        if (deviceIndex !== -1) {
            command.changeConnectDevice(cachedDeviceRegistry);
            window.dispatchEvent(new CustomEvent('configSaveComplete', {
                detail: {
                    deviceId,
                    success,
                    timestamp
                }
            }));
        }
    });

    // Handle config update events
    ipcRenderer.on("configUpdated", (event: IpcRendererEvent, { deviceId, config }: {
        deviceId: string;
        config: DeviceConfig;
    }): void => {
        const deviceIndex = cachedDeviceRegistry.findIndex((device): boolean => device.id === deviceId);
        if (deviceIndex !== -1) {
            // Ensure safe config structure
            const safeConfig = config || {
                pomodoro: {},
                trackpad: {},
                oled_enabled: 0
            };
            cachedDeviceRegistry[deviceIndex]!.config = { ...safeConfig };
            command.changeConnectDevice(cachedDeviceRegistry);
        }
    });
};