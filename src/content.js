import React, {useEffect, useState, useRef, useCallback} from 'react'
import Setting from "./renderer/setting.js"
import {useStateContext} from "./context.js"

const api = window.api;
const hasApi = !!api;

const Content = () => {
    const {state, setState} = useStateContext()
    const [apiError, setApiError] = useState(false);
    const stateRef = useRef(state);
    const attemptCountRef = useRef(0);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const fetchDevices = useCallback(async () => {
        if (!hasApi) return null;
        
        try {
            const devices = await api.keyboardSendLoop();
            return devices;
        } catch (error) {
            return null;
        }
    }, []);

    useEffect(() => {
        const initDevices = async () => {
            if (!hasApi) {
                setApiError(true);
                setState({
                    init: false,
                    devices: []
                });
                return;
            }

            try {
                const devices = await fetchDevices();
                
                if (Array.isArray(devices)) {
                    const connectedDevices = devices.filter(d => d.connected);
                    
                    setState({
                        init: false,
                        devices: devices
                    });
                    
                    if (connectedDevices.length === 0 && attemptCountRef.current < 3) {
                        attemptCountRef.current++;
                        setTimeout(initDevices, 500);
                    }
                } else {
                    setState({
                        init: false,
                        devices: []
                    });
                }
            } catch (error) {
                setApiError(true);
                setState({
                    init: false,
                    devices: []
                });
            }
        };
        
        initDevices();
    }, [setState, fetchDevices]);

    useEffect(() => {
        let isMounted = true;
        let failCount = 0;
        
        const checkDevices = async () => {
            if (!hasApi || !isMounted) return;
            
            try {
                const updatedDevices = await fetchDevices();
                
                if (!isMounted) return;
                
                if (Array.isArray(updatedDevices)) {
                    const currentDevices = stateRef.current.devices || [];
                    const hasChanges = JSON.stringify(updatedDevices) !== JSON.stringify(currentDevices);
                    
                    if (hasChanges) {
                        setState(prev => ({
                            ...prev,
                            devices: updatedDevices
                        }));
                    }
                    
                    failCount = 0;
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }
        };
        
        const intervalId = setInterval(checkDevices, 1000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [setState, fetchDevices]);

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
        
        api.startWindowMonitoring();
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
                <Setting/>
                <div className="pt-2 text-text-primary dark:text-text-secondary text-sm">
                    Do not connect while using VIAL
                </div>
            </div>
        </div>
    )
}

export default Content
