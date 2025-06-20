import React from "react";
import type { JSX } from 'react';

import { CustomSwitch, CustomSelect } from "../../components/CustomComponents.tsx";
import { useLanguage } from "../../i18n/LanguageContext.tsx";
import { fullHapticOptions } from "../../data/hapticOptions.js";
import { Device } from "../../types/device";

interface HapticSettingsProps {
  device: Device;
  handleChange: (property: string, deviceId: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleChangeValue: (configKey: string, deviceId: string) => (e: { target: { value: string | number } }) => void;
  handleSliderStart: () => void;
  handleSliderEnd: () => void;
}

const HapticSettings: React.FC<HapticSettingsProps> = ({ device, handleChange, handleChangeValue, handleSliderStart: _handleSliderStart, handleSliderEnd: _handleSliderEnd }): JSX.Element => {
  const { t } = useLanguage();
  
  // Get trackpad configuration or empty object if not defined
  const trackpadConfig = device.config?.trackpad || {};
  
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-xs">
      <div className="flex flex-col gap-3">
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('haptic.mode')}</span>
          </label>
          <CustomSelect
            id="config-hf_waveform_number"
            value={trackpadConfig.hf_waveform_number && trackpadConfig.hf_waveform_number !== 0 ? String(trackpadConfig.hf_waveform_number) : ''}
            onChange={handleChangeValue("hf_waveform_number", device.id)}
            options={fullHapticOptions}
          />
        </div>
        {/* Description section - full width and outside the constrained div */}
        <div className="w-full">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line opacity-75">
            {t('haptic.description')}
          </p>
        </div>
        <div className="pt-2 w-[45%]">
          <label className="block mb-1 text-gray-900 dark:text-white">{t('haptic.layerMoving')}</label>
          <CustomSwitch
            id="config-can_hf_for_layer"
            onChange={handleChange("can_hf_for_layer", device.id)}
            checked={trackpadConfig.can_hf_for_layer === 1}
          />
        </div>        
      </div>
    </div>
  );
};

export default HapticSettings;