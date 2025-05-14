import React, {useEffect, useState, useRef} from 'react'
import SettingsContainer from "./renderer/SettingsContainer.js"
import {useStateContext} from "./context.js"

const api = window.api;
const hasApi = !!api;

const Content = () => {
    const {state, setState} = useStateContext()
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        if (!hasApi) return;
        
        const handleDeviceChange = (dat) => {
            if (!dat || !Array.isArray(dat)) return;
            
            setState(prev => ({
                ...prev,
                init: false,
                devices: dat
            }));
        };

        api.on("changeConnectDevice", handleDeviceChange);
        
        return () => {
            if (api.off) {
                api.off("changeConnectDevice", handleDeviceChange);
            }
        };
    }, [setState]);

    useEffect(() => {
        if (!hasApi) return;
        
        const handleActiveWindow = async (dat) => {
            if (!dat) return;
            
            setState(prev => {
                if (!prev.activeWindow.includes(dat)) {
                    const activeWindows = [...prev.activeWindow, dat];
                    if (activeWindows.length > 10) activeWindows.shift();
                    
                    return {
                        ...prev,
                        activeWindow: activeWindows
                    };
                }
                return prev;
            });
        };
        
        api.on("activeWindow", handleActiveWindow);
        
        return () => {
            if (api.off) {
                api.off("activeWindow", handleActiveWindow);
            }
        };
    }, [setState]);

    return (
        <div className="min-h-screen bg-background overflow-auto p-4">
            <div className="max-w-7xl mx-auto">
                <SettingsContainer/>
                <div className="pt-2 text-text-primary dark:text-text-secondary text-sm">
                    Do not connect while using VIAL
                </div>
            </div>
        </div>
    )
}

export default Content
