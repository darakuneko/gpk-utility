// IPC type definitions for GPK Utility

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
  [key: string]: (event: any, ...args: any[]) => Promise<any> | any;
}

// Command types
export interface Command {
  id: number;
  params?: any[];
}

// Response types
export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Notification types
export interface NotificationQueryPayload {
  collection: string;
  filters: Array<{
    field: string;
    op: string;
    value: any;
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