import React, { useState, useEffect, useMemo } from "react";
import type { JSX } from 'react';
import { SketchPicker } from 'react-color';
import type { ColorResult } from 'react-color';

import { useLanguage } from "../../i18n/LanguageContext.tsx";
import type { Device, RgbColor } from "../../types/device";

// Color constants
const DEFAULT_COLORS = {
  BLACK: { r: 0, g: 0, b: 0 },
  RED: { r: 255, g: 0, b: 0 },
  GREEN: { r: 0, g: 255, b: 0 },
  BLUE: { r: 0, g: 0, b: 255 }
} as const;

// CSS class constants
const CSS_CLASSES = {
  MAIN_HEADER: "text-md font-medium mb-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1",
  SUB_HEADER: "text-sm font-medium text-gray-900 dark:text-white mb-2 border-b border-gray-100 dark:border-gray-600 pb-1",
  DESCRIPTION: "text-xs text-gray-600 dark:text-gray-400 mb-3",
  CONTAINER: "w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-xs"
} as const;

interface LedSettingsProps {
  device: Device;
  handleChange: (pType: string, id: string) => ((event: React.ChangeEvent<HTMLInputElement>) => Promise<void>);
}

interface RgbInputProps {
  label: string;
  value: RgbColor;
  onChange: (color: RgbColor) => void;
  layerId?: number; // Layer ID for layer switching when opening color picker
  device?: Device; // Device object for layer switching
  field?: string; // Field name for handleChange
  handleChange?: (pType: string, id: string) => ((event: React.ChangeEvent<HTMLInputElement>) => Promise<void>);
  deviceId?: string;
}


// Helper function to switch device layers
const switchToLayer = async (device: Device | undefined, layerId: number | undefined, targetLayer: number): Promise<void> => {
  if (device && typeof layerId === 'number') {
    try {
      await window.api.switchLayer(device, targetLayer);
    } catch (error) {
      console.error(`Failed to switch to layer ${targetLayer}:`, error);
    }
  }
};

// Helper function to close color picker and switch to layer 0
const closeColorPickerAndSwitchToDefaultLayer = async (
  device: Device | undefined, 
  layerId: number | undefined, 
  setShowColorPicker: (show: boolean) => void
): Promise<void> => {
  // Only switch to layer 0 if this is a layer color picker (layerId is defined)
  if (typeof layerId === 'number') {
    await switchToLayer(device, layerId, 0);
  }
  setShowColorPicker(false);
};

// Utility function to create default layer configuration
const createDefaultLayers = (layerCount: number): Array<{ layer_id: number; r: number; g: number; b: number }> => {
  const defaultLayers = [];
  for (let i = 0; i < layerCount; i++) {
    defaultLayers.push({
      layer_id: i,
      r: i === 0 ? 255 : (i * 50) % 255,
      g: i === 1 ? 255 : (i * 80) % 255,
      b: i === 2 ? 255 : (i * 120) % 255
    });
  }
  return defaultLayers;
};

