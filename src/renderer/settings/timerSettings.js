import React, { useEffect, useState } from "react";
import { CustomSlider, CustomSelect, CustomSwitch } from "../../components/CustomComponents.js";
import { fullHapticOptions } from "../../data/hapticOptions.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

// Pomodoro active state display component
const PomodoroActiveDisplay = ({ device, formatTime }) => {
  const { t } = useLanguage();
  return (
    <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-md">
      <p className="font-medium">{t('timer.activeState')}</p>
      <p className="text-sm">{t('timer.pressToggleToStop')}</p>
      <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
        {device.config.pomodoro_state !== 3 && (
          <div className="flex justify-between items-center">
            <span className="font-medium">{t('timer.progress')}:</span>
            <span className="font-bold">
              {device.config.pomodoro_state === 1 
                ? device.config.pomodoro_current_cycle + 1 
                : device.config.pomodoro_current_cycle
              } / {device.config.pomodoro_cycles} {t('timer.sets')}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center mt-1">
          <span className="font-medium">{t('timer.state')}:</span>
          {device.config.pomodoro_state === 3 ? (
            <span className="font-bold">{t('timer.longBreak')}</span>
          ) : (
            <span>
              <span className={device.config.pomodoro_state === 1 ? "pomodoro-active-state" : "pomodoro-inactive-state"}>{t('timer.work')}</span>
              {" - "}
              <span className={device.config.pomodoro_state === 2 ? "pomodoro-active-state" : "pomodoro-inactive-state"}>
                {device.config.pomodoro_current_cycle + 1 === device.config.pomodoro_cycles && device.config.pomodoro_state === 1 ? t('timer.longBreak') : t('timer.break')}
              </span>
            </span>
          )}
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="font-medium">{t('timer.timeRemaining')}:</span>
          <span className="font-bold">{formatTime(device.config.pomodoro_minutes, device.config.pomodoro_seconds)}</span>
        </div>
      </div>
    </div>
  );
};

// Pomodoro inactive state settings component
const PomodoroInactiveSettings = ({ device, handleChange, handleSliderStart, handleSliderEnd, notificationsEnabled }) => {
  const { t } = useLanguage();
  return (
    <div>
      <div className="mb-4">
        <h4 className="text-md font-medium mb-2 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1">{t('timer.title')}</h4>
        
        {/* Notification toggle switch */}
        <div className="flex items-center justify-between py-2 mb-2 border-b border-gray-100 dark:border-gray-700">
          <label className="flex items-center text-gray-900 dark:text-white">
            <span>{t('notifications.pomodoro.enabled')}</span>
          </label>
          <CustomSwitch
            id="config-pomodoro_notifications_enabled"
            onChange={handleChange("pomodoro_notifications_enabled", device.id)}
            checked={notificationsEnabled}
          />
        </div>
        
        <div className="pt-2 w-full mb-4">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('timer.workTime')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{device.config.pomodoro_work_time} min</span>
          </label>
          <CustomSlider
            id="config-pomodoro_work_time"
            value={device.config.pomodoro_work_time}
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
            <span className="text-sm font-bold ml-2 mr-2">{device.config.pomodoro_break_time} min</span>
          </label>
          <CustomSlider
            id="config-pomodoro_break_time"
            value={device.config.pomodoro_break_time}
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
            <span className="text-sm font-bold ml-2 mr-2">{device.config.pomodoro_long_break_time} min</span>
          </label>
          <CustomSlider
            id="config-pomodoro_long_break_time"
            value={device.config.pomodoro_long_break_time}
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
            <span>{t('timer.cyclesBeforeLongBreak')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{device.config.pomodoro_cycles}</span>
          </label>
          <CustomSlider
            id="config-pomodoro_cycles"
            value={device.config.pomodoro_cycles}
            min={1}
            step={1}
            max={10}
            marks={[
              {value: 1, label: '1'},
              {value: 10, label: '10'}
            ]}
            onChange={handleChange("pomodoro_cycles", device.id)}
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
              value={device.config.pomodoro_work_hf_pattern}
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
              value={device.config.pomodoro_break_hf_pattern}
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

  // Load notification settings from store when component mounts or device changes
  useEffect(() => {
    async function loadNotificationSettings() {
      if (device && device.id) {
        try {
          const result = await window.api.loadPomodoroNotificationSettings(device.id);
          
          if (result.success) {
            // Update UI state
            setNotificationsEnabled(result.enabled);
            
            // Always update device config to match the stored setting
            // regardless of whether it's already defined
            device.config.pomodoro_notifications_enabled = result.enabled ? 1 : 0;
          }
        } catch (error) {
          console.error("Failed to load pomodoro notification settings:", error);
        }
      }
    }
    
    loadNotificationSettings();
  }, [device]);

  // Listen for CustomSwitch update events
  useEffect(() => {
    const handleSwitchUpdate = (event) => {
      if (event.detail && event.detail.id === "config-pomodoro_notifications_enabled") {
        setForceUpdateCounter(prev => prev + 1);
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
      await window.api.savePomodoroNotificationSettings(device.id, isEnabled);
      
      setNotificationsEnabled(isEnabled);
      
      // Update UI state only, do not send to device
      const oldValue = device.config.pomodoro_notifications_enabled;
      device.config.pomodoro_notifications_enabled = isEnabled ? 1 : 0;
      
      // Force UI update
      setForceUpdateCounter(prev => prev + 1);
      
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

  // Override the original handleChange for notification settings
  const enhancedHandleChange = (pType, deviceId) => {
    return (value) => {
      if (pType === "pomodoro_notifications_enabled") {
        if (value && typeof value === 'object' && value.target) {
          handleNotificationToggle(value.target.checked);
        } else {
          handleNotificationToggle(value === 1);
        }
        return;
      }
      
      handleChange(pType, deviceId)(value);
    };
  };
  
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      {device.config.pomodoro_timer_active ? (
        <PomodoroActiveDisplay device={device} formatTime={formatTime} />
      ) : (
        <PomodoroInactiveSettings 
          device={device} 
          handleChange={enhancedHandleChange} 
          handleSliderStart={handleSliderStart} 
          handleSliderEnd={handleSliderEnd}
          notificationsEnabled={notificationsEnabled}
        />
      )}
    </div>
  );
};

export default TimerSettings;