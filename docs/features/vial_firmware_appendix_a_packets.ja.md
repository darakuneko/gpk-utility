# 付録A: パケット / 構造体 ビットパッキング早見表

[English](./vial_firmware_appendix_a_packets.md)

> ホスト側参照: `gpkrc-modules/communication.ts`, `gpkrc-modules/trackpadConfig.ts`,
> `gpkrc-modules/pomodoroConfig.ts`, `gpkrc-modules/ledConfig.ts`
>
> ファームウェア参照: [numnum_bento_max/config/device_config.c](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/device_config.c),
> `trackpad_config.c`, `pomodoro_config.c`, `led_config.c`

---

## 1. HID パケット共通フォーマット

### ホスト → ファームウェア (64バイト, USB HID output report)

```
Byte  0  : 0x00            (HID report ID / padding)
Byte  1  : 0xFA            (gpkRCPrefix)
Byte  2  : command_id      (customSetValue=0x01 / customGetValue=0x02 / gpkRCOperation=0x03)
Byte  3  : action_id
Byte  4+ : payload data
Byte N.. : 0x00 padding to 64 bytes
```

> ホスト実装: `gpkrc-modules/deviceManagement.ts:646`
> `const unpadded = [0, commandId.gpkRCPrefix, ...validatedCommand];`

### ファームウェア → ホスト (32バイト, USB HID input report)

```
Byte  0  : 0xFA            (id_gpk_rc_prefix)
Byte  1  : command_id      (id_gpk_rc_get_value=0x02 / id_gpk_rc_set_value=0x01)
Byte  2  : action_id
Byte  3+ : payload data
Byte N.. : 0x00 padding to 32 bytes
```

> ホスト受信処理: `gpkrc-modules/deviceManagement.ts:321-324`
> ```ts
> if (buffer[0] === commandId.gpkRCPrefix) {
>     const receivedCmdId = buffer[1];
>     const receivedActionId = buffer[2];
>     const actualData = buffer.slice(3);  // payload
> }
> ```

---

## 2. デバイス識別パケット

### FW → Host: send_device_config (action: id_device_get_value=0x01)

`actualData` (buffer.slice(3)) のレイアウト:

| actualData[] | 説明 | 備考 |
|---|---|---|
| [0] | プロトコルバージョン | 固定値 `1` |
| [1] | 初期化フラグ | `device_config.init` (0=未初期化, 1=初期化済) |
| [2..] | device_name 文字列 | null終端, UTF-8 |

**device_name 一覧** (→ `gpkrc-modules/deviceTypes.ts:3-10`):

| 文字列 | 意味 | LED 対応 |
|---|---|---|
| `"keyboard"` | 通常キーボード | × |
| `"keyboard_oled"` | OLED付きキーボード | × |
| `"keyboard_tp"` | タッチパッド付きキーボード | ◯ |
| `"macropad_tp_btns"` | タッチパッド+ボタン付きマクロパッド | ◯ |

> `"macropad_tp"` も同等の動作をする。`"macropad"` は `"keyboard"` と同等の動作をする。

> LED 機能対応判定: `gpkrc.ts:145-148`
> ```ts
> const isLedDevice = device.deviceType === 'macropad_tp_btns' ||
>                    device.deviceType === 'macropad_tp' ||
>                    device.deviceType === 'keyboard_tp';
> ```

---

## 3. trackpad_config パケット

双方向で同一の19バイトレイアウト。

### FW → Host: send_trackpad_config (action: id_trackpad_get_value=0x02)

`actualData` (= FWのdata[3..21]):

