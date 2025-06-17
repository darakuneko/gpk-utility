import React, { useState, useEffect } from "react";
import type { JSX } from 'react';

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

// Predefined color palette
const COLOR_PALETTE: RgbColor[] = [
  { r: 255, g: 0, b: 0 },     // Red
  { r: 0, g: 255, b: 0 },     // Green
  { r: 0, g: 0, b: 255 },     // Blue
  { r: 255, g: 255, b: 0 },   // Yellow
  { r: 255, g: 0, b: 255 },   // Magenta
  { r: 0, g: 255, b: 255 },   // Cyan
  { r: 255, g: 255, b: 255 }, // White
  { r: 0, g: 0, b: 0 },       // Black
  { r: 255, g: 165, b: 0 },   // Orange
  { r: 128, g: 0, b: 128 },   // Purple
  { r: 255, g: 192, b: 203 }, // Pink
  { r: 165, g: 42, b: 42 },   // Brown
];

// RGB Input Component
const RgbInput: React.FC<RgbInputProps> = ({ label, value, onChange, fieldPrefix, deviceId, handleChange }): JSX.Element => {
  const { t } = useLanguage();
  const [localColor, setLocalColor] = useState<RgbColor>(value || { r: 0, g: 0, b: 0 });

  useEffect((): void => {
    if (value) {
      setLocalColor(value);
    }
  }, [value]);

  const handleColorChange = (component: 'r' | 'g' | 'b', newValue: number): void => {
    const newColor = { ...localColor, [component]: Math.max(0, Math.min(255, newValue)) };
    setLocalColor(newColor);
    onChange(newColor);
    
    // Create synthetic event for handleChange
    const syntheticEvent = {
      target: {
        value: newValue.toString(),
        type: 'number'
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    handleChange(`${fieldPrefix}_${component}`, deviceId)(syntheticEvent);
  };

  const handlePaletteColorSelect = (color: RgbColor): void => {
    setLocalColor(color);
    onChange(color);
    
    // Trigger change events for each component
    ['r', 'g', 'b'].forEach((component): void => {
      const syntheticEvent = {
        target: {
          value: color[component as keyof RgbColor].toString(),
          type: 'number'
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleChange(`${fieldPrefix}_${component}`, deviceId)(syntheticEvent);
    });
  };

  const hexColor = `#${localColor.r.toString(16).padStart(2, '0')}${localColor.g.toString(16).padStart(2, '0')}${localColor.b.toString(16).padStart(2, '0')}`;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
        {label}
      </label>
      
      {/* Color Preview */}
      <div className="flex items-center mb-3">
        <div 
          className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600 mr-3"
          style={{ backgroundColor: hexColor }}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t('led.currentColor')}: {hexColor.toUpperCase()}
        </span>
      </div>

      {/* Color Palette */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('led.colorPalette')}
        </label>
        <div className="grid grid-cols-6 gap-2 mb-3">
          {COLOR_PALETTE.map((color, index): JSX.Element => {
            const paletteHex = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`;
            const isSelected = localColor.r === color.r && localColor.g === color.g && localColor.b === color.b;
            
            return (
              <button
                key={index}
                type="button"
                className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                  isSelected 
                    ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                style={{ backgroundColor: paletteHex }}
                onClick={(): void => handlePaletteColorSelect(color)}
                title={`RGB(${color.r}, ${color.g}, ${color.b})`}
              />
            );
          })}
        </div>
      </div>

      {/* RGB Inputs */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('led.red')} (R)
          </label>
          <input
            type="number"
            min="0"
            max="255"
            value={localColor.r}
            onChange={(e): void => handleColorChange('r', parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('led.green')} (G)
          </label>
          <input
            type="number"
            min="0"
            max="255"
            value={localColor.g}
            onChange={(e): void => handleColorChange('g', parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('led.blue')} (B)
          </label>
          <input
            type="number"
            min="0"
            max="255"
            value={localColor.b}
            onChange={(e): void => handleColorChange('b', parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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
      <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xs">
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
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xs">
      <h4 className="text-md font-medium mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">
        {t('led.title')}
      </h4>

      {/* Mouse Speed Accel */}
      <RgbInput
        label={t('led.mouseSpeedAccel')}
        value={ledConfig.mouse_speed_accel || { r: 255, g: 0, b: 0 }}
        onChange={handleColorUpdate('mouse_speed_accel')}
        fieldPrefix="led_mouse_speed_accel"
        deviceId={device.id}
        handleChange={handleChange}
      />

      {/* Scroll Step Accel */}
      <RgbInput
        label={t('led.scrollStepAccel')}
        value={ledConfig.scroll_step_accel || { r: 0, g: 255, b: 0 }}
        onChange={handleColorUpdate('scroll_step_accel')}
        fieldPrefix="led_scroll_step_accel"
        deviceId={device.id}
        handleChange={handleChange}
      />

      {/* Pomodoro Settings */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-gray-600 pb-1">
          {t('led.pomodoro')}
        </h5>
        
        <div className="space-y-4">
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

  const handleLayerCountChange = (newCount: number): void => {
    if (newCount < 1 || newCount > 16) return; // Limit to 1-16 layers
    
    const currentLayers = ledConfig.layers || [];
    const newLayers = [];
    
    for (let i = 0; i < newCount; i++) {
      if (i < currentLayers.length) {
        // Keep existing layer
        newLayers.push(currentLayers[i]);
      } else {
        // Add new layer with default colors
        newLayers.push({
          layer_id: i,
          r: (i * 50) % 255,
          g: (i * 80) % 255,
          b: (i * 120) % 255
        });
      }
    }
    
    if (device.config?.led) {
      device.config.led.layers = newLayers as Array<{ layer_id: number; r: number; g: number; b: number }>;
    }
    setLayerCount(newCount);
  };

  const handleLayerColorUpdate = (layerId: number): ((color: RgbColor) => void) => (color: RgbColor): void => {
    if (device.config?.led?.layers) {
      const layerIndex = device.config.led.layers.findIndex((layer): boolean => layer.layer_id === layerId);
      if (layerIndex !== -1) {
        device.config.led.layers[layerIndex] = {
          layer_id: layerId,
          ...color
        };
      }
    }
  };

  const layers = ledConfig.layers || [];

  return (
    <div>
      {/* Layer Count Control */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          レイヤー数
        </label>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={(): void => handleLayerCountChange(layerCount - 1)}
            disabled={layerCount <= 1}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white min-w-8 text-center">
            {layerCount}
          </span>
          <button
            type="button"
            onClick={(): void => handleLayerCountChange(layerCount + 1)}
            disabled={layerCount >= 16}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            (1-16)
          </span>
        </div>
      </div>

      {/* Layer Color Settings */}
      <div className="space-y-4">
        {layers.slice(0, layerCount).map((layer): JSX.Element | null => {
          if (!layer) return null;
          return (
            <RgbInput
              key={layer.layer_id}
              label={`${t('led.layer')} ${layer.layer_id + 1}`}
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