// RGB Input Component with React Color
const RgbInput: React.FC<RgbInputProps> = ({ label, value, onChange, layerId, device, field, handleChange: propHandleChange, deviceId }): JSX.Element => {
  const { t } = useLanguage();
  const [localColor, setLocalColor] = useState<RgbColor>(value || DEFAULT_COLORS.BLACK);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [pickerPosition, setPickerPosition] = useState<'bottom' | 'top'>('bottom');
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  useEffect((): void => {
    setLocalColor(value || DEFAULT_COLORS.BLACK);
  }, [value]);

  // Calculate optimal picker position
  const calculatePickerPosition = (): void => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const pickerHeight = 420;
    const margin = 20; // Additional margin for safety
    const spaceBelow = windowHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    
    if (spaceBelow >= pickerHeight) {
      setPickerPosition('bottom');
    } else if (spaceAbove >= pickerHeight) {
      setPickerPosition('top');
    } else {
      setPickerPosition(spaceBelow > spaceAbove ? 'bottom' : 'top');
    }
  };

  // Handle window resize to recalculate position
  useEffect((): (() => void) => {
    if (!showColorPicker) return (): void => {};

    // Initial position calculation when picker opens
    calculatePickerPosition();

    const handleResize = (): void => {
      calculatePickerPosition();
    };

    const handleScroll = (): void => {
      calculatePickerPosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true); // Use capture phase
    document.addEventListener('scroll', handleScroll, true);
    
    return (): void => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [showColorPicker]);

  // Recalculate position when picker is shown
  useEffect((): void => {
    if (showColorPicker) {
      // Use RAF to ensure DOM has updated
      requestAnimationFrame((): void => {
        calculatePickerPosition();
      });
    }
  }, [showColorPicker]);

  const handleColorPickerChange = async (color: ColorResult): Promise<void> => {
    const newColor: RgbColor = {
      r: Math.round(color.rgb.r),
      g: Math.round(color.rgb.g),
      b: Math.round(color.rgb.b)
    };
    
    setLocalColor(newColor);
    
    // Use handleChange if provided (for LED settings), otherwise use onChange (for layers)
    if (field && propHandleChange && deviceId) {
      const syntheticEvent = {
        target: {
          value: JSON.stringify(newColor)
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      await propHandleChange(field, deviceId)(syntheticEvent);
    } else {
      onChange(newColor);
    }
  };


  const hexColor = `#${localColor.r.toString(16).padStart(2, '0')}${localColor.g.toString(16).padStart(2, '0')}${localColor.b.toString(16).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Label */}
      <label className="text-sm font-medium text-gray-900 dark:text-white text-center">
        {label}
      </label>
      
      {/* Color Preview & Picker Button */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors shadow-sm hover:shadow-md dark:shadow-gray-800/50"
          style={{ backgroundColor: hexColor }}
          onClick={async (): Promise<void> => {
            if (!showColorPicker) {
              calculatePickerPosition();
              if (typeof layerId === 'number') {
                await switchToLayer(device, layerId, layerId);
              }
              setShowColorPicker(true);
            } else {
              await closeColorPickerAndSwitchToDefaultLayer(device, layerId, setShowColorPicker);
            }
          }}
          title={t('led.clickToOpenColorPicker') || 'Click to open color picker'}
        />

        {/* Color Picker */}
        {showColorPicker && (
          <div>
            <div 
              className="fixed inset-0 z-10" 
              onClick={async (): Promise<void> => {
                await closeColorPickerAndSwitchToDefaultLayer(device, layerId, setShowColorPicker);
              }}
            />
            <div 
              className={`fixed z-20 transform -translate-x-1/2 ${
                pickerPosition === 'bottom' 
                  ? 'top-full mt-2' 
                  : 'bottom-full mb-2'
              }`}
              style={{
                left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left + buttonRef.current.offsetWidth / 2 : '50%',
                top: pickerPosition === 'bottom' 
                  ? (buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 'auto')
                  : 'auto',
                bottom: pickerPosition === 'top' 
                  ? (buttonRef.current ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 8 : 'auto')
                  : 'auto'
              }}
            >
              <div className="color-picker-wrapper">
                <SketchPicker
                  color={localColor}
                  onChange={handleColorPickerChange}
                  disableAlpha={true}
                  presetColors={[
                    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
                    '#FF00FF', '#00FFFF', '#FFFFFF', '#000000',
                    '#FFA500', '#800080', '#FFC0CB', '#A52A2A',
                    '#808080', '#008000'
                  ]}
                  className="sketch-picker"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
};

const LedSettings: React.FC<LedSettingsProps> = ({ device, handleChange }): JSX.Element => {
  const { t } = useLanguage();
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  
  // Check if device supports LED configuration
  const isLedDevice = device.deviceType === 'macropad_tp' || 
                     device.deviceType === 'macropad_tp_btns' || 
                     device.deviceType === 'keyboard_tp';
  
  // Initialize LED config if it doesn't exist
  useEffect((): void => {
    if (device && device.config && !device.config.led && isLedDevice) {
      device.config.led = {
        enabled: 1,
        mouse_speed_accel: DEFAULT_COLORS.RED,
        scroll_step_accel: DEFAULT_COLORS.GREEN,
        pomodoro: {
          work: DEFAULT_COLORS.RED,
          break: DEFAULT_COLORS.GREEN,
          long_break: DEFAULT_COLORS.BLUE
        },
        layers: []
      };
    }
  }, [device, isLedDevice]);

  // Early return if device doesn't support LED or config is not available
  if (!isLedDevice || !device.config?.led) {
    return (
      <div className={CSS_CLASSES.CONTAINER}>
        <h4 className={CSS_CLASSES.MAIN_HEADER}>
          {t('led.title')}
        </h4>
        <div className="text-gray-600 dark:text-gray-400">
          LED settings are not available for this device or configuration is loading...
        </div>
      </div>
    );
  }

  // Ensure that the device's LED settings exist
  const ledConfig = device.config?.led || {};

  const handleLayerColorChange = (layerId: number, color: RgbColor): void => {
    if (device.config?.led?.layers) {
      const layerIndex = device.config.led.layers.findIndex((layer): boolean => layer.layer_id === layerId);
      if (layerIndex !== -1) {
        // Update device config directly
        device.config.led.layers[layerIndex] = {
          layer_id: layerId,
          ...color
        };
        
        // Use handleChange with synthetic event
        const syntheticEvent = {
          target: {
            value: JSON.stringify(color)
          }
        } as React.ChangeEvent<HTMLInputElement>;
        
        void handleChange(`led_layer_${layerId}`, device.id)(syntheticEvent);
        
        // Force UI update
        setForceUpdate((prev: number): number => prev + 1);
      }
    }
  };


  return (
    <div className={CSS_CLASSES.CONTAINER}>
      <h4 className={CSS_CLASSES.MAIN_HEADER}>
        {t('led.title')}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('led.rgbEffectSolidColorOnly')}
      </p>

      {/* Speed Indicators */}
      <div className="flex flex-wrap gap-4 mb-4">
        <RgbInput
          key={`mouse-speed-${forceUpdate}`}
          label={t('led.mouseSpeedAccel')}
          value={ledConfig.mouse_speed_accel || DEFAULT_COLORS.RED}
          onChange={(): void => {}}
          field="led_mouse_speed_accel"
          handleChange={handleChange}
          deviceId={device.id}
        />
        <RgbInput
          key={`scroll-step-${forceUpdate}`}
          label={t('led.scrollStepAccel')}
          value={ledConfig.scroll_step_accel || DEFAULT_COLORS.GREEN}
          onChange={(): void => {}}
          field="led_scroll_step_accel"
          handleChange={handleChange}
          deviceId={device.id}
        />
      </div>

      {/* Pomodoro Settings */}
      <div className="mb-4">
        <h5 className={CSS_CLASSES.SUB_HEADER}>
          {t('led.pomodoro')}
        </h5>
        <p className={CSS_CLASSES.DESCRIPTION}>
          {t('led.pomodoroColorChangeDescription')}
        </p>
        
        <div className="flex flex-wrap gap-4">
          <RgbInput
            key={`pomodoro-work-${forceUpdate}`}
            label={t('led.work')}
            value={ledConfig.pomodoro?.work || DEFAULT_COLORS.RED}
            onChange={(): void => {}}
            field="led_pomodoro.work"
            handleChange={handleChange}
            deviceId={device.id}
          />
          
          <RgbInput
            key={`pomodoro-break-${forceUpdate}`}
            label={t('led.break')}
            value={ledConfig.pomodoro?.break || DEFAULT_COLORS.GREEN}
            onChange={(): void => {}}
            field="led_pomodoro.break"
            handleChange={handleChange}
            deviceId={device.id}
          />
          
          <RgbInput
            key={`pomodoro-long-break-${forceUpdate}`}
            label={t('led.longBreak')}
            value={ledConfig.pomodoro?.long_break || DEFAULT_COLORS.BLUE}
            onChange={(): void => {}}
            field="led_pomodoro.long_break"
            handleChange={handleChange}
            deviceId={device.id}
          />
        </div>
      </div>

      {/* Layer Settings */}
      <div className="mb-4">
        <h5 className={CSS_CLASSES.SUB_HEADER}>
          {t('led.layer')} {t('led.settings')}
        </h5>
        <p className={CSS_CLASSES.DESCRIPTION}>
          {t('led.layerColorPickerDescription')}
        </p>
        
        <LayerLedSettings
          device={device}
          ledConfig={ledConfig}
          onLayerColorChange={handleLayerColorChange}
          forceUpdate={forceUpdate}
          handleChange={handleChange}
        />
      </div>
    </div>
  );
};

// Layer LED Settings Component
interface LayerLedSettingsProps {
  device: Device;
  ledConfig: { layers?: Array<{ layer_id: number; r: number; g: number; b: number }> };
  onLayerColorChange: (layerId: number, color: RgbColor) => void;
  forceUpdate: number;
  handleChange: (pType: string, id: string) => ((event: React.ChangeEvent<HTMLInputElement>) => Promise<void>);
}

const LayerLedSettings: React.FC<LayerLedSettingsProps> = ({ device, onLayerColorChange, forceUpdate, handleChange }): JSX.Element => {
  const { t } = useLanguage();
  const [layerCount, setLayerCount] = useState<number>(4); // Default 4 layers
  
  // Directly use device config layers without local state
  const deviceLayers = useMemo((): Array<{ layer_id: number; r: number; g: number; b: number }> => {
    return device.config?.led?.layers || [];
  }, [device.config?.led?.layers]);
  
  // Initialize device layers if they don't exist
  useEffect((): void => {
    if (deviceLayers.length === 0 && device.config?.led) {
      const defaultLayers = createDefaultLayers(layerCount);
      
      // Initialize first layer to trigger device state update
      if (defaultLayers.length > 0) {
        const firstLayer = defaultLayers[0];
        if (firstLayer) {
          onLayerColorChange(0, { r: firstLayer.r, g: firstLayer.g, b: firstLayer.b });
        }
      }
    }
  }, [device.id, deviceLayers.length, layerCount, onLayerColorChange]);

  // Set layer count based on device layers
  useEffect((): void => {
    if (deviceLayers.length > 0) {
      setLayerCount(deviceLayers.length);
    }
  }, [deviceLayers.length]);

  return (
    <div>
      {/* Layer Color Settings */}
      <div className="flex flex-wrap gap-4">
        {deviceLayers.slice(0, layerCount).map((layer): JSX.Element | null => {
          if (!layer) return null;
          return (
            <RgbInput
              key={`${device.id}-layer-${layer.layer_id}-${forceUpdate}`}
              label={`${t('led.layer')} ${layer.layer_id}`}
              value={{ r: layer.r, g: layer.g, b: layer.b }}
              onChange={(): void => {}}
              field={`led_layer_${layer.layer_id}`}
              handleChange={handleChange}
              deviceId={device.id}
              layerId={layer.layer_id}
              device={device}
            />
          );
        })}
      </div>
    </div>
  );
};

export default LedSettings;