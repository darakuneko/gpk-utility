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
        haptic: { id: "haptic", label: t('tabs.haptic') }
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

    // 共通セット - only include trackpad tabs if config is available and stable
    // However, always show layer tab for TP devices regardless of trackpad config status
    const tpTabs = hasTrackpadConfig 
        ? [tabs.mouse, tabs.scroll, tabs.dragdrop, tabs.gesture, tabs.layer, tabs.haptic, tabs.timer] as Tab[]
        : []; // Always show layer tab, even without trackpad config

    const tabDefinitions: Record<string, Tab[]> = {
        'macropad_tp': tpTabs,
        'macropad_tp_btns': hasTrackpadConfig 
            ? [tabs.mouse, tabs.scroll, tabs.gesture, tabs.layer, tabs.haptic, tabs.timer] as Tab[]
            : [], // Always show layer tab, even without trackpad config
        'keyboard_tp': tpTabs,
        'keyboard_oled': [tabs.layer, tabs.oled] as Tab[]
    };
    return tabDefinitions[device.deviceType || ''] || [];
};