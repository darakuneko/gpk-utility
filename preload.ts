import { loadStoreSettings, saveStoreSetting, startKeyboardPolling, startWindowMonitoring, cachedStoreSettings } from './preload/core';
import { keyboardSendLoop, command } from './preload/device';
import { setupEventListeners } from './preload/events';
import { exposeAPI } from './preload/api';

// Initialize polling and settings when the window is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadStoreSettings();
        
        // Start keyboard polling with the imported function
        startKeyboardPolling(keyboardSendLoop);
        
        // Start window monitoring with the command from device module
        startWindowMonitoring(command.startWindowMonitoring);
        
        const result = await command.getNotifications();
        const latestNotification = result?.notifications[0] || {} as any;
        const savedNotifications = cachedStoreSettings?.savedNotifications || [];

        if (latestNotification?.id) {
            const isDifferent = !savedNotifications.length || !savedNotifications.some((n: any) => n.id === latestNotification.id);
            if (isDifferent) {       
                await saveStoreSetting('savedNotifications', result.notifications);
                window.dispatchEvent(new CustomEvent('showUpdatesNotificationModal', {
                    detail: {
                        notifications: [latestNotification]
                    }
                }));
            }
        }
    } catch (error) {
        console.error("Error during initialization:", error);
    }
});

// Listen for polling interval changes
window.addEventListener('restartPollingIntervals', () => {
    startKeyboardPolling(keyboardSendLoop);
    startWindowMonitoring(command.startWindowMonitoring);
});

// Setup event listeners once when the script loads
setupEventListeners();

// Expose the API to the renderer process
exposeAPI();

// Cleanup handlers
process.on('exit', () => {
    const { keyboardPollingInterval, windowMonitoringInterval } = require('./preload/core');
    if (keyboardPollingInterval) {
        clearInterval(keyboardPollingInterval);
    }
    if (windowMonitoringInterval) {
        clearInterval(windowMonitoringInterval);
    }
});