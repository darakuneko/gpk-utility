import React from "react";

import { CustomSlider } from "../../components/CustomComponents.tsx";
import { useLanguage } from "../../i18n/LanguageContext.tsx";
import { Device } from "../../types/device";

interface GestureSettingsProps {
  device: Device;
  handleChange: (configKey: string, deviceId: string) => (e: { target: { value: string | number } }) => void;
  handleSliderStart: () => void;
  handleSliderEnd: () => void;
}

const GestureSettings: React.FC<GestureSettingsProps> = ({ device, handleChange, handleSliderStart, handleSliderEnd }) => {
  const { t } = useLanguage();
  
  // Get trackpad configuration or empty object if not defined
  const trackpadConfig = device.config?.trackpad || {};
  
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="flex flex-wrap items-center gap-6 mb-6">
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('gesture.tapTerm')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{trackpadConfig.tap_term ? trackpadConfig.tap_term : 0} ms</span>
          </label>
          <CustomSlider
            id="config-tap_term"
            value={trackpadConfig.tap_term ? trackpadConfig.tap_term : 0}
            min={0}
            step={10}
            max={500}
            marks={[
              {value: 0, label: '0'},
              {value: 500, label: '500 ms'}
            ]}
            onChange={handleChange("tap_term", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('gesture.swipeTerm')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{trackpadConfig.swipe_term ? trackpadConfig.swipe_term : 0} ms</span>
          </label>
          <CustomSlider
            id="config-swipe_term"
            value={trackpadConfig.swipe_term ? trackpadConfig.swipe_term : 0}
            min={0}
            step={10}
            max={500}
            marks={[
              {value: 0, label: '0'},
              {value: 500, label: '500 ms'}
            ]}
            onChange={handleChange("swipe_term", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 mb-6">
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('gesture.pinchTerm')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{trackpadConfig.pinch_term ? trackpadConfig.pinch_term : 0} ms</span>
          </label>
          <CustomSlider
            id="config-pinch_term"
            value={trackpadConfig.pinch_term ? trackpadConfig.pinch_term : 0}
            min={0}
            step={10}
            max={500}
            marks={[
              {value: 0, label: '0'},
              {value: 500, label: '500 ms'}
            ]}
            onChange={handleChange("pinch_term", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('gesture.pinchDistance')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{trackpadConfig.pinch_distance ? trackpadConfig.pinch_distance : 0}</span>
          </label>
          <CustomSlider
            id="config-pinch_distance"
            value={trackpadConfig.pinch_distance ? trackpadConfig.pinch_distance : 0}
            min={0}
            step={1}
            max={500}
            marks={[
              {value: 0, label: '0'},
              {value: 500, label: '500'}
            ]}
            onChange={handleChange("pinch_distance", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
      </div>
    </div>
  );
};

export default GestureSettings;