import React, { useEffect, useState } from "react";
import { CustomSlider, CustomSelect, CustomSwitch } from "../../components/CustomComponents.js";
import { fullHapticOptions } from "../../data/hapticOptions.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

// Pomodoro active state display component
const PomodoroActiveDisplay = ({ device, formatTime, desktopNotificationsEnabled }) => {
  const { t } = useLanguage();
  
  // Object with default values for safely accessing pomodoro settings
  const pomodoroConfig = device.config?.pomodoro;
  return (
    <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-md">
      <p className="font-medium">{t('timer.activePhase')}</p>
      <p className="text-sm">{t('timer.pressToggleToStop')}</p>
      <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
        {pomodoroConfig.phase !== 3 && (
          <div className="flex justify-between items-center">
            <span className="font-medium">{t('timer.workInterval')}:</span>
            <span className="font-bold">
              {pomodoroConfig.phase === 1 
                ? pomodoroConfig.current_work_Interval + 1 
                : pomodoroConfig.current_work_Interval
              } / {pomodoroConfig.work_interval}
            </span>
          </div>  
        )}
        {pomodoroConfig.phase === 3 && (
          <div className="flex justify-between items-center">
            <span className="font-medium">{t('timer.workInterval')}:</span>
            <span className="font-bold">
              {pomodoroConfig.current_pomodoro_cycle} / {pomodoroConfig.pomodoro_cycle}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center mt-1">
          <span className="font-medium">{t('timer.phase')}:</span>
          {pomodoroConfig.phase === 3 ? (
            <span className="font-bold">{t('timer.longBreak')}</span>
          ) : (
            <span>
              <span className={pomodoroConfig.phase === 1 ? "pomodoro-active-state" : "pomodoro-inactive-state"}>{t('timer.work')}</span>
              {" - "}
              <span className={pomodoroConfig.phase === 2 ? "pomodoro-active-state" : "pomodoro-inactive-state"}>
                {pomodoroConfig.current_work_Interval + 1 === pomodoroConfig.work_interval && pomodoroConfig.phase === 1 ? t('timer.longBreak') : t('timer.break')}
              </span>
            </span>
          )}
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="font-medium">{t('timer.timeRemaining')}:</span>
          <span className="font-bold">{formatTime(pomodoroConfig.minutes, pomodoroConfig.seconds)}</span>
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <span className="font-medium">{t('timer.pomodoroCycle')}:</span>
          <span className="font-bold">{pomodoroConfig.current_pomodoro_cycle || 1} / {pomodoroConfig.pomodoro_cycle || 1}</span>
        </div>
        
        {/* Additional information display */}
        <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
          <h5 className="font-medium mb-2">{t('timer.settings')}</h5>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Continuous mode display */}
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${pomodoroConfig.continuous_mode ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm">{t('timer.continuousMode')}</span>
            </div>
            
            {/* Haptic feedback notification display */}
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${pomodoroConfig.notify_haptic_enable ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm">{t('notifications.pomodoro.enableHapticNotifications')}</span>
            </div>
            
            {/* Desktop notification display */}
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${desktopNotificationsEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm">{t('notifications.pomodoro.enableDesktopNotifications')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pomodoro inactive state settings component
const PomodoroInactiveSettings = ({ device, handleChange, handleSliderStart, handleSliderEnd, desktopNotificationsEnabled, hapticNotificationsEnabled, continuousModeEnabled }) => {
  const { t } = useLanguage();
  
  const pomodoroConfig = device.config?.pomodoro;
  
  return (
    <div>
      <div className="mb-4">
        <h4 className="text-md font-medium mb-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">{t('timer.title')}</h4>
        
        {/* Notification toggle switch */}
        <div className="flex items-center justify-between py-2 mb-2 border-b border-gray-100 dark:border-gray-700">
          <label className="flex items-center text-gray-900 dark:text-white">
            <span>{t('notifications.pomodoro.enableDesktopNotifications')}</span>
          </label>
          <CustomSwitch
            id="config-pomodoro_notify_notifications_enable"
            onChange={handleChange("pomodoro_notify_notifications_enable", device.id)}
            checked={desktopNotificationsEnabled}
          />
        </div>
        
        {/* Haptic feedback notification toggle switch */}
        <div className="flex items-center justify-between py-2 mb-2 border-b border-gray-100 dark:border-gray-700">
          <label className="flex items-center text-gray-900 dark:text-white">
            <span>{t('notifications.pomodoro.enableHapticNotifications')}</span>
          </label>
          <CustomSwitch
            id="config-pomodoro_notify_haptic_enable"
            onChange={handleChange("pomodoro_notify_haptic_enable", device.id)}
            checked={hapticNotificationsEnabled}
          />
        </div>
        
        <div className="flex items-center justify-between py-2 mb-2 border-b border-gray-100 dark:border-gray-700">
          <label className="flex items-center text-gray-900 dark:text-white">
            <span>{t('timer.continuousMode')}</span>
          </label>
          <CustomSwitch
            id="config-pomodoro_continuous_mode"
            onChange={handleChange("pomodoro_continuous_mode", device.id)}
            checked={continuousModeEnabled}
          />
        </div>
        
        <div className="pt-2 w-full mb-4">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('timer.workTime')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{pomodoroConfig.work_time} min</span>
          </label>
          <CustomSlider
            id="config-pomodoro_work_time"
            value={pomodoroConfig.work_time}
            min={1}
            step={1}
            max={60}
            marks={[
              {value: 1, label: '1'},
              {value: 60, label: '60 min'}
            ]}
            onChange={handleChange("pomodoro_work_time", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
        <div className="pt-2 w-full mb-4">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('timer.breakTime')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{pomodoroConfig.break_time} min</span>
          </label>
          <CustomSlider
            id="config-pomodoro_break_time"
            value={pomodoroConfig.break_time}
            min={1}
            step={1}
            max={30}
            marks={[
              {value: 1, label: '1'},
              {value: 30, label: '30 min'}
            ]}
            onChange={handleChange("pomodoro_break_time", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
        <div className="pt-2 w-full mb-4">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('timer.longBreakTime')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{pomodoroConfig.long_break_time} min</span>
          </label>
          <CustomSlider
            id="config-pomodoro_long_break_time"
            value={pomodoroConfig.long_break_time}
            min={1}
            step={1}
            max={60}
            marks={[
              {value: 1, label: '1'},
              {value: 60, label: '60 min'}
            ]}
            onChange={handleChange("pomodoro_long_break_time", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
        <div className="pt-2 w-full mb-4">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('timer.workIntervalBeforeLongBreak')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{pomodoroConfig.work_interval}</span>
          </label>
          <CustomSlider
            id="config-pomodoro_work_interval"
            value={pomodoroConfig.work_interval}
            min={1}
            step={1}
            max={10}
            marks={[
              {value: 1, label: '1'},
              {value: 10, label: '10'}
            ]}
            onChange={handleChange("pomodoro_work_interval", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
        
        <div className="pt-2 w-full mb-4">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('timer.pomodoroCycle')}</span>
            <span className="text-sm font-bold ml-2 mr-2">
              {pomodoroConfig.pomodoro_cycle}
            </span>
          </label>
          <CustomSlider
            id="config-pomodoro_pomodoro_cycle"
            value={pomodoroConfig.pomodoro_cycle || 1}
            min={1}
            step={1}
            max={10}
            marks={[
              {value: 1, label: '1'},
              {value: 10, label: '10'}
            ]}
            onChange={handleChange("pomodoro_pomodoro_cycle", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
      </div>
      
      {/* Haptic Feedback Settings */}
      <div className="mt-4">
        <h4 className="text-md font-medium mb-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">{t('haptic.title')}</h4>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="pt-2 w-full md:w-[48%]">
            <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
              <span>{t('timer.workPhasePattern')}</span>
            </label>
            <CustomSelect
              id="config-pomodoro_work_hf_pattern"
              value={pomodoroConfig.work_hf_pattern}
              onChange={handleChange("pomodoro_work_hf_pattern", device.id)}
              options={fullHapticOptions}
            />
          </div>
          <div className="pt-2 w-full md:w-[48%]">
            <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
              <span>{t('timer.breakPhasePattern')}</span>
            </label>
            <CustomSelect
              id="config-pomodoro_break_hf_pattern"
              value={pomodoroConfig.break_hf_pattern}
              onChange={handleChange("pomodoro_break_hf_pattern", device.id)}
              options={fullHapticOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const TimerSettings = ({ device, handleChange, handleSliderStart, handleSliderEnd, formatTime }) => {
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(true);
  const [hapticNotificationsEnabled, setHapticNotificationsEnabled] = useState(false);
  const [continuousModeEnabled, setContinuousModeEnabled] = useState(false);

  // Initialize device structure when loading settings
  useEffect(() => {
    if (device && device.config) {
      // Initialize pomodoro config if it doesn't exist
      if (!device.config.pomodoro) {
        device.config.pomodoro = {};
      }
      
      // Update haptic notification state from settings
      setHapticNotificationsEnabled(!!device.config.pomodoro.notify_haptic_enable);
      
      // Update continuous mode state from settings
      setContinuousModeEnabled(!!device.config.pomodoro.continuous_mode);
    }
  }, [device]);


  useEffect(() => {
    async function loadNotificationSettings() {
      if (device && device.id) {
        try {
          const result = await window.api.loadPomodoroDesktopNotificationSettings(device.id);
          
          if (result.success) {
            setDesktopNotificationsEnabled(result.enabled);
            
            if (!device.config.pomodoro) {
              device.config.pomodoro = {};
            }
            device.config.pomodoro.notifications_enabled = result.enabled;
          }
        } catch (error) {
          console.error("Failed to load pomodoro notification settings:", error);
        }
      }
    }
    
    loadNotificationSettings();
  }, [device]);

  useEffect(() => {
    const handleSwitchUpdate = (event) => {
      if (event.detail && event.detail.id === "config-pomodoro_notify_notifications_enable") {
        setDesktopNotificationsEnabled(event.detail.value);
      }
      
      if (event.detail && event.detail.id === "config-pomodoro_notify_haptic_enable") {
        setHapticNotificationsEnabled(!!event.detail.value);
      }
      
      if (event.detail && event.detail.id === "config-pomodoro_continuous_mode") {
        setContinuousModeEnabled(!!event.detail.value);
      }
    };
    
    document.addEventListener('switch-updated', handleSwitchUpdate);
    return () => {
      document.removeEventListener('switch-updated', handleSwitchUpdate);
    };
  }, []);

  // Custom change handler for notification toggle
  const handleNotificationToggle = async (isEnabled) => {
    try {
      // Save to local storage only
      await window.api.savePomodoroDesktopNotificationSettings(device.id, isEnabled);
      
      setDesktopNotificationsEnabled(isEnabled);
      
      // Update UI state only, do not send to device
      const oldValue = device.config.pomodoro_notifications_enabled;
      device.config.pomodoro_notifications_enabled = isEnabled ? 1 : 0;
      
      // Dispatch update event to the switch element
      const switchElement = document.getElementById("config-pomodoro_notifications_enabled");
      if (switchElement) {
        const event = new Event('update', { bubbles: true });
        switchElement.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Failed to save pomodoro notification settings:", error);
    }
  };

  // Custom change handler for haptic notification toggle
  const handleHapticNotificationToggle = (isEnabled) => {
    setHapticNotificationsEnabled(isEnabled);
    
    // Update device config - ensure pomodoro object exists
    if (!device.config.pomodoro) {
      device.config.pomodoro = {};
    }
    device.config.pomodoro.notify_haptic_enable = isEnabled ? 1 : 0;
    
    // Send the updated config to device - update only pomodoro settings
    window.api.dispatchSaveDeviceConfig(device, 'pomodoro');
    
    // Dispatch update event to the switch element
    const switchElement = document.getElementById("config-pomodoro_notify_haptic_enable");
    if (switchElement) {
      const customEvent = new CustomEvent('switch-updated', { 
        detail: { 
          id: "config-pomodoro_notify_haptic_enable",
          value: isEnabled
        },
        bubbles: true 
      });
      switchElement.dispatchEvent(customEvent);
    }
  };

  const handleContinuousModeToggle = (isEnabled) => {
    setContinuousModeEnabled(isEnabled);
    
    // Update device config - ensure pomodoro object exists
    if (!device.config.pomodoro) {
      device.config.pomodoro = {};
    }
    device.config.pomodoro.continuous_mode = isEnabled ? 1 : 0;
    
    // Send the updated config to device - update only pomodoro settings
    window.api.dispatchSaveDeviceConfig(device, 'pomodoro');
    
    // Dispatch update event to the switch element
    const switchElement = document.getElementById("config-pomodoro_continuous_mode");
    if (switchElement) {
      const customEvent = new CustomEvent('switch-updated', { 
        detail: { 
          id: "config-pomodoro_continuous_mode",
          value: isEnabled
        },
        bubbles: true 
      });
      switchElement.dispatchEvent(customEvent);
    }
  };

  const enhancedHandleChange = (pType, deviceId) => {
    return (value) => {
      if (pType === "pomodoro_notify_notifications_enable") {
        if (value && typeof value === 'object' && value.target) {
          handleNotificationToggle(value.target.checked);
        } else {
          handleNotificationToggle(value === 1);
        }
        return;
      }
      
      if (pType === "pomodoro_notify_haptic_enable") {
        if (value && typeof value === 'object' && value.target) {
          handleHapticNotificationToggle(value.target.checked);
        } else {
          handleHapticNotificationToggle(value === 1);
        }
        return;
      }
      
      if (pType === "pomodoro_continuous_mode") {
        if (value && typeof value === 'object' && value.target) {
          handleContinuousModeToggle(value.target.checked);
        } else {
          handleContinuousModeToggle(value === 1);
        }
        return;
      }
      
      // Map UI property names to internal structure
      // Format: pomodoro_xxx -> pomodoro.xxx
      if (pType.startsWith('pomodoro_')) {
        const internalProp = pType.replace('pomodoro_', '');
        
        // Ensure pomodoro object exists
        if (!device.config.pomodoro) {
          device.config.pomodoro = {};
        }
        
        // Set value in the nested structure
        device.config.pomodoro[internalProp] = value;
        
        // Call the parent handler with the original property name
        handleChange(pType, deviceId)(value);
        return;
      }
      
      handleChange(pType, deviceId)(value);
    };
  };
  
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      {device.config?.pomodoro?.timer_active ? (
        <PomodoroActiveDisplay device={device} formatTime={formatTime} desktopNotificationsEnabled={desktopNotificationsEnabled} />
      ) : (
        <PomodoroInactiveSettings 
          device={device} 
          handleChange={enhancedHandleChange} 
          handleSliderStart={handleSliderStart} 
          handleSliderEnd={handleSliderEnd}
          desktopNotificationsEnabled={desktopNotificationsEnabled}
          hapticNotificationsEnabled={hapticNotificationsEnabled}
          continuousModeEnabled={continuousModeEnabled}
        />
      )}
    </div>
  );
};

export default TimerSettings;