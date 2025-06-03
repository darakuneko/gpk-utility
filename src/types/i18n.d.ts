// Type definitions for i18n locales

export interface LocaleMessages {
  [key: string]: string | Record<string, string>;
  common: {
    import: string;
    export: string;
    saveComplete: string;
    saveError: string;
    ok: string;
    delete: string;
  };
  about: {
    title: string;
    version: string;
    description: string;
    author: string;
    homepage: string;
    configPath: string;
  };
  updatesNotification: {
    title: string;
    noNotification: string;
  };
  header: {
    title: string;
    noDevices: string;
    connecting: string;
    connectionMessage: string;
    pleaseConnect: string;
    noSettingsAvailable: string;
    initializingDevice: string;
    deviceConfigLoading: string;
    deviceCommunicationProgress: string;
  };
  tabs: {
    mouse: string;
    scroll: string;
    dragDrop: string;
    layer: string;
    timer: string;
    oled: string;
    gesture: string;
    haptic: string;
  };
  mouse: {
    speed: string;
  };
  scroll: {
    reverseDirection: string;
    shortScroll: string;
    term: string;
    scrollStep: string;
    shortScrollTerm: string;
  };
  gesture: {
    tapTerm: string;
    swipeTerm: string;
    pinchTerm: string;
    pinchDistance: string;
  };
  dragDrop: {
    title: string;
    mode: string;
    term: string;
    strength: string;
  };
  layer: {
    trackpadLayer: string;
    autoSwitching: string;
    currentMappings: string;
    notSpecified: string;
    layerNumber: string;
    noMappingsEnabledHint: string;
    appLayerMappings: string;
    addMapping: string;
    actions: string;
    noMappingsFound: string;
    application: string;
    layer: string;
  };
  timer: {
    title: string;
    activePhase: string;
    pressToggleToStop: string;
    workInterval: string;
    phase: string;
    longBreak: string;
    work: string;
    break: string;
    workTime: string;
    breakTime: string;
    longBreakTime: string;
    workIntervalBeforeLongBreak: string;
    pomodoroCycle: string;
    continuousMode: string;
    workPhasePattern: string;
    breakPhasePattern: string;
    timeRemaining: string;
    workIntervalCount: string;
    settings: string;
  };
  oled: {
    title: string;
  };
  settings: {
    appSettings: string;
    minimizeToTray: string;
    startInTray: string;
    language: string;
    selectLanguage: string;
    import: string;
    export: string;
    pollingInterval: string;
    faster: string;
    slower: string;
  };
  haptic: {
    title: string;
    mode: string;
    layerMoving: string;
    description: string;
  };
  pomodoroNotification: {
    workTitle: string;
    workBody: string;
    breakTitle: string;
    breakBody: string;
    longBreakTitle: string;
    longBreakBody: string;
    stopTitle: string;
    stopBody: string;
    enableDesktopNotifications: string;
    enableHapticNotifications: string;
  };
}