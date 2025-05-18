import React from "react";
import { CustomSwitch, CustomSlider } from "../../components/CustomComponents.js";
import { useLanguage } from "../../i18n/LanguageContext.js";

const ScrollSettings = ({ device, handleChange, handleSliderStart, handleSliderEnd }) => {
  const { t } = useLanguage();
      
  // Ensure that the device's trackpad settings exist
  const trackpadConfig = device.config?.trackpad || {};
  
  return (
    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div className="flex flex-wrap items-center gap-6 mb-3">
        <div className="pt-2 w-[200px]">
          <label className="block mb-1 text-gray-900 dark:text-white">{t('scroll.reverseDirection')}</label>
          <CustomSwitch
            id="config-can_reverse_scrolling_direction"
            onChange={handleChange("can_reverse_scrolling_direction", device.id)}
            checked={trackpadConfig.can_reverse_scrolling_direction === 1}
          />
        </div>
        <div className="pt-2 w-[200px]">
          <label className="block mb-1 text-gray-900 dark:text-white">{t('scroll.shortScroll')}</label>
          <CustomSwitch
            id="config-can_short_scroll"
            onChange={handleChange("can_short_scroll", device.id)}
            checked={trackpadConfig.can_short_scroll === 1}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 mb-6">
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('scroll.term')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{trackpadConfig.scroll_term ? trackpadConfig.scroll_term : 0} ms</span>
          </label>
          <CustomSlider
            id="config-scroll_term"
            value={trackpadConfig.scroll_term ? trackpadConfig.scroll_term : 0}
            min={0}
            step={10}
            max={300}
            marks={[
              {value: 0, label: '0'},
              {value: 300, label: '300 ms'}
            ]}
            onChange={handleChange("scroll_term", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('scroll.scrollStep')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{trackpadConfig.scroll_step ? trackpadConfig.scroll_step + 1 : "1"} line</span>
          </label>
          <CustomSlider
            id="config-scroll_step"
            value={trackpadConfig.scroll_step ? trackpadConfig.scroll_step : 0}
            min={0}
            step={1}
            max={15}
            marks={[
              {value: 0, label: '1'},
              {value: 15, label: '16 line'}
            ]}
            onChange={handleChange("scroll_step", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 mb-6">
        <div className="pt-2 w-[45%]">
          <label className="flex justify-between items-center mb-1 text-gray-900 dark:text-white">
            <span>{t('scroll.shortScrollTerm')}</span>
            <span className="text-sm font-bold ml-2 mr-2">{trackpadConfig.short_scroll_term ? trackpadConfig.short_scroll_term : 0} ms</span>
          </label>
          <CustomSlider
            id="config-short_scroll_term"
            value={trackpadConfig.short_scroll_term ? trackpadConfig.short_scroll_term : 0}
            min={0}
            step={10}
            max={250}
            marks={[
              {value: 0, label: '0'},
              {value: 250, label: '250 ms'}
            ]}
            onChange={handleChange("short_scroll_term", device.id)}
            onChangeStart={handleSliderStart}
            onChangeEnd={handleSliderEnd}
          />
        </div>
      </div>
    </div>
  );
};

export default ScrollSettings;