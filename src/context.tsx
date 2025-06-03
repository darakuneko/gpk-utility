import React from 'react'
import {createContext, useContext, useEffect, useReducer, useRef, useState} from 'react'

interface Device {
    id: string;
    config: Record<string, any>;
}

interface AppState {
    init: boolean;
    devices: Device[];
    activeWindow: string[];
}

interface StateContextValue {
    state: AppState;
    setState: (obj: Partial<AppState>) => void;
    updateDeviceConfig: (deviceId: string, configUpdates: Record<string, any>) => void;
    dispatch: React.Dispatch<any>;
}

const stateContext = createContext<StateContextValue | null>(null)
const deviceTypeContext = createContext<any>(null)

const ACTION_TYPES = {
    SET_DEVICES: 'SET_DEVICES',
    UPDATE_DEVICE_CONFIG: 'UPDATE_DEVICE_CONFIG',
    SET_ACTIVE_WINDOW: 'SET_ACTIVE_WINDOW',
    SET_INIT: 'SET_INIT'
}

const initialState: AppState = {
    init: true,
    devices: [],
    activeWindow: []
};

// Implementation of reducer
const reducer = (state: AppState, action: any): AppState => {
    switch (action.type) {
        case ACTION_TYPES.SET_DEVICES:
            return {
                ...state,
                devices: Array.isArray(action.payload) ? action.payload : state.devices
            };
            
        case ACTION_TYPES.UPDATE_DEVICE_CONFIG: {
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
        }
            
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

export function useStateContext(): StateContextValue {
    const context = useContext(stateContext);
    if (!context) {
        throw new Error('useStateContext must be used within a StateProvider');
    }
    return context;
}

export function useDeviceType(): any {
    return useContext(deviceTypeContext);
}

export function StateProvider({children}: {children: React.ReactNode}) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const stateRef = useRef(state);
    const prevStateRef = useRef<Partial<AppState>>({});
    
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Modified setState implementation
    const setState = (obj: Partial<AppState>) => {
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
    const updateDeviceConfig = (deviceId: string, configUpdates: Record<string, any>) => {
        const deviceIndex = state.devices.findIndex(d => d.id === deviceId);
        if (deviceIndex === -1) return;
        
        const device = state.devices[deviceIndex];
        if (!device) return;
        
        const updatedConfig = { ...device.config, ...configUpdates, changed: true };
        
        dispatch({
            type: ACTION_TYPES.UPDATE_DEVICE_CONFIG,
            payload: { deviceId, config: updatedConfig }
        });
    };

    const value: StateContextValue = {
        state,
        setState,
        updateDeviceConfig,
        dispatch
    };

    return (
        <stateContext.Provider value={value}>{children}</stateContext.Provider>
    );
}

// DeviceType Provider to cache device types
export function DeviceTypeProvider({ children }: {children: React.ReactNode}) {
    const [deviceType, setDeviceType] = useState<any>(null);
    
    useEffect(() => {
        const initDeviceType = async () => {
            try {
                if (window.api && (window.api as any).getDeviceType) {
                    const types = await (window.api as any).getDeviceType();
                    setDeviceType(types);
                }
            } catch (error) {
                console.error("Failed to initialize DeviceType:", error);
            }
        };
        
        void initDeviceType();
    }, []);
    
    return (
        <deviceTypeContext.Provider value={deviceType}>
            {children}
        </deviceTypeContext.Provider>
    );
}

// Combined provider that includes both state and device type contexts
export function AppProvider({ children }: {children: React.ReactNode}) {
    return (
        <DeviceTypeProvider>
            <StateProvider>
                {children}
            </StateProvider>
        </DeviceTypeProvider>
    );
}
