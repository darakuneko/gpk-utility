# 付録C: ホスト UI ↔ ビットフィールド 対応表

[English](./vial_firmware_appendix_c_host_mapping.md)

> ホスト UI 参照: `src/renderer/settings/`
> ホスト受信参照: `gpkrc-modules/trackpadConfig.ts`, `pomodoroConfig.ts`, `ledConfig.ts`

---

## 1. Layer タブ (layerSettings.tsx)

| UI 項目 | 機能 | FW 実装 | 備考 |
|---|---|---|---|
| Trackpad Layer | タッチパッドタッチ中に専用レイヤーへ | `trackpad_config.can_trackpad_layer` | **keyboard_tp のみ表示**。layer 3 固定 (numnum_bento_max) |
| Haptic on Layer Change | レイヤー変更時の Haptic | `trackpad_config.can_hf_for_layer` | |
| Automatic Layer Switch | アプリ別自動レイヤー | electron-store + `layer_move` operation | FW への operation で実現 |

Auto Layer Switch はホスト側 (`gpkrc-modules/windowMonitoring.ts`) が
アクティブウィンドウを監視し `layer_move` を送信する。FW 側の特別な実装は不要。

---

## 2. Haptic タブ (hapticSettings.tsx)

| UI 項目 | FW フィールド | パケット位置 | 範囲 |
|---|---|---|---|
| Haptic Pattern (number) | `hf_waveform_number` | trackpad actualData[0] bits[7:1] | 1–127 |

> UI 参照: `src/renderer/settings/hapticSettings.tsx:31-33`

---

## 3. Mouse タブ (mouseSettings.tsx)

| UI 項目 | FW フィールド | パケット位置 | UI ↔ FW 変換 |
|---|---|---|---|
| Speed (0.1–5.0) | `default_speed` | actualData[4][1:0] + actualData[5][7:4] | UI × 10 = FW値 |

`default_speed` は 6bit 値 (0–63)。UI 表示は `FW値 / 10` で小数表示。

> UI 参照: `src/renderer/settings/mouseSettings.tsx:26-38`

---

## 4. Scroll タブ (scrollSettings.tsx)

| UI 項目 | FW フィールド | パケット位置 | 範囲 |
|---|---|---|---|
| Reverse Vertical | `can_reverse_scrolling_direction` | actualData[3] bit[0] | bool |
| Reverse Horizontal | `can_reverse_h_scrolling_direction` | actualData[6] bit[6] | bool |
| Scroll Term (ms) | `scroll_term` | actualData[1][5:0] + actualData[2][7:4] | 0–300 |
| Scroll Steps (lines) | `scroll_step` | actualData[5] bits[3:0] | 0–15 (UI: +1 表示) |
| Short Scroll | `can_short_scroll` | actualData[6] bit[7] | bool |
| Short Scroll Term (ms) | `short_scroll_term` | actualData[15..16] | 0–500 |

> UI 参照: `src/renderer/settings/scrollSettings.tsx`
>
> `scroll_step` の UI 表示: `scroll_step + 1` (0 → "1 line", 15 → "16 lines")

---

## 5. Drag & Drop タブ (dragDropSettings.tsx)

| UI 項目 | FW フィールド | パケット位置 | 範囲 |
|---|---|---|---|
| Drag & Drop (enable) | `can_drag` | actualData[1] bit[6] | bool |
| Mode: Term | `drag_strength_mode = false` | actualData[4] bit[7] | bool |
| Mode: Strength | `drag_strength_mode = true` | actualData[4] bit[7] | bool |
| Term (ms) | `drag_term` | actualData[2][3:0] + actualData[3][7:2] | 0–1000 |
| Strength | `drag_strength` | actualData[4] bits[6:2] | 1–12 |

> UI 参照: `src/renderer/settings/dragDropSettings.tsx`

---

## 6. Gesture タブ (gestureSettings.tsx)

| UI 項目 | FW フィールド | パケット位置 | 範囲 |
|---|---|---|---|
| Tap Term (ms) | `tap_term` | actualData[7..8] | 0–500 |
| Swipe Term (ms) | `swipe_term` | actualData[9..10] | 0–500 |
| Pinch Term (ms) | `pinch_term` | actualData[11..12] | 0–500 |
| Gesture Term (ms) | `gesture_term` | actualData[13..14] | 0–500 |
| Pinch Distance | `zoom_distance` (FW) / `pinch_distance` (host) | actualData[17..18] | 0–500 |

> `zoom_distance` (FW側名) = `pinch_distance` (ホスト側 TypeScript 名)
> ホスト参照: `gpkrc-modules/trackpadConfig.ts:50`

---

## 7. Timer タブ (timerSettings.tsx)

