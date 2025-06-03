import React, { useState, useEffect } from "react"
import { createRoot } from 'react-dom/client'

import Content from "./content.tsx"
import { AppProvider } from "./context.tsx"
import { LanguageProvider } from "./i18n/LanguageContext.tsx"
import UpdatesNotificationModal from "./components/UpdatesNotificationModal.tsx"
import "./styles.css"
import type { Device, DeviceConfig, AppInfo } from './types/device';

// Set initial background color immediately
document.documentElement.style.backgroundColor = '#f0f0f0'
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.style.backgroundColor = '#1a1a1a'
    document.documentElement.classList.add('dark')
}

// Type definitions for this component
interface UpdatesNotificationEvent extends CustomEvent {
  detail: {
    notifications: Array<{
      title: string;
      body: string;
      publishedAt: {
        _seconds: number;
      };
    }>;
  };
}

declare global {
  interface Window {
    api: {
      getConnectedDevices: () => Promise<Device[]>;
      connectDevice: (device: Device) => Promise<void>;
      disconnectDevice: (device: Device) => Promise<void>;
      sendCommand: (command: unknown[]) => Promise<unknown>;
      getDeviceSettings: (device: Device) => Promise<DeviceConfig>;
      saveDeviceSettings: (device: Device, settings: DeviceConfig) => Promise<void>;
      importFile: () => Promise<unknown>;
      exportFile: () => Promise<unknown>;
      exportDeviceJson: (device: Device, settings: DeviceConfig) => Promise<void>;
      storeGet: (key: string) => Promise<unknown>;
      storeSet: (key: string, value: unknown) => Promise<void>;
      storeDelete: (key: string) => Promise<void>;
      storeClear: () => Promise<void>;
      setAppLocale: (locale: string) => Promise<{ success: boolean; error?: string }>;
      showNotification: (title: string, body: string) => void;
      getVersion: () => Promise<string>;
      getAppInfo: () => Promise<AppInfo>;
      getStoreFilePath: () => Promise<{ success: boolean; path?: string }>;
      openExternalLink: (url: string) => void;
      // Event listeners
      on: <T extends string>(channel: T, func: (...args: unknown[]) => void) => void;
      off: <T extends string>(channel: T, func: (...args: unknown[]) => void) => void;
      // Device operations
      getDeviceType: (device: Device) => Promise<string>;
      setActiveTab: (deviceId: string, tabId: string) => Promise<void>;
      dispatchSaveDeviceConfig: (device: Device) => Promise<unknown>;
      setSliderActive: (deviceId: string, active: boolean) => void;
      // Store operations  
      getStoreSetting: (key: string) => Promise<unknown>;
      saveStoreSetting: (key: string, value: unknown) => Promise<void>;
      getAllStoreSettings: () => Promise<unknown>;
      // Notification settings
      getCachedNotifications: () => Promise<unknown[]>;
      loadTraySettings: () => Promise<unknown>;
      saveTraySettings: (settings: unknown) => Promise<void>;
      // Window monitoring
      getActiveWindows: () => Promise<unknown[]>;
      // Config callbacks
      onConfigSaveComplete: (callback: (data: unknown) => void) => void;
      // Pomodoro
      loadPomodoroDesktopNotificationSettings: (deviceId: string) => Promise<boolean>;
      savePomodoroDesktopNotificationSettings: (deviceId: string, enabled: boolean) => Promise<void>;
      // OLED
      saveOledSettings: (device: Device, settings: unknown) => Promise<void>;
      // Trackpad
      saveTrackpadConfig: (device: Device, config: unknown) => Promise<void>;
      saveAutoLayerSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
      loadAutoLayerSettings: () => Promise<{ success: boolean; settings: Record<string, unknown> }>;
      saveOledSettings: (deviceId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      loadOledSettings: (deviceId: string) => Promise<{ success: boolean; enabled?: boolean }>;
      saveTraySettings: (settings: { minimizeToTray?: boolean; backgroundStart?: boolean }) => Promise<{ success: boolean; error?: string }>;
      loadTraySettings: () => Promise<{ success: boolean; minimizeToTray?: boolean; backgroundStart?: boolean }>;
      savePomodoroDesktopNotificationSettings: (deviceId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      loadPomodoroDesktopNotificationSettings: (deviceId: string) => Promise<{ success: boolean; enabled: boolean }>;
      getCachedNotifications: () => Promise<Array<{ title: string; body: string; publishedAt: { _seconds: number } }>>;
    };
  }
  interface WindowEventMap {
    'showUpdatesNotificationModal': UpdatesNotificationEvent;
  }
}

// Initialize API check - wait for preload script
const _api = window.api

const App: React.FC = (): JSX.Element => {
    const [isUpdatesNotificationModalOpen, setIsUpdatesNotificationModalOpen] = useState<boolean>(false)
    const [updates, setUpdates] = useState<Array<{
        title: string;
        body: string;
        publishedAt: {
            _seconds: number;
        };
    }>>([])

    useEffect((): (() => void) => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = (e: MediaQueryListEvent): void => {
            document.documentElement.style.backgroundColor = e.matches ? '#1a1a1a' : '#f0f0f0'
            document.documentElement.classList.toggle('dark', e.matches)
        }
        mediaQuery.addEventListener('change', handleChange)
        return (): void => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    // Listen for showUpdatesNotificationModal event
    useEffect((): (() => void) => {
        const handleUpdatesNotificationModalEvent = (event: UpdatesNotificationEvent): void => {
            setUpdates(event.detail.notifications)
            setIsUpdatesNotificationModalOpen(true)
        }

        window.addEventListener('showUpdatesNotificationModal', handleUpdatesNotificationModalEvent)
        
        return (): void => {
            window.removeEventListener('showUpdatesNotificationModal', handleUpdatesNotificationModalEvent)
        }
    }, [])

    const handleCloseUpdatesNotificationModal = (): void => {
        setIsUpdatesNotificationModalOpen(false)
    }

    return (
        <React.StrictMode>
            <AppProvider>
                <LanguageProvider>
                    <div className="min-h-screen">
                        <Content />
                        <UpdatesNotificationModal 
                            isOpen={isUpdatesNotificationModalOpen} 
                            onClose={handleCloseUpdatesNotificationModal} 
                            updates={updates} 
                        />
                    </div>
                </LanguageProvider>
            </AppProvider>
        </React.StrictMode>
    )
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', (): void => {
    const container = document.getElementById('root')
    if (container) {
        const root = createRoot(container)
        root.render(<App />)
    }
})
