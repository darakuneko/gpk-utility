# 付録D: 実装チェックリスト

[English](./vial_firmware_appendix_d_checklist.md)

> 参照先: [主仕様書](./vial_firmware_integration.ja.md),
> [付録A: パケット](./vial_firmware_appendix_a_packets.ja.md),
> [付録B: デバイスマトリクス](./vial_firmware_appendix_b_device_matrix.ja.md)

新規に GPK Utility 対応キーボードを実装する際の段階別チェックリスト。

---

## Phase 0: ブランチ準備

- [ ] `darakuneko/vial-qmk` を clone し `gpk-utility` ブランチに切り替えた
- [ ] 既存の QMK キーボード定義が `keyboards/<name>/` に配置されている
- [ ] ビルドが通ること (`qmk compile -kb <name> -km default` など)

---

## Phase 1: ビルド設定

### rules.mk (キーボードルート)

- [ ] `GPKRC_ENABLE = yes` を追加
- [ ] `SRC += config/device_config.c` を追加
- [ ] タッチパッドがある場合: `POINTING_DEVICE_ENABLE = yes` と適切なドライバを設定
- [ ] タッチパッドがある場合: `SRC += config/trackpad_config.c config/pomodoro_config.c timer/pomodoro.c`
- [ ] LED 対応の場合: `SRC += config/led_config.c`

### keymaps/vial/rules.mk

- [ ] `VIA_ENABLE = yes`
- [ ] `VIAL_ENABLE = yes`
- [ ] LED/RGB 使用時: `VIALRGB_ENABLE = yes`

### config.h

- [ ] `VIAL_KEYBOARD_UID` を設定 (Vial configurator で生成)
- [ ] `VIAL_UNLOCK_COMBO_ROWS`, `VIAL_UNLOCK_COMBO_COLS` を設定
- [ ] `EECONFIG_USER_DATA_SIZE 128` を設定
- [ ] タッチパッドがある場合: `MOUSE_EXTENDED_REPORT` を設定
- [ ] DRV2605L 使用時: Haptic 設定を記述

---

## Phase 2: device_config 実装

### 2-A: 最小構成 (keyboard / keyboard_oled)

- [ ] `config/device_config.h` を作成
  - [ ] `id_device_get_value_t` enum (`id_device_get_value = 0x01`)
  - [ ] `id_device_operation_t` enum (`id_layer_move = 0x01`, `id_oled_write = 0x02`)
  - [ ] `id_device_set_value_t`・構造体・EEPROM 関数は不要
- [ ] `config/device_config.c` を作成
  - [ ] `send_device_config()` — `data[4] = 1` ハードコード、device_name 送信
  - [ ] `gpk_rc_handle_command_user()` — get_value → `send_device_config()` / operation → layer_move/oled_write

### 2-B: フル構成 (keyboard_tp / macropad_tp 系)

- [ ] `config/device_config.h` を作成
  - [ ] `device_config_t` 構造体定義
  - [ ] `id_device_set_value_t` enum (0x01–0x05)
  - [ ] `id_device_get_value_t` enum (0x01–0x06)
  - [ ] `id_device_operation_t` enum (0x01–0x03 / tp 系は `id_trackpad_temp_apply = 0x03` を含む)
  - [ ] 関数プロトタイプ宣言
- [ ] `config/device_config.c` を作成
  - [ ] `init_device_config()` — デフォルト値設定 + EEPROM 初期化
  - [ ] `save_device_config()` — `eeconfig_update_user_datablock` 呼び出し
  - [ ] `schedule_device_config_save()` — 遅延保存スケジュール
  - [ ] `check_and_save_device_config()` — 5000ms 経過後に save 実行
  - [ ] `send_set_value_complete()` — ACK 送信
  - [ ] `send_device_config()` — `data[4] = device_config.init`、device_name 送信
  - [ ] `gpk_rc_handle_command_user()` — 全コマンドのディスパッチ実装

**検証**: CONSOLE_ENABLE が有効なら `QMK Toolbox` でコマンド受信ログが出力される

---

## Phase 3: サブシステム実装

### 3a. trackpad_config (tp 系のみ)

- [ ] `config/trackpad_config.h` を作成 (構造体 + プロトタイプ)
- [ ] `config/trackpad_config.c` を作成
  - [ ] `init_trackpad_config()` — デフォルト値
  - [ ] `send_trackpad_config()` — 付録A §3 のビットパッキングで 19 バイト送信
  - [ ] `receive_trackpad_config()` — 同レイアウトで受信・`update_trackpad_config` 呼び出し
  - [ ] `update_trackpad_config()` — `schedule_device_config_save` 呼び出し
  - [ ] `set_trackpad_config()` — ランタイム変数初期化
  - [ ] Live Apply (`id_trackpad_temp_apply` operation 0x03) — 19 バイトを RAM へ一時適用。`schedule_device_config_save` と `send_set_value_complete` は呼ばない (非永続・ACK なし、付録A §8)

**ビットパッキング確認**: 付録A §3 の表と `send_trackpad_config`/`receive_trackpad_config` の実装が一致すること

### 3b. pomodoro_config (任意)

- [ ] `config/pomodoro_config.h` を作成
- [ ] `config/pomodoro_config.c` を作成
  - [ ] `init_pomodoro_config()` — デフォルト値
  - [ ] `send_pomodoro_config()` — 8 バイト送信 (付録A §4)
  - [ ] `send_pomodoro_active_status()` — 5 バイト状態送信
  - [ ] `receive_pomodoro_config()` — 受信・適用
  - [ ] `set_pomodoro_config()` — ランタイム変数初期化
- [ ] `timer/pomodoro.h`, `timer/pomodoro.c` を作成
  - [ ] `pomodoro_toggle()`, `pomodoro_update()`, `pomodoro_notify()` を実装

