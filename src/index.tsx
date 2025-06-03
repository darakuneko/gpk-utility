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

// Types are defined in src/types/global.d.ts

interface UpdatesNotificationEvent extends CustomEvent {
  detail: {
    version: string;
    releaseNotes: string;
  };
}

declare global {
  interface WindowEventMap {
    'showUpdatesNotificationModal': UpdatesNotificationEvent;
  }
}

// Initialize API check - wait for preload script
const _api = window.api

const App: React.FC = () => {
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
