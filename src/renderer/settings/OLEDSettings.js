import React, { useState, useEffect } from "react";
import { CustomSwitch } from "../../components/CustomComponents.js";

const OLEDSettings = ({ device, handleChange }) => {
  const [oledEnabled, setOledEnabled] = useState(device.config && device.config.oled_enabled === 1);

  // Load saved OLED settings on component mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        // Get device ID
        const deviceId = device.id;
        if (!deviceId) return;

        // Load settings from electron-store
        const result = await window.api.loadOledSettings(deviceId);
        
        if (result && result.success && result.enabled !== undefined) {
          // Apply saved settings if available
          setOledEnabled(result.enabled);
          
          // Update device settings (to maintain consistency with initial state if settings are not saved)
          if (handleChange && (device.config?.oled_enabled === 1) !== result.enabled) {
            await handleChange("oled_enabled", device.id)({
              target: { checked: result.enabled }
            });
          }
        }
      } catch (error) {
        console.error("Failed to load OLED settings:", error);
      }
    };
    
    if (device && device.connected) {
      loadSavedSettings();
    }
  }, [device.id, device.connected]);

  // Handle settings changes
  const handleOledToggle = async (e) => {
    const enabled = e.target.checked;
    setOledEnabled(enabled);
    
    // Update device configuration
    if (handleChange) {
      await handleChange("oled_enabled", device.id)({
        target: { checked: enabled }
      });
    }
    
    // Toggle OLED state
    try {
      await window.api.saveOledSettings(device.id, enabled);
    } catch (error) {
      console.error("Failed to toggle OLED state:", error);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="flex flex-col gap-3 mb-3">
        <div className="pt-2 w-full">
          <label className="block mb-1 text-gray-900 dark:text-white">OLED Display Settings</label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Toggle current time display on OLED
          </p>
          <CustomSwitch
            id="config-oled_enabled"
            onChange={handleOledToggle}
            checked={oledEnabled}
          />
        </div>
      </div>
    </div>
  );
};

export default OLEDSettings;