| actualData[] | bits | フィールド | 型 | デフォルト値 | UI 表示名 |
|---|---|---|---|---|---|
| [0] | [7:1] | hf_waveform_number | uint7 | 48 | Haptic Pattern |
| [1] | [7] | can_hf_for_layer | bool | true | Haptic on Layer Change |
| [1] | [6] | can_drag | bool | true | Drag & Drop |
| [1] | [5:0] | scroll_term[9:4] | — | 上位6bit | — |
| [2] | [7:4] | scroll_term[3:0] | — | 下位4bit | Scroll Term |
| [2] | [3:0] | drag_term[9:6] | — | 上位4bit | — |
| [3] | [7:2] | drag_term[5:0] | — | 下位6bit | Term (drag) |
| [3] | [1] | can_trackpad_layer | bool | false | Trackpad Layer |
| [3] | [0] | can_reverse_scrolling_direction | bool | false | Reverse Vertical |
| [4] | [7] | drag_strength_mode | bool | false | Mode (Strength) |
| [4] | [6:2] | drag_strength | uint5 | 6 | Strength |
| [4] | [1:0] | default_speed[5:4] | — | 上位2bit | — |
| [5] | [7:4] | default_speed[3:0] | — | 下位4bit | Speed (0.1–5.0) |
| [5] | [3:0] | scroll_step | uint4 | 0 | Scroll Steps (lines) |
| [6] | [7] | can_short_scroll | bool | true | Short Scroll |
| [6] | [6] | can_reverse_h_scrolling_direction | bool | false | Reverse Horizontal |
| [7..8] | — | tap_term | uint16 BE | 200 | Tap Term (ms) |
| [9..10] | — | swipe_term | uint16 BE | 150 | Swipe Term (ms) |
| [11..12] | — | pinch_term | uint16 BE | 300 | Pinch Term (ms) |
| [13..14] | — | gesture_term | uint16 BE | 300 | Gesture Term (ms) |
| [15..16] | — | short_scroll_term | uint16 BE | 70 | Short Scroll Term (ms) |
| [17..18] | — | zoom_distance | uint16 BE | 400 | Pinch Distance (host名) |

**ビットパッキング詳細 (結合ロジック)**:

```
scroll_term (10bit) = joinScrollTerm(actualData[1], actualData[2])
  = ((actualData[1] & 0b00111111) << 4) | ((actualData[2] & 0b11110000) >> 4)

drag_term (10bit)   = joinDragTerm(actualData[2], actualData[3])
  = ((actualData[2] & 0b00001111) << 6) | ((actualData[3] & 0b11111100) >> 2)

default_speed (6bit) = joinDefaultSpeed(actualData[4], actualData[5])
  = ((actualData[4] & 0b00000011) << 4) | ((actualData[5] & 0b11110000) >> 4)
```

> ホスト実装: `gpkrc-modules/trackpadConfig.ts:12-28`

### Host → FW: receive_trackpad_config (action: id_trackpad_set_value=0x02)

**同一レイアウト** (data[0..18])。ホストが `saveTrackpadConfig()` で送信する際も同じバイト配列。

