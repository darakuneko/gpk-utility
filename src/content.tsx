import React, {useEffect, useState, useCallback, useRef} from 'react'
import type { JSX } from 'react';

import SettingsContainer from "./renderer/SettingsContainer.tsx"
import {useStateContext} from "./context.tsx"
import type { Device } from "./types/device"

interface SaveStatus {
    visible: boolean;
    success: boolean;
    timestamp: number | null;
    isApply?: boolean;
    pending?: boolean;
}

const api = window.api;
const hasApi = !!api;

const Content: React.FC = (): JSX.Element => {
    const {state, setState} = useStateContext();
    const stateRef = useRef(state);

    useEffect((): void => {
        stateRef.current = state;
    }, [state]);

    useEffect((): (() => void) | void => {
        if (!hasApi) return;
        
        const handleDeviceChange = (devices: Device[]): void => {
            if (!devices || !Array.isArray(devices)) return;

            setState({
                init: false,
                devices: devices
            });
        };

        api.on("changeConnectDevice", handleDeviceChange);
        
        return (): void => {
            api.off("changeConnectDevice", handleDeviceChange);
        };
    }, []);

    const handleActiveWindow = useCallback((dat: string): void => {
        if (!dat) return;
    
        const currentState = stateRef.current;
        if (!currentState.activeWindow.includes(dat)) {
            const activeWindows = [...currentState.activeWindow, dat];
            if (activeWindows.length > 10) activeWindows.shift();
            
            setState({
                activeWindow: activeWindows
            });
        }
    }, [setState])

    useEffect((): (() => void) | void => {
            if (!hasApi) return;

        api.on("activeWindow", (windowInfo: string): void => {
            handleActiveWindow(windowInfo);
        });
        return (): void => {
            api.off("activeWindow", (windowInfo: string): void => {
                handleActiveWindow(windowInfo);
            });
        };
    }, []);

    // Monitor config save completion event
    const [saveStatus, setSaveStatus] = useState<SaveStatus>({
        visible: false,
        success: false,
        timestamp: null
    });

    useEffect((): void => {
        if (!hasApi || !api.onConfigSaveComplete) return;
        
        api.onConfigSaveComplete(({ success, timestamp, isApply, pending }: { success: boolean; timestamp: number; isApply?: boolean; pending?: boolean }): void => {
            // Ignore updates within 500ms of the previous notification to prevent continuous notifications.
            // A pending (in-progress) update always shows so the apply flow stays visible.
            if (!pending && saveStatus.timestamp && timestamp - saveStatus.timestamp < 500) {
                return;
            }

            setSaveStatus({
                visible: true,
                success,
                timestamp,
                isApply: isApply ?? false,
                pending: pending ?? false
            });

            // Keep a pending state visible until the final result arrives.
            if (!pending) {
                setTimeout((): void => {
                    setSaveStatus((prev): SaveStatus => ({ ...prev, visible: false }));
                }, 3000);
            }
        });
    }, []);

    return (
        <div className="min-h-screen bg-background overflow-auto p-4">
            <div className="max-w-7xl mx-auto">
                <SettingsContainer saveStatus={saveStatus} />
            </div>
        </div>
    )
}

export default Content
