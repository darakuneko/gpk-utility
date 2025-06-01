// Common type definitions for GPK Utility

// Device related types
export interface Device {
  id: string;
  path?: string;
  vendorId: number;
  productId: number;
  product?: string;
  name?: string;
  manufacturer?: string;
  serialNumber?: string;
  release?: number;
  interface?: number;
  usagePage?: number;
  usage?: number;
  deviceType?: any;
  gpkRCVersion?: any;
}

// Settings related types
export interface DeviceSettings {
  [key: string]: any;
}

// Configuration types
export interface Config {
  [key: string]: any;
}

// Language types
export type Language = 'en' | 'ja';

// Layer types
export interface Layer {
  id: string;
  name: string;
  enabled: boolean;
  [key: string]: any;
}

// Timer types
export interface Timer {
  work: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  [key: string]: any;
}