### 3c. led_config (LED 対応機種のみ)

- [ ] `config/led_config.h` を作成
- [ ] `config/led_config.c` を作成
  - [ ] `init_led_config()` — デフォルトカラー設定 (付録A §5 のレイアウト通り)
  - [ ] `send_led_config()` — 18 バイト送信
  - [ ] `send_led_layer_config()` — layer_count + RGB 送信
  - [ ] `receive_led_config()`, `receive_led_layer_config()` — 受信・反映
- [ ] `rgb_matrix_indicators_user()` で LED 表示を実装
  - [ ] `is_pomodoro_flashing()` が true の間: `get_pomodoro_flash_color()` で全灯
  - [ ] 通常時: `device_led_config.layer_colors[get_highest_layer(...)]` で全灯

---

## Phase 4: keymap Hook 実装

- [ ] カスタムキーコード enum を定義 (`QK_KB_0` から連番)
- [ ] `vial.json` の `customKeycodes` と名前・順序が一致すること
- [ ] `keyboard_post_init_user()` を実装
  - [ ] `eeconfig_read_user_datablock` でコンフィグ読込
  - [ ] `device_config.init` が 0 なら `init_device_config` 呼び出し
  - [ ] tp 系: `init_iqs5xx()` でタッチパッドドライバ初期化
  - [ ] `set_trackpad_config`, `set_pomodoro_config`, `set_led_config` でランタイム反映
- [ ] `matrix_scan_user()` を実装
  - [ ] タッチパッド読み取りループ (tp 系のみ)
  - [ ] `if (timer_active) pomodoro_update();`
  - [ ] `check_and_save_device_config();`
- [ ] `process_record_user()` にカスタムキーコードハンドラーを実装
  - [ ] `U_POMODR_TGL` → `pomodoro_toggle()`
  - [ ] `U_EEP_CLR` → `eeconfig_init() + init_device_config + soft_reset_keyboard()`
  - [ ] `U_DRAGDROP`, `U_H_SCROLL`, `U_M_ACL_*`, `U_S_ACL_*`, `U_Layer_UP/DOWN`

---

## Phase 5: GPK Utility での認識確認

- [ ] ファームウェアをビルド・書き込み
- [ ] GPK Utility を起動 (Vial / その他 HID アプリを終了してから)
- [ ] 上部デバイスタブに機器名が表示される

**認識されない場合のチェック**:
- USB の Usage Page/Usage が `0xFF60`/`0x61` か (`GPKRC_ENABLE` が正しく効いているか)
- シリアル番号が `vial:` で始まるか (`VIAL_ENABLE = yes` が有効か)

---

## Phase 6: 設定項目の往復テスト

### trackpad_config テスト

- [ ] Scroll タブ: Scroll Term を変更 → FW の uprintf で値が変化することを確認
- [ ] Drag & Drop タブ: Term モード / Strength モードの切り替えが反映される
- [ ] Mouse タブ: Speed を変更 → カーソル速度が変化する
- [ ] Gesture タブ: Tap Term を変更 → ジェスチャー感度が変化する
- [ ] Config Edit Mode: プリセットを「Apply」→ 一時適用が即反映され、再接続 (または `U_EEP_CLR`) で消える (非永続)

### pomodoro_config テスト

- [ ] Timer タブ: Work Time を変更 → `U_POMODR_TGL` でタイマー開始 → 設定時間でフェーズ変化
- [ ] システムトレイに Pomodoro 進捗が表示される

### led_config テスト

- [ ] LED タブ: レイヤーカラーを変更 → RGB が変化する (Solid Color モード時)
- [ ] LED タブ: Pomodoro カラーを変更 → タイマー開始時に対応色で点灯

---

## Phase 7: EEPROM 永続化検証

- [ ] 任意の設定を変更する
- [ ] 5 秒以上待つ (SAVE_DEVICE_CONFIG_TERM = 5000ms)
- [ ] デバイスを USB から抜き差しする
- [ ] GPK Utility で再接続し、変更した値が保持されていること
- [ ] `U_EEP_CLR` でデフォルト値にリセットされること

---

## Phase 8: Auto Layer 機能確認 (任意)

- [ ] Layer タブ → Automatic Layer Switching を有効化
- [ ] アプリを起動し「登録」ボタンまたは自動追加でアプリを登録
- [ ] そのアプリにフォーカスを当てると自動的に指定レイヤーに切り替わる

> ホスト側実装: `gpkrc-modules/windowMonitoring.ts`
> Linux 環境では X11 か GNOME Shell 拡張 (Focused Window D-Bus) が必要

---

## よくある実装ミス

| ミス | 症状 | 修正 |
|---|---|---|
| enum の値がホストと異なる | 設定が別フィールドに入る | `gpkrc-modules/communication.ts:10-29` と完全一致か確認 |
| ビットパッキング順序が逆 | 値が化ける | 付録A の表と実装を 1 bit ずつ照合 |
| `check_and_save_device_config` を呼ばない | 設定が揮発する | `matrix_scan_user` の末尾に追加 |
| `send_set_value_complete` を忘れる | 次の Set コマンドがタイムアウト | Set ハンドラーの最後に必ず呼ぶ |
| temp_apply で EEPROM 保存してしまう | Live Apply が永続化し試用にならない | `id_trackpad_temp_apply` では `schedule_device_config_save`/`send_set_value_complete` を呼ばない (付録A §8) |
| `zoom_distance` を `pinch_distance` と混同 | ホスト↔FW でフィールド名が違う | FW=`zoom_distance`, host=`pinch_distance` は同一値 |
| device_name の typo | デバイスタイプが `unknown` になる | 文字列を付録B §5 の一覧と照合 |
