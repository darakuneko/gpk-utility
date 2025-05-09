import React from 'react'
import {createContext, useState, useContext, useEffect, useReducer, useRef} from 'react'

const stateContext = createContext({})
const api = window.api;

const ACTION_TYPES = {
    SET_DEVICES: 'SET_DEVICES',
    UPDATE_DEVICE_CONFIG: 'UPDATE_DEVICE_CONFIG',
    SET_ACTIVE_WINDOW: 'SET_ACTIVE_WINDOW',
    SET_INIT: 'SET_INIT'
}

const initialState = {
    init: true,
    devices: [],
    activeWindow: []
};

// Implementation of reducer
const reducer = (state, action) => {
    switch (action.type) {
        case ACTION_TYPES.SET_DEVICES:
            return {
                ...state,
                devices: Array.isArray(action.payload) ? action.payload : state.devices
            };
            
        case ACTION_TYPES.UPDATE_DEVICE_CONFIG:
            const { deviceId, config, identifier } = action.payload;
            return {
                ...state,
                devices: state.devices.map(device => 
                    device.id === deviceId 
                        ? { 
                            ...device, 
                            config: { ...config },
                            ...(identifier ? { identifier } : {})
                        } 
                        : device
                )
            };
            
        case ACTION_TYPES.SET_ACTIVE_WINDOW:
            return {
                ...state,
                activeWindow: action.payload
            };
            
        case ACTION_TYPES.SET_INIT:
            return {
                ...state,
                init: action.payload
            };
            
        default:
            return state;
    }
};

export function useStateContext() {
    return useContext(stateContext)
}

export function StateProvider({children}) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const stateRef = useRef(state);
    const deviceInitAttempts = useRef(0);
    const maxInitAttempts = 5;
    const lastDevicesRef = useRef([]);
    const pendingUpdatesRef = useRef(false);
    const apiSyncTimeoutRef = useRef(null);
    const prevStateRef = useRef({});
    
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Initial device retrieval from API
    useEffect(() => {
        const initState = async () => {
            try {
                if (!api) {
                    dispatch({ type: ACTION_TYPES.SET_INIT, payload: false });
                    return;
                }
                
                const initialDevices = await api.keyboardSendLoop();
                
                if (Array.isArray(initialDevices) && initialDevices.length > 0) {
                    lastDevicesRef.current = JSON.parse(JSON.stringify(initialDevices));
                    dispatch({ type: ACTION_TYPES.SET_DEVICES, payload: initialDevices });
                    dispatch({ type: ACTION_TYPES.SET_INIT, payload: false });
                } else {
                    if (deviceInitAttempts.current < maxInitAttempts) {
                        deviceInitAttempts.current += 1;
                        setTimeout(initState, 500);
                    } else {
                        dispatch({ type: ACTION_TYPES.SET_INIT, payload: false });
                    }
                }
            } catch (error) {
                dispatch({ type: ACTION_TYPES.SET_INIT, payload: false });
            }
        };
        
        initState();
        
        // changeConnectDevice event handler
        const handleDeviceChange = (devices) => {
            if (Array.isArray(devices)) {
                lastDevicesRef.current = JSON.parse(JSON.stringify(devices));
                dispatch({ type: ACTION_TYPES.SET_DEVICES, payload: devices });
            }
        };
        
        if (api && api.on) {
            api.on("changeConnectDevice", handleDeviceChange);
        }
        
        // Set up periodic synchronization with API
        const syncInterval = setInterval(() => {
            if (pendingUpdatesRef.current && api && api.setConnectDevices) {
                pendingUpdatesRef.current = false;
                api.setConnectDevices(stateRef.current.devices).catch(err => {
                });
            }
        }, 500);
        
        // Cleanup
        return () => {
            if (api && api.off) {
                api.off("changeConnectDevice", handleDeviceChange);
            }
            
            if (apiSyncTimeoutRef.current) {
                clearTimeout(apiSyncTimeoutRef.current);
            }
            
            clearInterval(syncInterval);
        };
    }, []);
    
    // Create custom handler to batch process state changes
    useEffect(() => {
        const currentJSON = JSON.stringify(state.devices);
        const lastJSON = JSON.stringify(lastDevicesRef.current);
        
        // Only set flag if state has changed and update is not from API
        if (currentJSON !== lastJSON) {
            pendingUpdatesRef.current = true;
            
            // Deep copy to save latest state
            lastDevicesRef.current = JSON.parse(currentJSON);
        }
    }, [state.devices]);

    // Modified setState implementation
    const setState = (obj) => {
        if (!obj) return;
        
        // Only dispatch if there are changes
        if (obj.init !== undefined && obj.init !== prevStateRef.current.init) {
            prevStateRef.current.init = obj.init;
            dispatch({ type: ACTION_TYPES.SET_INIT, payload: obj.init });
        }
        
        if (Array.isArray(obj.devices) && JSON.stringify(obj.devices) !== JSON.stringify(prevStateRef.current.devices)) {
            prevStateRef.current.devices = [...obj.devices];
            dispatch({ type: ACTION_TYPES.SET_DEVICES, payload: obj.devices });
        }
        
        if (Array.isArray(obj.activeWindow) && JSON.stringify(obj.activeWindow) !== JSON.stringify(prevStateRef.current.activeWindow)) {
            prevStateRef.current.activeWindow = [...obj.activeWindow];
            dispatch({ type: ACTION_TYPES.SET_ACTIVE_WINDOW, payload: obj.activeWindow });
        }
    };

    // Helper function for device config updates (for slider and other settings)
    const updateDeviceConfig = (deviceId, configUpdates) => {
        const deviceIndex = state.devices.findIndex(d => d.id === deviceId);
        if (deviceIndex === -1) return;
        
        const device = state.devices[deviceIndex];
        const updatedConfig = { ...device.config, ...configUpdates, changed: true };
        
        dispatch({
            type: ACTION_TYPES.UPDATE_DEVICE_CONFIG,
            payload: { deviceId, config: updatedConfig }
        });
    };

    const value = {
        state,
        setState,
        updateDeviceConfig,
        dispatch
    };

    return (
        <stateContext.Provider value={value}>{children}</stateContext.Provider>
    );
}
