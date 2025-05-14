import React from 'react'
import {createContext, useContext, useEffect, useReducer, useRef} from 'react'

const stateContext = createContext({})

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
            const { deviceId, config } = action.payload;
            return {
                ...state,
                devices: state.devices.map(device => 
                    device.id === deviceId 
                        ? { 
                            ...device, 
                            config: { ...config },
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
    const prevStateRef = useRef({});
    
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Modified setState implementation
    const setState = (obj) => {
        if (!obj) {
            return;
        }
        
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
