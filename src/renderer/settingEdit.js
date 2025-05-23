import React, { useState } from "react";
import { useStateContext } from "../context.js";
import { fullHapticOptions } from "../data/hapticOptions.js";
// Import setting components for each tab
import MouseSettings from "./settings/mouseSettings.js";
import ScrollSettings from "./settings/scrollSettings.js";
import DragDropSettings from "./settings/dragDropSettings.js";
import TimerSettings from "./settings/timerSettings.js";
import LayerSettings from "./settings/layerSettings.js";
import OLEDSettings from "./settings/OLEDSettings.js";
import GestureSettings from "./settings/gestureSettings.js";

const { api } = window;

const SettingEdit = ((props) => {
    const { state, setState } = useStateContext();
    const device = props.device;
    const [isSliderActive, setIsSliderActive] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({});
    
    // Get active tab from parent component
    const activeTab = props.activeTab || "mouse";

    const sendConfigToDevice = async (updatedDevice) => {
        try {
            // Determine which configuration type to update based on the active tab
            // Update only pomodoro settings for "timer" tab, otherwise update only trackpad settings
            const configType = activeTab === "timer" ? 'pomodoro' : 'trackpad';
            const updatedConfig = await api.dispatchSaveDeviceConfig(updatedDevice, configType);
            
            if (updatedConfig && updatedConfig.success) {
                const newState = {
                    ...state,
                    devices: state.devices.map(dev => {
                        if (dev.id === updatedDevice.id) {
                            return {
                                ...dev, 
                                config: {
                                    ...dev.config, 
                                    ...updatedConfig.config, 
                                    changed: false
                                }
                            };
                        }
                        return dev;
                    })
                };
                setState(newState);
                
                if (updatedConfig.config) {
                    window.requestAnimationFrame(() => {
                        const element = document.getElementById(`config-${Object.keys(updatedConfig.config)[0]}`);
                        if (element) element.dispatchEvent(new Event('update'));
                    });
                }
                
                return updatedConfig.config;
            }
        } catch (error) {
        }
    };

    const handleChange = (pType, id) => async (event) => {
        // Create a new array to ensure immutability
        const updatedDevices = await Promise.all(state.devices.map(async (d) => {
            if(d.id === id) {
                // Create a new object to avoid modifying the original device
                const updatedDevice = {...d};
                // Initialize config if it doesn't exist
                updatedDevice.config = updatedDevice.config || {};
                
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
                        updatedDevice.config.pomodoro[actualProp] = newValue;
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
                        updatedDevice.config.trackpad[pType] = newValue;
                    } else {
                        // Other settings (top-level properties like init)
                        updatedDevice.config[pType] = newValue;
                    }
                    
                    // Set changed flag
                    updatedDevice.config.changed = true;
                    
                    // Update UI state first
                    const newState = {
                        ...state,
                        devices: state.devices.map(dev => dev.id === id ? updatedDevice : dev)
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
                } catch (error) {
                    // Add state updates for UI error display if needed
                    return d; // Return original device state in case of error
                }
                
                return updatedDevice;
            }
            return d;
        }));
    }

    const handleSliderStart = () => {
        setIsSliderActive(true);
        api.setSliderActive(true);
    };

    const handleSliderEnd = () => {
        setIsSliderActive(false);
        api.setSliderActive(false);
        
        if (pendingChanges.device) {
            sendConfigToDevice(pendingChanges.device);
            setPendingChanges({});
        }
    };

    const formatTime = (minutes, seconds) => {
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
                                handleChange={handleChange}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                            />
                        )}

                        {/* Layer Settings */}
                        {activeTab === "layer" && (
                            <LayerSettings
                                device={device}
                                handleChange={handleChange}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
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
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                            />
                        )}

                        {/* Timer Settings */}
                        {activeTab === "timer" && (
                            <TimerSettings
                                device={device}
                                handleChange={handleChange}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                                fullHapticOptions={fullHapticOptions}
                                formatTime={formatTime}
                            />
                        )}

                        {/* OLED Settings */}
                        {activeTab === "oled" && (
                            <OLEDSettings
                                device={device}
                                handleChange={handleChange}
                                handleSliderStart={handleSliderStart}
                                handleSliderEnd={handleSliderEnd}
                            />
                        )}

                        {/* Gesture Settings */}
                        {activeTab === "gesture" && (
                            <GestureSettings
                                device={device}
                                handleChange={handleChange}
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
