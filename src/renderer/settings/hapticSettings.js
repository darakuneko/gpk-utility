import React from "react";
import { CustomSwitch, CustomSelect } from "../../components/CustomComponents.js";

const HapticSettings = ({ device, handleChange, fullHapticOptions }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="flex flex-col gap-3 mb-3">
        <div className="pt-2 w-full">
          <label className="block mb-1 text-gray-900 dark:text-white">Haptics when moving layers</label>
          <CustomSwitch
            id="config-can_hf_for_layer"
            onChange={handleChange("can_hf_for_layer", device.id)}
            checked={device.config.can_hf_for_layer === 1}
          />
        </div>
        <div className="pt-2 w-full">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>Haptic Mode</span>
          </label>
          <CustomSelect
            id="config-hf_waveform_number"
            value={device.config.hf_waveform_number && device.config.hf_waveform_number !== 0 ? device.config.hf_waveform_number : ''}
            onChange={handleChange("hf_waveform_number", device.id)}
            options={fullHapticOptions}
          />
        </div>
      </div>
    </div>
  );
};

export default HapticSettings;