| UI 項目 | FW フィールド | actualData[] | 範囲 |
|---|---|---|---|
| Work Time (min) | `work_time` | [0] | 1–60 |
| Break Time (min) | `break_time` | [1] | 1–30 |
| Long Break Time (min) | `long_break_time` | [2] | 1–60 |
| Work Interval | `work_interval` | [3] bits[3:0] | 1–10 |
| Work Haptic | `work_hf_pattern` | [4] | 1–127 |
| Break Haptic | `break_hf_pattern` | [5] | 1–127 |
| Haptic Notification | `notify_haptic_enable` | [6] bit[6] | bool |
| Continuous Mode | `continuous_mode` | [6] bit[5] | bool |
| Pomodoro Cycle | `pomodoro_cycle` | [7] bits[3:0] | 1–10 |

**読み取り専用フィールド** (FW → Host のみ, Set では無視):
- `timer_active` ([6] bit[7])
- `phase` ([6] bits[1:0]): 0=IDLE, 1=WORK, 2=BREAK, 3=LONG_BREAK

> ホスト参照: `gpkrc-modules/pomodoroConfig.ts:12-28`

---

## 8. LED タブ (ledSettings.tsx)

対象: `macropad_tp_btns`, `macropad_tp`, `keyboard_tp` のみ

### send_led_config / receive_led_config (18バイト)

| UI 項目 | FW フィールド | actualData[] |
|---|---|---|
| Pomodoro Work Color | `pomodoro_colors.work_r/g/b` | [0..2] |
| Pomodoro Break Color | `pomodoro_colors.break_r/g/b` | [3..5] |
| Pomodoro Long Break Color | `pomodoro_colors.long_break_r/g/b` | [6..8] |
| Speed Indicator Color | `indicator_colors.speed_r/g/b` | [9..11] |
| Scroll Step Indicator Color | `indicator_colors.step_r/g/b` | [12..14] |
| Horizontal Scroll Indicator | `indicator_colors.h_scroll_r/g/b` | [15..17] |

### send_led_layer_config / receive_led_layer_config

| UI 項目 | FW フィールド | actualData[] |
|---|---|---|
| Layer Count | `layer_count` | [0] |
| Layer 0 Color | `layer_colors[0].r/g/b` | [1..3] |
| Layer 1 Color | `layer_colors[1].r/g/b` | [4..6] |
| Layer N Color | `layer_colors[N].r/g/b` | [1+N*3 .. 3+N*3] |

**LED 動作条件**: RGB Effect が `Solid Color` モードの時のみ機能。
カラーピッカーを開くと自動的にそのレイヤーに切り替わる。

> ホスト参照: `gpkrc-modules/ledConfig.ts:12-79`
> ファームウェア参照: [numnum_bento_max/config/led_config.h](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/led_config.h), `led_config.c`

---

## 9. OLED タブ (OLEDSettings.tsx)

対象: `keyboard_oled` のみ

| UI 項目 | 機能 | FW 実装 |
|---|---|---|
| Time Display (on/off) | OLED 最終行に時刻表示 | `id_oled_write` operation を受信 |

アプリが毎分 `YYYY/MM/DD ddd HH:mm ` 形式の文字列を OLED に書き込む。
FW 側は `oled_write()` を呼ぶだけ。OLED のレイアウト自体は FW が管理。

> ホスト参照: `gpkrc-modules/oledDisplay.ts:26-34`

---

## 10. App Settings (AppSettings.tsx)

| UI 項目 | FW 関係 | 備考 |
|---|---|---|
| Language | なし | electron-store のみ |
| Import / Export | device_config 全体 | デバイス接続時に一括適用 |
| Minimize to Tray | なし | electron-store のみ |
| Device Polling Interval | HID ポーリング間隔 | ホスト側のみ (200–2000ms) |

---

## 11. Config Edit Mode (settingEdit.tsx / layerSettings.tsx)

デバイスごとに Mouse / Scroll / Drag & Drop / Gesture (= trackpad_config) のプリセットを保存・適用する。

| UI 項目 | 機能 | FW 実装 | 備考 |
|---|---|---|---|
| Apply (ライブプレビュー) | 選択プリセットを一時適用 | `id_trackpad_temp_apply` operation (0x03) | RAM のみ・非永続。ホストが読み戻し検証 |
| Save / Default / View / Rename / Delete | プリセット管理 | なし | electron-store のみ (FW 非関与) |

「Apply」は trackpad_config を**永続保存せず**デバイスに反映するため、設定の試用が可能。
ホストは適用後に `id_trackpad_get_value` で読み戻し、値が一致するまで再送する。

> ホスト参照: `ipcHandlers/configHandlers.ts:91` (`applyTrackpadTemp`),
> `gpkrc-modules/trackpadConfig.ts:108-118` (`applyTrackpadTempConfig`)
> パケット詳細: 付録A §8
