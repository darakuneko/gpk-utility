import React, { useState, useEffect } from "react";
import type { JSX } from 'react';
import { SketchPicker } from 'react-color';
import type { ColorResult } from 'react-color';

import { useLanguage } from "../../i18n/LanguageContext.tsx";
import type { Device, RgbColor } from "../../types/device";

interface LedSettingsProps {
  device: Device;
  handleChange: (field: string, deviceId: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

interface RgbInputProps {
  label: string;
  value: RgbColor;
  onChange: (color: RgbColor) => void;
  fieldPrefix: string;
  deviceId: string;
  handleChange: (field: string, deviceId: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}


// RGB Input Component with React Color
const RgbInput: React.FC<RgbInputProps> = ({ label, value, onChange, fieldPrefix, deviceId, handleChange }): JSX.Element => {
  const { t } = useLanguage();
  const [localColor, setLocalColor] = useState<RgbColor>(value || { r: 0, g: 0, b: 0 });
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [pickerPosition, setPickerPosition] = useState<'bottom' | 'top'>('bottom');

  useEffect((): void => {
    if (value) {
      setLocalColor(value);
    }
  }, [value]);

  const handleColorPickerChange = (color: ColorResult): void => {
    const newColor: RgbColor = {
      r: Math.round(color.rgb.r),
      g: Math.round(color.rgb.g),
      b: Math.round(color.rgb.b)
    };
    
    setLocalColor(newColor);
    onChange(newColor);
    
    // Trigger change events for each component to maintain compatibility
    ['r', 'g', 'b'].forEach((component): void => {
      const syntheticEvent = {
        target: {
          value: newColor[component as keyof RgbColor].toString(),
          type: 'number'
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleChange(`${fieldPrefix}_${component}`, deviceId)(syntheticEvent);
    });
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
          type="button"
          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors shadow-sm"
          style={{ backgroundColor: hexColor }}
          onClick={(event): void => {
            // Calculate optimal position for color picker
            const rect = event.currentTarget.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const pickerHeight = 350; // Approximate height of SketchPicker
            const spaceBelow = windowHeight - rect.bottom;
            
            // Use bottom position if there's enough space, otherwise use top
            setPickerPosition(spaceBelow >= pickerHeight ? 'bottom' : 'top');
            setShowColorPicker(!showColorPicker);
          }}
          title={t('led.clickToOpenColorPicker') || 'Click to open color picker'}
        />

        {/* Color Picker */}
        {showColorPicker && (
          <div className="relative">
            <div 
              className="fixed inset-0 z-10" 
              onClick={(): void => setShowColorPicker(false)}
            />
            <div className={`absolute z-20 left-1/2 transform -translate-x-1/2 ${
              pickerPosition === 'bottom' 
                ? 'top-14' 
                : 'bottom-14'
            }`}>
              <SketchPicker
                color={localColor}
                onChange={handleColorPickerChange}
                disableAlpha={true}
                presetColors={[
                  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
                  '#FF00FF', '#00FFFF', '#FFFFFF', '#000000',
                  '#FFA500', '#800080', '#FFC0CB', '#A52A2A',
                  '#808080', '#008000', '#000080', '#800000'
                ]}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Color Values */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        <div>{hexColor.toUpperCase()}</div>
        <div className="text-[10px]">RGB({localColor.r},{localColor.g},{localColor.b})</div>
      </div>
    </div>
  );
};

const LedSettings: React.FC<LedSettingsProps> = ({ device, handleChange }): JSX.Element => {
  const { t } = useLanguage();
  
  // Check if device supports LED configuration
  const isLedDevice = device.deviceType === 'macropad_tp' || 
                     device.deviceType === 'macropad_tp_btns' || 
                     device.deviceType === 'keyboard_tp';
  
  // Initialize LED config if it doesn't exist
  useEffect((): void => {
    if (device && device.config && !device.config.led && isLedDevice) {
      device.config.led = {
        enabled: 1,
        mouse_speed_accel: { r: 255, g: 0, b: 0 },
        scroll_step_accel: { r: 0, g: 255, b: 0 },
        pomodoro: {
          work: { r: 255, g: 0, b: 0 },
          break: { r: 0, g: 255, b: 0 },
          long_break: { r: 0, g: 0, b: 255 }
        },
        layers: []
      };
    }
  }, [device, isLedDevice]);

  // Early return if device doesn't support LED or config is not available
  if (!isLedDevice || !device.config?.led) {
    return (
      <div className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-xs">
        <h4 className="text-md font-medium mb-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">
          {t('led.title')}
        </h4>
        <div className="text-gray-600 dark:text-gray-400">
          LED settings are not available for this device or configuration is loading...
        </div>
      </div>
    );
  }

  const ledConfig = device.config?.led || {};

  const handleColorUpdate = (field: string): ((color: RgbColor) => void) => (color: RgbColor): void => {
    if (device.config?.led) {
      const fieldParts = field.split('.');
      if (fieldParts.length === 1) {
        // Simple field like mouse_speed_accel, scroll_step_accel
        if (fieldParts[0] === 'mouse_speed_accel') {
          device.config.led.mouse_speed_accel = color;
        } else if (fieldParts[0] === 'scroll_step_accel') {
          device.config.led.scroll_step_accel = color;
        }
      } else if (fieldParts.length === 2 && fieldParts[0] === 'pomodoro') {
        // Nested field like pomodoro.work
        if (!device.config.led.pomodoro) {
          device.config.led.pomodoro = {
            work: { r: 255, g: 0, b: 0 },
            break: { r: 0, g: 255, b: 0 },
            long_break: { r: 0, g: 0, b: 255 }
          };
        }
        if (fieldParts[1] === 'work') {
          device.config.led.pomodoro.work = color;
        } else if (fieldParts[1] === 'break') {
          device.config.led.pomodoro.break = color;
        } else if (fieldParts[1] === 'long_break') {
          device.config.led.pomodoro.long_break = color;
        }
      }
    }
  };

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-xs">
      <h4 className="text-md font-medium mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">
        {t('led.title')}
      </h4>

      {/* Speed Indicators */}
      <div className="flex flex-wrap gap-4 mb-4">
        <RgbInput
          label={t('led.mouseSpeedAccel')}
          value={ledConfig.mouse_speed_accel || { r: 255, g: 0, b: 0 }}
          onChange={handleColorUpdate('mouse_speed_accel')}
          fieldPrefix="led_mouse_speed_accel"
          deviceId={device.id}
          handleChange={handleChange}
        />
        <RgbInput
          label={t('led.scrollStepAccel')}
          value={ledConfig.scroll_step_accel || { r: 0, g: 255, b: 0 }}
          onChange={handleColorUpdate('scroll_step_accel')}
          fieldPrefix="led_scroll_step_accel"
          deviceId={device.id}
          handleChange={handleChange}
        />
      </div>

      {/* Pomodoro Settings */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-gray-600 pb-1">
          {t('led.pomodoro')}
        </h5>
        
        <div className="flex flex-wrap gap-4">
          <RgbInput
            label={t('led.work')}
            value={ledConfig.pomodoro?.work || { r: 255, g: 0, b: 0 }}
            onChange={handleColorUpdate('pomodoro.work')}
            fieldPrefix="led_pomodoro_work"
            deviceId={device.id}
            handleChange={handleChange}
          />
          
          <RgbInput
            label={t('led.break')}
            value={ledConfig.pomodoro?.break || { r: 0, g: 255, b: 0 }}
            onChange={handleColorUpdate('pomodoro.break')}
            fieldPrefix="led_pomodoro_break"
            deviceId={device.id}
            handleChange={handleChange}
          />
          
          <RgbInput
            label={t('led.longBreak')}
            value={ledConfig.pomodoro?.long_break || { r: 0, g: 0, b: 255 }}
            onChange={handleColorUpdate('pomodoro.long_break')}
            fieldPrefix="led_pomodoro_long_break"
            deviceId={device.id}
            handleChange={handleChange}
          />
        </div>
      </div>

      {/* Layer Settings */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-gray-600 pb-1">
          {t('led.layer')} {t('led.settings')}
        </h5>
        
        <LayerLedSettings
          device={device}
          ledConfig={ledConfig}
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
  handleChange: (field: string, deviceId: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const LayerLedSettings: React.FC<LayerLedSettingsProps> = ({ device, ledConfig, handleChange }): JSX.Element => {
  const { t } = useLanguage();
  const [layerCount, setLayerCount] = useState<number>(4); // Default 4 layers

  useEffect((): void => {
    // Initialize layers if they don't exist
    if (!ledConfig.layers || ledConfig.layers.length === 0) {
      const defaultLayers = [];
      for (let i = 0; i < layerCount; i++) {
        defaultLayers.push({
          layer_id: i,
          r: i === 0 ? 255 : (i * 50) % 255,
          g: i === 1 ? 255 : (i * 80) % 255,
          b: i === 2 ? 255 : (i * 120) % 255
        });
      }
      if (device.config?.led) {
        device.config.led.layers = defaultLayers;
      }
    } else {
      setLayerCount(ledConfig.layers.length);
    }
  }, [ledConfig.layers, layerCount, device.config]);


  const handleLayerColorUpdate = (layerId: number): ((color: RgbColor) => void) => (color: RgbColor): void => {
    if (device.config?.led?.layers) {
      const layerIndex = device.config.led.layers.findIndex((layer): boolean => layer.layer_id === layerId);
      if (layerIndex !== -1) {
        device.config.led.layers[layerIndex] = {
          layer_id: layerId,
          ...color
        };
        
        // Directly save LED layer config
        void window.api.saveLedLayerConfig(device);
      }
    }
  };

  const layers = ledConfig.layers || [];

  return (
    <div>
      {/* Layer Color Settings */}
      <div className="flex flex-wrap gap-4">
        {layers.slice(0, layerCount).map((layer): JSX.Element | null => {
          if (!layer) return null;
          return (
            <RgbInput
              key={layer.layer_id}
              label={`${t('led.layer')} ${layer.layer_id}`}
              value={{ r: layer.r, g: layer.g, b: layer.b }}
              onChange={handleLayerColorUpdate(layer.layer_id)}
              fieldPrefix={`led_layer_${layer.layer_id}`}
              deviceId={device.id}
              handleChange={handleChange}
            />
          );
        })}
      </div>
    </div>
  );
};

export default LedSettings;