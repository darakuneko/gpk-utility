import React from "react";
import { CustomSlider } from "../../components/CustomComponents.js";

const MouseSettings = ({ device, handleChange, handleSliderStart, handleSliderEnd }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-center mb-3">
        <div className="pt-4 w-full">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>Speed</span>
            <span className="text-sm font-bold ml-2 mr-2">{device.config.default_speed ? (device.config.default_speed / 10).toFixed(1) : "0"}</span>
          </label>
          <CustomSlider
            id="config-default_speed"
            value={device.config.default_speed ? device.config.default_speed / 10 : 0}
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