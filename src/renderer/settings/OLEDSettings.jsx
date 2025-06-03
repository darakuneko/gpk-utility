import React, { useState, useEffect, useCallback, memo } from "react";

import { CustomSwitch } from "../../components/CustomComponents.tsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const OLEDSettings = memo(({ device, handleChange }) => {
  const [oledEnabled, setOledEnabled] = useState(device.config && device.config.oled_enabled === 1);
  const { t } = useLanguage();

  // Update state when device config changes
  useEffect(() => {
    if (device?.config) {
      setOledEnabled(device.config?.oled_enabled === 1);
    }
  }, [device.config?.oled_enabled]);

  // Handle OLED toggle
  const handleOledToggle = useCallback(async (e) => {
    const enabled = e.target.checked;
    setOledEnabled(enabled);
    
    // Update device configuration
    if (handleChange) {
      await handleChange("oled_enabled", device.id)({
          target: { value: enabled ? 1 : 0 }
      });
    }
    
    // Save OLED settings
    try {
      await window.api.saveOledSettings(device.id, enabled);
    } catch (error) {
      console.error("Failed to save OLED settings:", error);
    }
  }, [device.id, handleChange]);

  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="flex flex-col gap-3 mb-3">
        <div className="pt-2 w-[45%]">
          <label className="block mb-1 text-gray-900 dark:text-white">{t('oled.title')}</label>
          <CustomSwitch
            id="config-oled_enabled"
            onChange={handleOledToggle}
            checked={oledEnabled}
          />
        </div>
      </div>
    </div>
  );
});

export default OLEDSettings;