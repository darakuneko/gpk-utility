export default {
    common: {
    save: '保存',
    cancel: 'キャンセル',
    apply: '適用',
    reset: 'リセット',
    import: 'インポート',
    export: 'エクスポート',
    enabled: '有効',
    disabled: '無効',
    on: 'オン',
    off: 'オフ',
    settings: '設定',
    mode: 'モード',
    default: '初期値',
    delete: '削除',
    unlimited: '無制限',
    saveComplete: '設定が正常に保存されました。',
    saveError: '設定の保存中にエラーが発生しました。',
    ok: 'OK'
},      
  about: {
    title: '概要',
    version: 'バージョン',
    description: '説明',
    author: '開発者',
    homepage: 'ホームページ'
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
    pleaseConnect: '設定を構成するには互換性のあるデバイスを接続してください。'
  },
  tabs: {
    mouse: 'マウス',
    scroll: 'スクロール',
    dragDrop: 'ドラッグ＆ドロップ',
    haptic: '振動フィードバック',
    layer: 'レイヤー',
    timer: 'タイマー',
    oled: 'OLED',
    settings: '設定',
    gesture: 'ジェスチャー'
  },
  mouse: {
    speed: '速度',
  },
  scroll: {
    reverseDirection: '方向を反転',
    shortScroll: 'ショートスクロール',
    term: '間隔',
    scrollStep: 'スクロール幅',
    shortScrollTerm: 'ショートスクロール間隔'
  },
  gesture: {
    tapTerm: 'タップ間隔',
    swipeTerm: 'スワイプ間隔',
    pinchTerm: 'ピンチ間隔',
    gestureTerm: 'ジェスチャー間隔',
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
    changeHaptics: 'レイヤー変更の振動フィードバック',
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
    workPhasePattern: '作業フェーズパターン',
    breakPhasePattern: '休憩フェーズパターン',
    timeRemaining: '残り時間',
    workIntervalCount: 'ワークインターバル',
    settings: 'タイマー設定'
  },
  oled: {
    title: '時間表示',
  },
  settings: {
    appSettings: 'アプリケーション設定',
    systemTray: 'システムトレイ',
    minimizeToTray: '閉じるとトレイに最小化',
    startInTray: 'トレイに最小化した状態で起動',
    language: '言語',
    selectLanguage: '言語を選択',
    import: '設定をインポート',
    export: '設定をエクスポート',
    resetSettings: '設定をリセット',
    resetConfirmation: 'すべての設定をリセットしてもよろしいですか？',
    importSuccess: '設定が正常にインポートされました',
    importError: '設定のインポート中にエラーが発生しました',
    exportSuccess: '設定が正常にエクスポートされました',
    exportError: '設定のエクスポート中にエラーが発生しました',
    pollingInterval: 'デバイスポーリング間隔',
    faster: '速く',
    slower: '遅く'
  },
  haptic: {
    title: '振動フィードバック',
    mode: '振動モード',
    layerMoving: 'レイヤー移動時の振動フィードバック',
    patterns: {
      none: 'なし',
      click: 'クリック',
      doubleClick: 'ダブルクリック',
      tick: 'ティック',
      vibration: '振動',
      alert: 'アラート',
      error: 'エラー',
      success: '成功'
    }
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