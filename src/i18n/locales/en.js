export default {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    apply: 'Apply',
    reset: 'Reset',
    import: 'Import',
    export: 'Export',
    enabled: 'Enabled',
    disabled: 'Disabled',
    on: 'On',
    off: 'Off',
    settings: 'Settings',
    mode: 'Mode',
    default: 'Default',
    delete: 'Delete'
  },
  header: {
    title: 'GPK Utility',
    noDevices: 'No devices connected',
    connecting: 'Connecting...',
  },
  warnings: {
    vialConflict: 'Do not connect while using VIAL'
  },
  tabs: {
    mouse: 'Mouse',
    scroll: 'Scroll',
    dragDrop: 'Drag & Drop',
    haptic: 'Haptic',
    layer: 'Layer',
    timer: 'Timer',
    oled: 'OLED',
    settings: 'Settings'
  },
  mouse: {
    speed: 'Speed',
  },
  scroll: {
    reverseDirection: 'Reverse Direction',
    shortScroll: 'Short Scroll',
    term: 'Term',
    scrollStep: 'Scroll Step',
  },
  dragDrop: {
    title: 'Drag & Drop',
    mode: 'Mode',
    term: 'Term',
    strength: 'Strength',
  },
  layer: {
    trackpadLayer: 'Trackpad Layer',
    changeHaptics: 'Layer Change Haptics',
    autoSwitching: 'Auto Layer Switching',
    currentMappings: 'Current Application Mappings',
    notSpecified: 'Not specified',
    layerNumber: 'Layer {{number}}',
    noMappingsEnabledHint: 'No application mappings configured yet. Disable Auto Layer to add mappings.',
    appLayerMappings: 'Application Layer Mappings',
    addMapping: 'Add Mapping',
    actions: 'Actions',
    noMappingsFound: 'No mappings found. Click "Add Mapping" to create a new mapping.',
    application: 'Application',
    layer: 'Layer'
  },
  timer: {
    title: 'Pomodoro Timer',
    activeState: 'Pomodoro timer is currently active',
    pressToggleToStop: 'Press Pomodoro Toggle key to stop it',
    progress: 'Progress',
    sets: 'sets',
    state: 'State',
    longBreak: 'Long Break',
    work: 'WORK',
    break: 'Break',
    workTime: 'Work Time',
    breakTime: 'Break Time',
    longBreakTime: 'Long Break Time',
    cyclesBeforeLongBreak: 'Cycles Before Long Break',
    workPhasePattern: 'Work Phase Pattern',
    breakPhasePattern: 'Break Phase Pattern',
    timeRemaining: 'Time Remaining',
    cycleCount: 'Cycle'
  },
  oled: {
    title: 'Time Display',
  },
  settings: {
    appSettings: 'Application Settings',
    systemTray: 'System Tray',
    minimizeToTray: 'Minimize to Tray When Closed',
    startInTray: 'Start Minimized to Tray',
    language: 'Language',
    selectLanguage: 'Select Language',
    import: 'Import Settings',
    export: 'Export Settings',
    resetSettings: 'Reset Settings',
    resetConfirmation: 'Are you sure you want to reset all settings?',
    importSuccess: 'Settings imported successfully',
    importError: 'Error importing settings',
    exportSuccess: 'Settings exported successfully',
    exportError: 'Error exporting settings',
    pollingInterval: 'Polling Interval',
    pollingIntervalDescription: 'Time between keyboard polling (ms)',
    faster: 'Faster',
    slower: 'Slower'
  },
  haptic: {
    title: 'Haptic Feedback',
    mode: 'Haptic Mode',
    layerMoving: 'Haptics when moving layers',
    patterns: {
      none: 'None',
      click: 'Click',
      doubleClick: 'Double Click',
      tick: 'Tick',
      vibration: 'Vibration',
      alert: 'Alert',
      error: 'Error',
      success: 'Success'
    }
  },
  notifications: {
    pomodoro: {
      workTitle: 'Focus Session Started',
      workBody: 'You\'ve got {{minutes}} minutes to stay focused',
      breakTitle: 'Break Time!',
      breakBody: 'Time to relax for {{minutes}} minutes',
      longBreakTitle: 'Long Break Started!',
      longBreakBody: 'Take it easy for {{minutes}} minutes',
      enabled: 'Enable Notifications',
      hapticEnabled: 'Enable Haptic Feedback Notifications'
    }
  }
};