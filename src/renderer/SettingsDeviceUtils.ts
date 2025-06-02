interface Tab {
    id: string;
    label: string;
}

interface Device {
    deviceType: string;
    config?: {
        trackpad?: {
            default_speed: number;
        };
    };
    connected: boolean;
    initialized?: boolean;
}

interface DeviceType {
    MACROPAD_TP: string;
    MACROPAD_TP_BTNS: string;
    KEYBOARD_TP: string;
    KEYBOARD_OLED: string;
}

type TranslationFunction = (key: string) => string;

export const getSupportedSettingTabs = (device: Device, t: TranslationFunction, DeviceType: DeviceType): Tab[] => {
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
                             device.initialized !== false && // Change back to !== false instead of === true
                             typeof device.config?.trackpad?.default_speed === 'number' &&
                             device.config.trackpad.default_speed >= 1;

    // 共通セット - only include trackpad tabs if config is available and stable
    // However, always show layer tab for TP devices regardless of trackpad config status
    const tpTabs = hasTrackpadConfig 
        ? [tabs.mouse, tabs.scroll, tabs.dragdrop, tabs.gesture, tabs.layer, tabs.haptic, tabs.timer]
        : []; // Always show layer tab, even without trackpad config

    const tabDefinitions: Record<string, Tab[]> = {
        [DeviceType.MACROPAD_TP]: tpTabs,
        [DeviceType.MACROPAD_TP_BTNS]: hasTrackpadConfig 
            ? [tabs.mouse, tabs.scroll, tabs.gesture, tabs.layer, tabs.haptic, tabs.timer]
            : [], // Always show layer tab, even without trackpad config
        [DeviceType.KEYBOARD_TP]: tpTabs,
        [DeviceType.KEYBOARD_OLED]: [tabs.layer, tabs.oled]
    };
    return tabDefinitions[device.deviceType] || [];
};