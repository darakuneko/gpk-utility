// React component type definitions

import { ReactNode, ChangeEvent } from 'react';

// Base Modal Props
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  showCloseIcon?: boolean;
  okButtonText?: string | null;
}

// Custom Slider Props
export interface SliderMark {
  value: number;
  label: string;
}

export interface CustomSliderProps {
  id?: string;
  value?: number;
  min: number;
  max: number;
  step?: number;
  marks?: SliderMark[];
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
}

// Custom Switch Props
export interface CustomSwitchProps {
  id?: string;
  checked?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

// Custom Select Props
export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  id?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  label?: string;
  options?: SelectOption[];
}

// Updates Notification Modal Props
export interface UpdateNotification {
  title: string;
  body: string;
  publishedAt: {
    _seconds: number;
  };
}

export interface UpdatesNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  updates: UpdateNotification[];
}

// Version Modal Props
export interface AppInfo {
  name: string;
  version: string;
  description: string;
  author: {
    name?: string;
    email?: string;
  };
  homepage: string;
}

export interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}