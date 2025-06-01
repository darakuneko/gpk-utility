import type { LocaleMessages } from '../../types/i18n';

const enMessages: LocaleMessages = {
  common: {
    import: 'Import',
    export: 'Export',
    saveComplete: 'Settings saved successfully',
    saveError: 'Error saving settings',
    ok: 'OK',
    delete: 'Delete'
  },
  about: {
    title: 'About',
    version: 'Version',
    description: 'Description',
    author: 'Author',
    homepage: 'Homepage',
    configPath: 'Configuration File Path'
  },
  updatesNotification: {
    title: 'Updates',
    noNotification: 'No updates available'
  },
  header: {
    title: 'GPK Utility',
    noDevices: 'No devices connected',
    connecting: 'Connecting...',
    connectionMessage: 'Please connect a compatible device and ensure it is recognized by your system.',
    pleaseConnect: 'Please connect a compatible device to configure settings.',
    noSettingsAvailable: 'No settings available',
    initializingDevice: 'Initializing Device...',
    deviceConfigLoading: 'Please wait while the device configuration is being loaded.',
    deviceCommunicationProgress: 'Device communication in progress...'
  },
  tabs: {
    mouse: 'Mouse',
    scroll: 'Scroll',
    dragDrop: 'Drag & Drop',
    layer: 'Layer',
    timer: 'Timer',
    oled: 'OLED',
    gesture: 'Gesture',
    haptic: 'Haptic'
  },
  mouse: {
    speed: 'Speed'
  },
  scroll: {
    reverseDirection: 'Reverse Direction',
    shortScroll: 'Short Scroll',
    term: 'Scroll Term',
    scrollStep: 'Scroll Step',
    shortScrollTerm: 'Short Scroll Term'
  },
  gesture: {
    tapTerm: 'Tap Term',
    swipeTerm: 'Swipe Term',
    pinchTerm: 'Pinch Term',
    pinchDistance: 'Pinch Distance'
  },
  dragDrop: {
    title: 'Drag & Drop',
    mode: 'Mode',
    term: 'Term',
    strength: 'Strength'
  },
  layer: {
    trackpadLayer: 'Trackpad Layer',
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
    workInterval: 'Work Interval',
    phase: 'Current Phase',
    longBreak: 'Long Break',
    work: 'WORK',
    break: 'Break',
    workTime: 'Work Time',
    breakTime: 'Break Time',
    longBreakTime: 'Long Break Time',
    workIntervalBeforeLongBreak: 'Work Interval',
    pomodoroCycle: 'Pomodoro Cycle',
    continuousMode: 'Continuous Mode',
    workPhasePattern: 'Work Phase',
    breakPhasePattern: 'Break Phase',
    timeRemaining: 'Time Remaining',
    workIntervalCount: 'WorkInterval',
    settings: 'Timer Settings'
  },
  oled: {
    title: 'Time Display'
  },
  settings: {
    appSettings: 'Application Settings',
    minimizeToTray: 'Minimize to Tray When Closed',
    startInTray: 'Start Minimized to Tray',
    language: 'Language',
    selectLanguage: 'Select Language',
    import: 'Import Settings',
    export: 'Export Settings',
    pollingInterval: 'Device Polling Interval',
    faster: 'Faster',
    slower: 'Slower'
  },
  haptic: {
    title: 'Haptic Feedback',
    mode: 'Input Action Haptics',
    layerMoving: 'Haptics when moving layers',
    description: 'Haptic feedback is triggered for specific input actions such as taps, scrolling, and speed adjustments.\nLayer switching feedback can be enabled or disabled separately.\nTo disable all haptics, select \'none\'.\nPomodoro timer haptics are configured separately in the Timer tab.'
  },
  pomodoroNotification: {
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
};

export default enMessages;