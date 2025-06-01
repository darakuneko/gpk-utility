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

export interface Device extends DeviceWithId {
    connected?: boolean;
    initializing?: boolean;
    checkDevice?: boolean;
    needsRestart?: boolean;
    config?: DeviceConfig | null;
}

export interface CommandResult {
    success: boolean;
    data?: any;
    error?: string;
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
}

export interface DeviceConfig {
    init?: number;
    pomodoro: PomodoroConfig;
    trackpad: TrackpadConfig;
    oled_enabled?: number;
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
    layer: number;
}

export interface ActiveWindowResult {
    title: string;
    executableName: string;
}

export interface AutoLayerSettings {
    [deviceId: string]: {
        enabled: boolean;
        layerSettings: LayerSetting[];
    };
}

// Function type definitions
export type WriteCommandFunction = (device: Device, command: number[]) => Promise<CommandResult>;
export type ReadCommandFunction = (device: Device) => Promise<CommandResult>;
export type DeviceHealthChecker = (deviceId: string) => Promise<boolean>;
export type ConfigurationManager = (device: Device, config: Partial<DeviceConfig>) => Promise<CommandResult>;