import React from "react";
import { CustomSwitch, CustomSelect, CustomSlider } from "../../components/CustomComponents.js";

const DragDropSettings = ({ device, handleChange, handleSliderStart, handleSliderEnd }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="flex flex-wrap items-center gap-6 mb-3">
        <div className="pt-2 w-[200px]">
          <label className="block mb-1 text-gray-900 dark:text-white">Drag & Drop</label>
          <CustomSwitch
            id="config-can_drag"
            onChange={handleChange("can_drag", device.id)}
            checked={device.config.can_drag === 1}
          />
        </div>
        <div className="pt-2 w-[200px]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>Mode</span>
          </label>
          <CustomSelect
            id="config-drag_strength_mode"
            value={device.config.drag_strength_mode !== undefined ? device.config.drag_strength_mode : ''}
            onChange={handleChange("drag_strength_mode", device.id)}
            options={[
              { value: "0", label: "Term" },
              { value: "1", label: "Strength" }
            ]}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 mb-6">
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>Term</span>
            <span className="text-sm font-bold ml-2 mr-2">{device.config.drag_term ? device.config.drag_term : "0"} ms</span>
          </label>
          <CustomSlider
            id="config-drag_term"
            value={device.config.drag_term ? device.config.drag_term : 0}
            min={0}
            step={10}
            max={1000}
            marks={[
              {value: 0, label: '0'},
              {value: 1000, label: '1000 ms'}
            ]}
            onChange={handleChange("drag_term", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>Strength</span>
            <span className="text-sm font-bold ml-2 mr-2">{device.config.drag_strength ? device.config.drag_strength : "1"}</span>
          </label>
          <CustomSlider
            id="config-drag_strength"
            value={device.config.drag_strength ? device.config.drag_strength : 0}
            min={1}
            step={1}
            max={12}
            marks={[
              {value: 1, label: '1'},
              {value: 12, label: '12'}
            ]}
            onChange={handleChange("drag_strength", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
      </div>
    </div>
  );
};

export default DragDropSettings;