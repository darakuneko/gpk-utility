import React, { useState, useEffect } from "react"
import { createRoot } from 'react-dom/client'
import Content from "./content.js"
import { AppProvider } from "./context.js"
import { LanguageProvider } from "./i18n/LanguageContext.js"
import UpdatesNotificationModal from "./components/UpdatesNotificationModal.js"
import "./styles.css"

// Set initial background color immediately
document.documentElement.style.backgroundColor = '#f0f0f0'
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.style.backgroundColor = '#1a1a1a'
    document.documentElement.classList.add('dark')
}

// Initialize API check
const {api} = window

const App = () => {
    const [isUpdatesNotificationModalOpen, setIsUpdatesNotificationModalOpen] = useState(false)
    const [updates, setUpdates] = useState([])

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = (e) => {
            document.documentElement.style.backgroundColor = e.matches ? '#1a1a1a' : '#f0f0f0'
            document.documentElement.classList.toggle('dark', e.matches)
        }
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    // Listen for showUpdatesNotificationModal event
    useEffect(() => {
        const handleUpdatesNotificationModalEvent = (event) => {
            setUpdates(event.detail.notifications)
            setIsUpdatesNotificationModalOpen(true)
        }

        window.addEventListener('showUpdatesNotificationModal', handleUpdatesNotificationModalEvent)
        
        return () => {
            window.removeEventListener('showUpdatesNotificationModal', handleUpdatesNotificationModalEvent)
        }
    }, [])

    const handleCloseUpdatesNotificationModal = () => {
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
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root')
    if (container) {
        const root = createRoot(container)
        root.render(<App />)
    }
})
