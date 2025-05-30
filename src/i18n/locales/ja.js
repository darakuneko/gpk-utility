export default {
  common: {
    import: 'インポート',
    export: 'エクスポート',
    saveComplete: '設定が正常に保存されました。',
    saveError: '設定の保存中にエラーが発生しました。',
    ok: 'OK',
    delete: '削除'
  },
  about: {
    title: '概要',
    version: 'バージョン',
    description: '説明',
    author: '開発者',
    homepage: 'ホームページ',
    configPath: '設定ファイルパス'
  },
  updatesNotification: {
    title: 'アップデート',
    noNotification: '利用可能なアップデートはありません'
  },
  header: {
    title: 'GPK Utility',
    noDevices: 'デバイスが接続されていません',
    connecting: '接続中...',
    connectionMessage: '互換性のあるデバイスを接続し、システムに認識されていることを確認してください。',
    pleaseConnect: '設定を構成するには互換性のあるデバイスを接続してください。',
    noSettingsAvailable: '設定が利用できません',
    initializingDevice: 'デバイスを初期化中...',
    deviceConfigLoading: 'デバイス設定の読み込み中です。しばらくお待ちください。',
    deviceCommunicationProgress: 'デバイスと通信中...'
  },
  tabs: {
    mouse: 'マウス',
    scroll: 'スクロール',
    dragDrop: 'ドラッグ＆ドロップ',
    layer: 'レイヤー',
    timer: 'タイマー',
    oled: 'OLED',
    gesture: 'ジェスチャー',
    haptic: '振動'
  },
  mouse: {
    speed: '速度',
  },
  scroll: {
    reverseDirection: '方向を反転',
    shortScroll: 'ショートスクロール',
    term: 'スクロール間隔',
    scrollStep: 'スクロール幅',
    shortScrollTerm: 'ショートスクロール間隔'
  },
  gesture: {
    tapTerm: 'タップ間隔',
    swipeTerm: 'スワイプ間隔',
    pinchTerm: 'ピンチ間隔',
    pinchDistance: 'ピンチ距離'
  },
  dragDrop: {
    title: 'ドラッグ＆ドロップ',
    mode: 'モード',
    term: '間隔',
    strength: '強度',
  },
  layer: {
    trackpadLayer: 'トラックパッドレイヤー',
    autoSwitching: '自動レイヤー切替',
    currentMappings: 'アプリケーションマッピング',
    notSpecified: '指定なし',
    layerNumber: 'レイヤー {{number}}',
    noMappingsEnabledHint: 'アプリケーションマッピングが設定されていません。マッピングを追加するには自動レイヤーを無効にしてください。',
    appLayerMappings: 'アプリケーションレイヤーマッピング',
    addMapping: 'マッピングを追加',
    actions: 'アクション',
    noMappingsFound: 'マッピングが見つかりません。「マッピングを追加」をクリックして新しいマッピングを作成してください。',
    application: 'アプリケーション',
    layer: 'レイヤー'
  },
  timer: {
    title: 'ポモドーロタイマー',
    activePhase: 'ポモドーロタイマーが現在アクティブです',
    pressToggleToStop: '停止するにはポモドーロトグルキーを押してください',
    workInterval: 'ワークインターバル',
    phase: '現在のフェーズ',
    longBreak: '長い休憩',
    work: '作業',
    break: '休憩',
    workTime: '作業時間',
    breakTime: '休憩時間',
    longBreakTime: '長い休憩時間',
    workIntervalBeforeLongBreak: 'ワークインターバル',
    pomodoroCycle: 'ポモドーロサイクル',
    continuousMode: '連続モード',
    workPhasePattern: '作業フェーズ',
    breakPhasePattern: '休憩フェーズ',
    timeRemaining: '残り時間',
    workIntervalCount: 'ワークインターバル',
    settings: 'タイマー設定'
  },
  oled: {
    title: '時間表示',
  },
  settings: {
    appSettings: 'アプリケーション設定',
    minimizeToTray: '閉じるとトレイに最小化',
    startInTray: 'トレイに最小化した状態で起動',
    language: '言語',
    selectLanguage: '言語を選択',
    import: '設定をインポート',
    export: '設定をエクスポート',
    pollingInterval: 'デバイスポーリング間隔',
    faster: '速く',
    slower: '遅く'
  },
  haptic: {
    title: '振動フィードバック',
    mode: '入力アクションのハプティクス',
    layerMoving: 'レイヤー移動時の振動フィードバック',
    description: 'ハプティックフィードバックは、タップ、スクロール、速度調整などの特定の入力アクションに対して発生します。\nレイヤー切り替え時のフィードバックは個別に有効/無効にできます。\nすべてのハプティクスを無効にするには「none」を選択してください。\nポモドーロタイマーのハプティクスは、タイマータブで個別に設定されます。'
  },
  pomodoroNotification: {
    workTitle: '集中セッション開始',
    workBody: '{{minutes}}分間集中しましょう',
    breakTitle: '休憩時間です！',
    breakBody: '{{minutes}}分間リラックスしてください',
    longBreakTitle: '長い休憩が始まりました！',
    longBreakBody: '{{minutes}}分間ゆっくり休んでください',
    stopTitle: 'ポモドーロタイマーが停止しました',
    stopBody: 'ポモドーロセッションが終了しました',
    enableDesktopNotifications: 'デスクトップ通知',
    enableHapticNotifications: '振動フィードバック通知'
  }
};