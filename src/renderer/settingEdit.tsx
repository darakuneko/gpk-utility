import React, { useState } from "react";
import type { JSX } from 'react';

import type { Device, DeviceConfig } from '../types/device';
import { useStateContext } from "../context.tsx";

// Import setting components for each tab
import MouseSettings from "./settings/mouseSettings.tsx";
import ScrollSettings from "./settings/scrollSettings.tsx";
import DragDropSettings from "./settings/dragDropSettings.tsx";
import TimerSettings from "./settings/timerSettings.tsx";
import LayerSettings from "./settings/layerSettings.tsx";
import OLEDSettings from "./settings/OLEDSettings.tsx";
import GestureSettings from "./settings/gestureSettings.tsx";
import HapticSettings from "./settings/hapticSettings.tsx";

const { api } = window;

interface SettingEditProps {
    device: Device;
    activeTab?: string;
    setActiveTab?: (tabId: string) => void;
}

const SettingEdit: React.FC<SettingEditProps> = ((props: SettingEditProps): JSX.Element => {
    const { state, setState } = useStateContext();
    const device = props.device;
    const [isSliderActive, setIsSliderActive] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<{ device?: Device; pType?: string }>({});
    
    // Get active tab from parent component
    const activeTab = props.activeTab || "mouse";

    const sendConfigToDevice = async (updatedDevice: Device): Promise<DeviceConfig | undefined> => {
        try {
            // Determine which configuration type to update based on the active tab
            // Update only pomodoro settings for "timer" tab, otherwise update only trackpad settings
            const configTypes = activeTab === "timer" ? ["pomodoro"] : ["trackpad"];
            const updatedConfig = await api.dispatchSaveDeviceConfig(updatedDevice, configTypes);
            
            if (updatedConfig && updatedConfig.success && updatedConfig.config) {
                const newState = {
                    ...state,
                    devices: state.devices.map((dev): Device => {
                        if (dev.id === updatedDevice.id) {
                            return {
                                ...dev, 
                                config: {
                                    ...dev.config, 
                                    ...updatedConfig.config
                                } as DeviceConfig
                            };
                        }
                        return dev;
                    })
                };
                setState(newState);
                
                if (updatedConfig.config) {
                    window.requestAnimationFrame((): void => {
                        const element = document.getElementById(`config-${Object.keys(updatedConfig.config!)[0]}`);
                        if (element) element.dispatchEvent(new Event('update'));
                    });
                }
                
                return updatedConfig.config;
            }
        } catch {
            // Ignore config processing errors - return original config
        }
        return undefined;
    };

    // Main handleChange for input elements
    const handleChange = (pType: string, id: string): ((event: React.ChangeEvent<HTMLInputElement>) => Promise<void>) => async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        // Create a new array to ensure immutability
        const _updatedDevices = await Promise.all(state.devices.map(async (d): Promise<Device> => {
            if(d.id === id) {
                // Create a new object to avoid modifying the original device
                const updatedDevice = {...d};
                // Initialize config if it doesn't exist
                updatedDevice.config = updatedDevice.config || { pomodoro: {}, trackpad: {} } as DeviceConfig;
                
                let newValue;
                // Set strict values according to type
                try {
                    if(pType === "can_hf_for_layer" || pType === "can_drag" || 
                        pType === "can_trackpad_layer" || pType === "can_reverse_scrolling_direction" || 
                        pType === "can_short_scroll") {
                        // For switches, set integer value 0 or 1
                        newValue = event.target.checked ? 1 : 0;
                    } else if(pType === "default_speed") {
                        // For speed settings, multiply by 10 to get integer
                        const rawValue = event.target.value;
                        if (rawValue === undefined || rawValue === null || rawValue === "") {
                            throw new Error(`Invalid value for ${pType}: ${rawValue}`);
                        }
                        newValue = Math.round(parseFloat(rawValue) * 10);
                    } else {
                        // For other values, convert to integer, eliminate possibility of NaN or undefined
                        const rawValue = event.target.value;
                        if (rawValue === undefined || rawValue === null || rawValue === "") {
                            throw new Error(`Invalid value for ${pType}: ${rawValue}`);
                        }
                        newValue = parseInt(rawValue, 10);
                        if (isNaN(newValue)) {
                            throw new Error(`Cannot convert ${pType} to a number: ${rawValue}`);
                        }
                    }
                    
                    // Range check (add as needed)
                    if (pType === "drag_strength" && (newValue < 1 || newValue > 12)) {
                        throw new Error(`Value for drag_strength must be in range 1-12: ${newValue}`);
                    }
                    // Additional range checks can be added here
                    
                    // Update value based on property type
                    if (pType.startsWith('pomodoro_')) {
                        // Pomodoro related settings - remove the pomodoro_ prefix to get the actual property name
                        const actualProp = pType.replace('pomodoro_', '');
                        if (updatedDevice.config && updatedDevice.config.pomodoro) {
                            (updatedDevice.config.pomodoro as Record<string, number | boolean>)[actualProp] = newValue;
                        }
                    } else if (pType === "can_hf_for_layer" || pType === "can_drag" || 
                              pType === "can_trackpad_layer" || pType === "can_reverse_scrolling_direction" || 
                              pType === "can_short_scroll" || pType === "default_speed" || 
                              pType === "drag_strength" || pType === "drag_strength_mode" ||
                              pType === "scroll_term" || pType === "drag_term" || 
                              pType === "tap_term" || pType === "swipe_term" || 
                              pType === "pinch_term" || pType === "pinch_distance" || pType === "gesture_term" || 
                              pType === "short_scroll_term" || pType === "scroll_step" ||
                              pType === "hf_waveform_number") {
                        // Trackpad related settings
                        if (updatedDevice.config && updatedDevice.config.trackpad) {
                            (updatedDevice.config.trackpad as Record<string, number>)[pType] = newValue;
                        }
                    } else {
                        // Other settings (top-level properties like init)
                        if (updatedDevice.config) {
                            const configWithIndex = updatedDevice.config as DeviceConfig & { [key: string]: number };
                            configWithIndex[pType] = newValue;
                        }
                    }
                    
                    // Set changed flag
                    if (updatedDevice.config) {
                        (updatedDevice.config as DeviceConfig & { changed?: boolean }).changed = true;
                    }
                    
                    // Update UI state first
                    const newState = {
                        ...state,
                        devices: state.devices.map((dev): Device => dev.id === id ? updatedDevice : dev)
                    };
                    setState(newState);
                    
                    // For switch operations, apply immediately; for slider operations during movement, hold pending
                    if (pType === "can_hf_for_layer" || pType === "can_drag" || 
                        pType === "can_trackpad_layer" || pType === "can_reverse_scrolling_direction" || 
                        pType === "can_short_scroll") {
                        // Send switches immediately
                        await sendConfigToDevice(updatedDevice);
                    } else if (isSliderActive) {
                        // During slider operation, only store the setting value without sending
                        // Store the device and setting value being operated
                        setPendingChanges({
                            device: updatedDevice,
                            pType: pType
                        });
                    } else {
                        // For normal operations (non-slider or not during slider operation), send immediately
                        await sendConfigToDevice(updatedDevice);
                    }
                } catch {
                    // Add state updates for UI error display if needed
                    return d; // Return original device state in case of error
                }
                
                return updatedDevice;
            }
            return d;
        }));
    }

    const handleSliderStart = (): void => {
        setIsSliderActive(true);
        api.setSliderActive(device.id, true);
    };

    const handleSliderEnd = (): void => {
        setIsSliderActive(false);
        api.setSliderActive(device.id, false);
        
        if (pendingChanges.device && typeof pendingChanges.device === 'object' && 'id' in pendingChanges.device) {
            void sendConfigToDevice(pendingChanges.device as Device);
            setPendingChanges({});
        }
    };

    // Alternative handleChange for select/mixed elements (timer settings)
    const handleChangeSelect = (pType: string, id: string): ((event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const inputEvent = event as React.ChangeEvent<HTMLInputElement>;
        void handleChange(pType, id)(inputEvent);
    };

    // Alternative handleChange for value target elements (OLED, dragDrop, gesture, haptic settings)
    const handleChangeValue = (pType: string, id: string): ((e: { target: { value: string | number } }) => Promise<void>) => async (e: { target: { value: string | number } }): Promise<void> => {
        // Convert to standard ChangeEvent format
        const syntheticEvent = {
            target: {
                value: String(e.target.value),
                type: 'range'
            }
        } as React.ChangeEvent<HTMLInputElement>;
        return handleChange(pType, id)(syntheticEvent);
    };

    const formatTime = (minutes: number, seconds: number): string => {
        const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
        const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
        return `${formattedMinutes}:${formattedSeconds}`;
    };

    return (
        <div key={`${device.id}`} className="pb-4">
            {device.config && device.connected && (
                <div className="flex flex-col justify-center max-w-[1200px]">
                    <div className="p-2">
                        {/* Mouse Settings */}
                        {activeTab === "mouse" && (
                            <MouseSettings
                                device={device}
                                handleChange={handleChangeValue}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                            />
                        )}

                        {/* Layer Settings */}
                        {activeTab === "layer" && (
                            <LayerSettings
                                device={device}
                            />
                        )}

                        {/* Scroll Settings */}
                        {activeTab === "scroll" && (
                            <ScrollSettings
                                device={device}
                                handleChange={handleChange}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                            />
                        )}

                        {/* Drag & Drop Settings */}
                        {activeTab === "dragdrop" && (
                            <DragDropSettings
                                device={device}
                                handleChange={handleChange}
                                handleChangeValue={handleChangeValue}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                            />
                        )}

                        {/* Timer Settings */}
                        {activeTab === "timer" && (
                            <TimerSettings
                                device={device}
                                handleChange={handleChangeSelect}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                                formatTime={formatTime}
                            />
                        )}

                        {/* OLED Settings */}
                        {activeTab === "oled" && (
                            <OLEDSettings
                                device={device}
                                handleChange={handleChange}
                            />
                        )}

                        {/* Gesture Settings */}
                        {activeTab === "gesture" && (
                            <GestureSettings
                                device={device}
                                handleChange={handleChangeValue}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                            />
                        )}

                        {/* Haptic Settings */}
                        {activeTab === "haptic" && (
                            <HapticSettings
                                device={device}
                                handleChange={handleChange}
                                handleChangeValue={handleChangeValue}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
});

export default SettingEdit;
