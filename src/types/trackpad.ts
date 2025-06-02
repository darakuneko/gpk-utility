// Trackpad configuration specific types

export interface TrackpadGestureConfig {
    enabled: boolean;
    sensitivity: number;
    threshold: number;
}

export interface TrackpadScrollConfig {
    enabled: boolean;
    direction: 'natural' | 'reverse';
    speed: number;
}

export interface TrackpadClickConfig {
    enabled: boolean;
    pressure: number;
    doubleClickSpeed: number;
}

export interface LayerSetting {
    appName: string;
    layer: number;
    enabled: boolean;
    windowClass?: string;
    windowTitle?: string;
}

export interface MouseConfig {
    dpi: number;
    sensitivity: number;
    acceleration: boolean;
}

// Specific trackpad configuration properties
export interface TrackpadConfigProperties {
    gesture?: TrackpadGestureConfig;
    scroll?: TrackpadScrollConfig;
    click?: TrackpadClickConfig;
    mouse?: MouseConfig;
    customSettings?: Record<string, string | number | boolean>;
}