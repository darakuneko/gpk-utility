import React from "react";

import { CustomSlider } from "../../components/CustomComponents";
import { useLanguage } from "../../i18n/LanguageContext";
import { Device, TrackpadConfig } from "../../types/device";

interface MouseSettingsProps {
  device: Device;
  handleChange: (configKey: string, deviceId: string) => (e: { target: { value: string | number } }) => void;
  handleSliderStart: () => void;
  handleSliderEnd: () => void;
}

const MouseSettings: React.FC<MouseSettingsProps> = ({ device, handleChange, handleSliderStart, handleSliderEnd }): React.ReactElement => {
  const { t } = useLanguage();
  
  // Ensure that the device's trackpad settings exist
  const trackpadConfig: TrackpadConfig = device.config?.trackpad || {};
  
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-xs">
      <div className="flex items-center justify-center mb-3">
        <div className="pt-4 w-full">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('mouse.speed')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{trackpadConfig.default_speed ? (trackpadConfig.default_speed / 10).toFixed(1) : "0"}</span>
          </label>
          <CustomSlider
            id="config-default_speed"
            value={trackpadConfig.default_speed ? trackpadConfig.default_speed / 10 : 0}
            min={0.1}
            step={0.1}
            max={5}
            marks={[
              {value: 0.1, label: '0.1'},
              {value: 5.0, label: '5.0'}
            ]}
            onChange={handleChange("default_speed", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
      </div>
    </div>
  );
};

export default MouseSettings;