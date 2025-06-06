import { loadStoreSettings, saveStoreSetting, startKeyboardPolling, startWindowMonitoring, cachedStoreSettings } from './preload/core';
import { keyboardSendLoop, command } from './preload/device';
import { setupEventListeners } from './preload/events';
import { exposeAPI } from './preload/api';
import type { NotificationData } from './src/types/notification';

// Initialize polling and settings when the window is loaded
document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
    try {
        await loadStoreSettings();
        
        // Start keyboard polling with the imported function
        startKeyboardPolling(keyboardSendLoop);
        
        // Start window monitoring with the command from device module
        startWindowMonitoring(async (): Promise<void> => {
            await command.startWindowMonitoring();
        });
        
        const result = await command.getNotifications();
        const latestNotification = result?.notifications[0] || {} as Record<string, unknown>;
        const savedNotifications = cachedStoreSettings?.savedNotifications || [];

        if (latestNotification?.id) {
            const isDifferent = !savedNotifications.length || !savedNotifications.some((n: { id: unknown }): boolean => n.id === latestNotification.id);
            if (isDifferent) {       
                await saveStoreSetting('savedNotifications', result.notifications as NotificationData[]);
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
window.addEventListener('restartPollingIntervals', (): void => {
    startKeyboardPolling(keyboardSendLoop);
    startWindowMonitoring(async (): Promise<void> => {
        await command.startWindowMonitoring();
    });
});

// Setup event listeners once when the script loads
setupEventListeners();

// Expose the API to the renderer process
exposeAPI();

// Cleanup handlers
process.on('exit', (): void => {
    // Dynamic require is necessary here for cleanup during process exit
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { keyboardPollingInterval, windowMonitoringInterval } = require('./preload/core');
    if (keyboardPollingInterval) {
        clearInterval(keyboardPollingInterval);
    }
    if (windowMonitoringInterval) {
        clearInterval(windowMonitoringInterval);
    }
});