> ファームウェア実装: [numnum_bento_max/config/trackpad_config.c:138-183](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/trackpad_config.c#L138-L183)

---

## 4. pomodoro_config パケット

### FW → Host: send_pomodoro_config (action: id_pomodoro_get_value=0x03)

`actualData` (= FWのdata[3..10], 8バイト):

| actualData[] | bits | フィールド | デフォルト値 | UI 表示名 |
|---|---|---|---|---|
| [0] | [7:0] | work_time | 25 | Work Time (min) |
| [1] | [7:0] | break_time | 5 | Break Time (min) |
| [2] | [7:0] | long_break_time | 15 | Long Break Time (min) |
| [3] | [3:0] | work_interval | 4 | Work Interval |
| [4] | [7:0] | work_hf_pattern | 119 | Haptic (Work) |
| [5] | [7:0] | break_hf_pattern | 16 | Haptic (Break) |
| [6] | [7] | timer_active | — | (状態のみ, 設定不可) |
| [6] | [6] | notify_haptic_enable | true | Haptic Notification |
| [6] | [5] | continuous_mode | false | Continuous Mode |
| [6] | [1:0] | phase | — | (状態のみ: 0=IDLE, 1=WORK, 2=BREAK, 3=LONG_BREAK) |
| [7] | [3:0] | pomodoro_cycle | 3 | Pomodoro Cycle |

### Host → FW: receive_pomodoro_config (action: id_pomodoro_set_value=0x03)

同じバイト位置だが [6] の `timer_active` と `phase` はホスト送信時に無視される:

| data[] | bits | フィールド |
|---|---|---|
| [6] | [6] | notify_haptic_enable |
| [6] | [5] | continuous_mode |
| [6] | [7],[1:0] | 未使用 (0 で送信) |

> ホスト実装: `gpkrc-modules/pomodoroConfig.ts:12-28`
> ファームウェア実装: [numnum_bento_max/config/pomodoro_config.c:56-89, 119-142](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/pomodoro_config.c#L56-L89)

### FW → Host: send_pomodoro_active_status (action: id_pomodoro_active_get_value=0x04)

`actualData` (5バイト):

| actualData[] | bits | フィールド |
|---|---|---|
| [0] | [7] | timer_active |
| [0] | [1:0] | phase |
| [1] | [7:0] | minutes (残り時間) |
| [2] | [7:0] | seconds |
| [3] | [7:0] | current_work_interval |
| [4] | [7:0] | current_pomodoro_cycle |

> ホスト実装: `gpkrc-modules/pomodoroConfig.ts:30-38`

---

## 5. led_config パケット

### FW → Host: send_led_config (action: id_led_get_value=0x05)

`actualData` (18バイト):

| actualData[] | フィールド | UI 表示名 |
|---|---|---|
| [0..2] | pomodoro work RGB | Pomodoro Work Color |
| [3..5] | pomodoro break RGB | Pomodoro Break Color |
| [6..8] | pomodoro long_break RGB | Pomodoro Long Break Color |
| [9..11] | indicator speed RGB | Speed Indicator |
| [12..14] | indicator step RGB | Scroll Step Indicator |
| [15..17] | indicator h_scroll RGB | Horizontal Scroll Indicator |

### Host → FW: receive_led_config (action: id_led_set_value=0x04)

**同一レイアウト** (data[0..17])。

> ホスト実装: `gpkrc-modules/ledConfig.ts:12-58, 162-202`
> ファームウェア実装: [numnum_bento_max/config/led_config.c:130-178, 207-283](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/led_config.c#L130-L178)

### FW → Host: send_led_layer_config (action: id_led_layer_get_value=0x06)

`actualData`:

| actualData[] | フィールド |
|---|---|
| [0] | layer_count |
| [1..3] | layer[0] RGB |
| [4..6] | layer[1] RGB |
| ... | ... |
| [1+i*3..3+i*3] | layer[i] RGB |

### Host → FW: receive_led_layer_config (action: id_led_layer_set_value=0x05)

同一レイアウト (data[0] = layer_count, data[1..] = RGB x layer_count)。

> ホスト実装: `gpkrc-modules/ledConfig.ts:60-79, 205-230`
> ファームウェア実装: [numnum_bento_max/config/led_config.c:181-303](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/led_config.c#L181-L303)

---

## 6. OLED 書き込みパケット (operation)

### Host → FW: id_oled_write (gpkRCOperation=0x03, action=0x02)

```
[0x00, 0xFA, 0x03, 0x02, text_bytes..., 0x00]
```

`text_bytes` = 時刻文字列 `YYYY/MM/DD ddd HH:mm ` の ASCII バイト列 + null終端

> ホスト実装: `gpkrc-modules/oledDisplay.ts:33`
> ファームウェア実装: `device_config.c:94-99` (oled_write handler)

---

## 7. layer_move パケット (operation)

### Host → FW: id_layer_move (gpkRCOperation=0x03, action=0x01)

```
[0x00, 0xFA, 0x03, 0x01, target_layer]
```

`target_layer` = 移動先レイヤー番号 (0-indexed)

> ホスト実装: `gpkrc.ts:256-263`
> ファームウェア実装: `device_config.c:92-93`

---

## 8. trackpad_temp_apply パケット (operation) — Live Apply

### Host → FW: id_trackpad_temp_apply (gpkRCOperation=0x03, action=0x03)

```
[0x00, 0xFA, 0x03, 0x03, trackpad_bytes(19)...]
```

`trackpad_bytes` は §3 `receive_trackpad_config` と**同一の 19 バイトレイアウト**。
受信した値を稼働中の trackpad_config に**一時適用 (RAM のみ、EEPROM 永続化なし)** する。
Config Edit Mode の「Apply」(ライブプレビュー) で使用される。

**`id_trackpad_set_value` (0x02) との違い:**
- **永続保存しない** (`schedule_device_config_save` を呼ばない)
- **`send_set_value_complete` (ACK) を返さない** (operation 系のため layer_move/oled_write と同様)

ホストは ACK を待たず、`id_trackpad_get_value` で読み戻して反映を検証し、不一致なら再送する
(write → readback → verify → retry)。

> ホスト実装:
> - `gpkrc-modules/communication.ts:29` (`trackpadTempApply: 0x03`)
> - `gpkrc-modules/trackpadConfig.ts:108-118` (`applyTrackpadTempConfig`)
> - `ipcHandlers/configHandlers.ts:91` (`applyTrackpadTemp` — 読み戻し検証＋リトライ)
> - `preload/api.ts:244` (`applyTrackpadTemp`)

---

## 9. set_value_complete パケット

### FW → Host (action: id_set_value_complete=0x01)

Set 系コマンド受信後に FW からホストへ送信する ACK:

```
[0xFA, 0x01, 0x01, 0x00...]
```

> ファームウェア実装: `device_config.c:41-47`
> ホスト受信: `deviceManagement.ts:327-330`
