interface Tab {
    id: string;
    label: string;
}

import type { Device } from '../types/device';

type TranslationFunction = (key: string) => string;

export const getSupportedSettingTabs = (device: Device | null, t: TranslationFunction, DeviceType: string | null): Tab[] => {
    if (!device || !DeviceType) return [];

    const tabs: Record<string, Tab> = {
        layer: { id: "layer", label: t('tabs.layer') },
        oled: { id: "oled", label: t('tabs.oled') },
        mouse: { id: "mouse", label: t('tabs.mouse') },
        scroll: { id: "scroll", label: t('tabs.scroll') },
        dragdrop: { id: "dragdrop", label: t('tabs.dragDrop') },
        gesture: { id: "gesture", label: t('tabs.gesture') },
        timer: { id: "timer", label: t('tabs.timer') },
        haptic: { id: "haptic", label: t('tabs.haptic') },
        led: { id: "led", label: t('tabs.led') }
    };

    // Check if device is a trackpad device type
    const isTrackpadDevice = device.deviceType === 'macropad_tp' || 
                           device.deviceType === 'macropad_tp_btns' || 
                           device.deviceType === 'keyboard_tp';

    // For trackpad devices, check if trackpad configuration has been received and is stable
    // Use both default_speed > 0 and ensure device is fully initialized
    // Longer debounce is used to handle unstable HID communication during device initialization
        
    const hasTrackpadConfig = isTrackpadDevice && 
                             device.config?.trackpad?.default_speed !== undefined &&
                             device.config.trackpad.default_speed > 0 &&
                             device.connected === true &&
                             typeof device.config?.trackpad?.default_speed === 'number' &&
                             device.config.trackpad.default_speed >= 1;

    // Check if device supports LED configuration
    const isLedDevice = device.deviceType === 'macropad_tp' || 
                       device.deviceType === 'macropad_tp_btns' || 
                       device.deviceType === 'keyboard_tp';
                       
    // Check if device supports LED configuration
    const hasLedConfig = isLedDevice && 
                        device.connected === true &&
                        device.config?.led !== undefined &&
                        device.config?.led !== null &&
                        typeof device.config?.led === 'object' &&
                        !device.initializing;

    // Build tab arrays with LED positioned between Layer and Haptics
    const buildTabsWithLed = (baseTabs: Tab[]): Tab[] => {
        if (!hasLedConfig || !tabs.led) {
            return baseTabs;
        }
        
        // Find the position of haptic tab and insert LED before it
        const hapticIndex = baseTabs.findIndex((tab): boolean => tab === tabs.haptic);
        if (hapticIndex !== -1) {
            const newTabs = [...baseTabs];
            newTabs.splice(hapticIndex, 0, tabs.led);
            return newTabs;
        }
        
        // If haptic tab not found, add LED at the end
        return [...baseTabs, tabs.led];
    };

    const tpTabs = hasTrackpadConfig 
        ? [tabs.mouse, tabs.scroll, tabs.dragdrop, tabs.gesture, tabs.layer, tabs.haptic, tabs.timer] as Tab[]
        : [];
        
    const macropadBtnsTabs = hasTrackpadConfig 
        ? [tabs.mouse, tabs.scroll, tabs.gesture, tabs.layer, tabs.haptic, tabs.timer] as Tab[]
        : [];

    const finalTpTabs = buildTabsWithLed(tpTabs);
    const finalMacropadBtnsTabs = buildTabsWithLed(macropadBtnsTabs);

    const tabDefinitions: Record<string, Tab[]> = {
        'macropad_tp': finalTpTabs,
        'macropad_tp_btns': finalMacropadBtnsTabs,
        'keyboard_tp': finalTpTabs,
        'keyboard_oled': [tabs.layer, tabs.oled] as Tab[]
    };
    return tabDefinitions[device.deviceType || ''] || [];
};