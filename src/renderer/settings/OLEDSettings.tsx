import React, { useState, useEffect, useCallback, memo } from "react";
import type { JSX } from 'react';

import { CustomSwitch } from "../../components/CustomComponents.tsx";
import { useLanguage } from "../../i18n/LanguageContext.tsx";
import { Device } from "../../types/device";

interface OLEDSettingsProps {
  device: Device;
  handleChange: (property: string, deviceId: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const OLEDSettings: React.FC<OLEDSettingsProps> = memo(({ device, handleChange }): JSX.Element => {
  const [oledEnabled, setOledEnabled] = useState<boolean>((): boolean => Boolean(device.config && device.config.oled_enabled === 1));
  const { t } = useLanguage();

  // Update state when device config changes
  useEffect((): void => {
    if (device?.config) {
      setOledEnabled(device.config?.oled_enabled === 1);
    }
  }, [device.config?.oled_enabled]);

  // Wrap handleChange to also call saveOledSettings
  const handleOledToggle = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const enabled = e.target.checked;
    setOledEnabled(enabled);
    
    // Call standard handler
    await handleChange("oled_enabled", device.id)(e);
    
    // Save OLED settings via special API
    try {
      await window.api.saveOledSettings(device, { enabled });
    } catch (error) {
      console.error("Failed to save OLED settings:", error);
    }
  }, [device, handleChange]);

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-xs">
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