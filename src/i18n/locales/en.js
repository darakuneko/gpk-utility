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
    delete: 'Delete',
    unlimited: 'Unlimited',
    saveComplete: 'Settings saved successfully',
    saveError: 'Error saving settings',
    ok: 'OK'
  },
  about: {
    title: 'About',
    version: 'Version',
    description: 'Description',
    author: 'Author',
    homepage: 'Homepage'
  },
  updatesNotification: {
    title: 'Updates',
    noNotification: 'No updates available'
  },
  header: {
    title: 'GPK Utility',
    noDevices: 'No devices connected',
    connecting: 'Connecting...',
  },
  tabs: {
    mouse: 'Mouse',
    scroll: 'Scroll',
    dragDrop: 'Drag & Drop',
    haptic: 'Haptic',
    layer: 'Layer',
    timer: 'Timer',
    oled: 'OLED',
    settings: 'Settings',
    gesture: 'Gesture'
  },
  mouse: {
    speed: 'Speed',
  },
  scroll: {
    reverseDirection: 'Reverse Direction',
    shortScroll: 'Short Scroll',
    term: 'Term',
    scrollStep: 'Scroll Step',
    shortScrollTerm: 'Short Scroll Term'
  },
  gesture: {
    tapTerm: 'Tap Term',
    swipeTerm: 'Swipe Term',
    pinchTerm: 'Pinch Term',
    gestureTerm: 'Gesture Term',
    pinchDistance: 'Pinch Distance'
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
    currentMappings: 'Application Mappings',
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
    activePhase: 'Pomodoro timer is currently active',
    pressToggleToStop: 'Press Pomodoro Toggle key to stop it',
    workInterval	: 'Work Interval',
    phase: 'CurrentPhase',
    longBreak: 'Long Break',
    work: 'WORK',
    break: 'Break',
    workTime: 'Work Time',
    breakTime: 'Break Time',
    longBreakTime: 'Long Break Time',
    workIntervalBeforeLongBreak: 'Work Interval',
    pomodoroCycle: 'Pomodoro Cycle',
    continuousMode: 'Continuous Mode',
    workPhasePattern: 'Work Phase Pattern',
    breakPhasePattern: 'Break Phase Pattern',
    timeRemaining: 'Time Remaining',
    workIntervalCount: 'WorkInterval',
    settings: 'Timer Settings'
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
    pollingInterval: 'Device Polling Interval',
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
      stopTitle: 'Pomodoro Timer Stopped',
      stopBody: 'Your pomodoro session has ended',
      enableDesktopNotifications: 'Desktop Notifications',
      enableHapticNotifications: 'Haptic Feedback Notifications'
    }
  }
};