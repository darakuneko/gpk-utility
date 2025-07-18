// Device-related type definitions
import { DeviceType } from '../../gpkrc-modules/deviceTypes';

export interface HIDDevice {
    vendorId: number;
    productId: number;
    path?: string;
    serialNumber?: string;
    manufacturer?: string;
    product?: string;
    release?: number;
    interface?: number;
    usagePage?: number;
    usage?: number;
}

export interface DeviceWithId extends HIDDevice {
    id: string;
    deviceType?: DeviceType;
    gpkRCVersion?: number;
}

// Base Device interface ensures manufacturer and product are required for core operations
export interface Device extends DeviceWithId {
    id: string;             // Ensure id is always present
    manufacturer: string;   // Required for device identification
    product: string;        // Required for device identification
    connected?: boolean;
    initializing?: boolean;
    checkDevice?: boolean;
    needsRestart?: boolean;
    config?: DeviceConfig | null;
}

// For cases where manufacturer/product might be optional (e.g., during device discovery)
export interface PartialDevice extends Omit<Device, 'manufacturer' | 'product'> {
    manufacturer?: string;
    product?: string;
}

export interface CommandResult {
    success: boolean;
    data?: unknown; // Command responses can vary greatly, use unknown for safety
    error?: string;
    skipped?: boolean;
}

// Device configuration update types
export interface DeviceConfigUpdate {
    [key: string]: string | number | boolean | DeviceConfigUpdate | LayerSetting[];
}

export interface PomodoroConfigUpdate extends DeviceConfigUpdate {
    work_time?: number;
    break_time?: number;
    long_break_time?: number;
    work_interval?: number;
    pomodoro_cycle?: number;
    continuous_mode?: number;
    notify_haptic_enable?: number;
    timer_active?: number;
    phase?: number;
    minutes?: number;
    seconds?: number;
    current_work_Interval?: number;
    current_pomodoro_cycle?: number;
    work_hf_pattern?: number;
    break_hf_pattern?: number;
    notifications_enabled?: number;
}

export interface TrackpadConfigUpdate extends DeviceConfigUpdate {
    can_hf_for_layer?: number;
    can_drag?: number;
    can_trackpad_layer?: number;
    can_reverse_scrolling_direction?: number;
    can_short_scroll?: number;
    default_speed?: number;
    drag_strength?: number;
    drag_strength_mode?: number;
    scroll_term?: number;
    drag_term?: number;
    tap_term?: number;
    swipe_term?: number;
    pinch_term?: number;
    pinch_distance?: number;
    gesture_term?: number;
    short_scroll_term?: number;
    scroll_step?: number;
    hf_waveform_number?: number;
    auto_layer_enabled?: number;
    auto_layer_settings?: LayerSetting[];
}

export interface PomodoroConfig {
    phase?: number;
    timer_active?: number | boolean;
    notifications_enabled?: number | boolean;
    minutes?: number;
    seconds?: number;
    current_work_Interval?: number;
    current_pomodoro_cycle?: number;
    work_time?: number;
    break_time?: number;
    long_break_time?: number;
    work_interval_before_long_break?: number;
    work_interval?: number;
    work_hf_pattern?: number;
    break_hf_pattern?: number;
    notify_haptic_enable?: number;
    pomodoro_cycle?: number;
    continuous_mode?: number;
}

export interface PomodoroActiveStatus {
    phase: number;
    timer_active: number;
    minutes: number;
    seconds: number;
    current_work_Interval: number;
    current_pomodoro_cycle: number;
}

export interface TrackpadConfig {
    mouseSpeed?: number;
    reverseDirection?: number;
    shortScroll?: number;
    scrollTerm?: number;
    scrollStep?: number;
    shortScrollTerm?: number;
    tapTerm?: number;
    swipeTerm?: number;
    pinchTerm?: number;
    pinchDistance?: number;
    dragDropMode?: number;
    dragDropTerm?: number;
    dragDropStrength?: number;
    trackpadLayer?: number;
    hapticMode?: number;
    layerMovingHaptic?: number;
    auto_layer_enabled?: number;
    auto_layer_settings?: LayerSetting[];
    hf_waveform_number?: number;
    can_hf_for_layer?: number;
    can_drag?: number;
    scroll_term?: number;
    default_speed?: number;
    drag_term?: number;
    can_trackpad_layer?: number;
    can_reverse_scrolling_direction?: number;
    can_reverse_h_scrolling_direction?: number;
    drag_strength_mode?: number;
    drag_strength?: number;
    scroll_step?: number;
    can_short_scroll?: number;
    tap_term?: number;
    swipe_term?: number;
    pinch_term?: number;
    gesture_term?: number;
    short_scroll_term?: number;
    pinch_distance?: number;
}

export interface RgbColor {
    r: number;
    g: number;
    b: number;
}

export interface LedLayerConfig extends RgbColor {
    layer_id: number;
}

export interface LedConfig {
    enabled?: number;
    mouse_speed_accel?: RgbColor;
    scroll_step_accel?: RgbColor;
    horizontal_scroll?: RgbColor;
    pomodoro?: {
        work: RgbColor;
        break: RgbColor;
        long_break: RgbColor;
    };
    layers?: LedLayerConfig[];
}

export interface DeviceConfig {
    init?: number;
    pomodoro: PomodoroConfig;
    trackpad: TrackpadConfig;
    oled_enabled?: number;
    led?: LedConfig;
    [key: string]: unknown; // Allow any additional properties
}

export interface DeviceStatus {
    config: DeviceConfig;
    deviceType: DeviceType;
    gpkRCVersion: number;
    connected: boolean;
    initializing?: boolean;
    init?: number;
}

export interface LayerSetting {
    applicationName: string;
    appName: string;
    layer: number;
}

export interface ActiveWindowResult {
    title: string;
    executableName: string;
    application: string;
    name: string;
    path?: string;
    pid?: number;
}

export interface AutoLayerSettings {
    [deviceId: string]: {
        enabled: boolean;
        layerSettings: LayerSetting[];
    };
}

export interface AppInfo {
    name: string;
    version: string;
    description: string;
    author: {
        name?: string;
        email?: string;
        url?: string;
        [key: string]: string | undefined;
    };
}

// Function type definitions
export type WriteCommandFunction = (device: Device, command: number[]) => Promise<CommandResult>;
export type ReadCommandFunction = (device: Device) => Promise<CommandResult>;
export type DeviceHealthChecker = (deviceId: string) => Promise<boolean>;
export type ConfigurationManager = (device: Device, config: Partial<DeviceConfig>) => Promise<CommandResult>;