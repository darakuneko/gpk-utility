// IPC type definitions for GPK Utility
import type { NotificationData } from './notification';

// Re-export for backward compatibility
export type { NotificationData };

// IPC Channel names
export type IpcChannels = 
  // Device channels
  | 'device:getConnected'
  | 'device:connect'
  | 'device:disconnect'
  | 'device:sendCommand'
  // Config channels
  | 'config:getSettings'
  | 'config:saveSettings'
  // File channels
  | 'file:import'
  | 'file:export'
  | 'file:exportDevice'
  // Store channels
  | 'store:get'
  | 'store:set'
  | 'store:delete'
  | 'store:clear'
  // Notification channels
  | 'notification:show'
  // App channels
  | 'app:getVersion';

// IPC Handler types
export interface IpcHandlers {
  [key: string]: (event: Electron.IpcMainEvent, ...args: unknown[]) => Promise<unknown> | unknown;
}

// Command types
export interface Command {
  id: number;
  params?: unknown[];
}

// Response types
export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Notification types
export interface NotificationQueryPayload {
  deviceId: string;
  type: string;
  collection: string;
  filters: Array<{
    field: string;
    op: string;
    value: unknown;
  }>;
  orderBy: {
    field: string;
    direction: string;
  };
  limit: number;
}

export interface PomodoroPhaseData {
  deviceName: string;
  deviceId: string;
  phase: number;
  minutes: number;
}

export interface DeviceConnectionPomodoroData {
  deviceId: string;
  pomodoroConfig: {
    timer_active: number;
    phase: number;
  };
  phaseChanged: boolean;
}