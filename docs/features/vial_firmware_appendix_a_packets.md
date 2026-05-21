# Appendix A: Packet / Struct Bit-Packing Reference

[日本語](./vial_firmware_appendix_a_packets.ja.md)

> Host references: `gpkrc-modules/communication.ts`, `gpkrc-modules/trackpadConfig.ts`,
> `gpkrc-modules/pomodoroConfig.ts`, `gpkrc-modules/ledConfig.ts`
>
> Firmware reference: [numnum_bento_max/config/device_config.c](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/device_config.c),
> `trackpad_config.c`, `pomodoro_config.c`, `led_config.c`

---

## 1. Common HID Packet Format

### Host → Firmware (64 bytes, USB HID output report)

```
Byte  0  : 0x00            (HID report ID / padding)
Byte  1  : 0xFA            (gpkRCPrefix)
Byte  2  : command_id      (customSetValue=0x01 / customGetValue=0x02 / gpkRCOperation=0x03)
Byte  3  : action_id
Byte  4+ : payload data
Byte N.. : 0x00 padding to 64 bytes
```

> Host implementation: `gpkrc-modules/deviceManagement.ts:646`
> `const unpadded = [0, commandId.gpkRCPrefix, ...validatedCommand];`

### Firmware → Host (32 bytes, USB HID input report)

```
Byte  0  : 0xFA            (id_gpk_rc_prefix)
Byte  1  : command_id      (id_gpk_rc_get_value=0x02 / id_gpk_rc_set_value=0x01)
Byte  2  : action_id
Byte  3+ : payload data
Byte N.. : 0x00 padding to 32 bytes
```

> Host receive handling: `gpkrc-modules/deviceManagement.ts:321-324`
> ```ts
> if (buffer[0] === commandId.gpkRCPrefix) {
>     const receivedCmdId = buffer[1];
>     const receivedActionId = buffer[2];
>     const actualData = buffer.slice(3);  // payload
> }
> ```

---

## 2. Device Identification Packet

### FW → Host: send_device_config (action: id_device_get_value=0x01)

`actualData` (buffer.slice(3)) layout:

| actualData[] | Description | Notes |
|---|---|---|
| [0] | Protocol version | Fixed value `1` |
| [1] | Init flag | `device_config.init` (0=uninitialized, 1=initialized) |
| [2..] | device_name string | null-terminated, UTF-8 |

**device_name list** (→ `gpkrc-modules/deviceTypes.ts:3-10`):

| String | Meaning | LED Support |
|---|---|---|
| `"keyboard"` | Standard keyboard | × |
| `"keyboard_oled"` | Keyboard with OLED | × |
| `"keyboard_tp"` | Keyboard with trackpad | ◯ |
| `"macropad_tp_btns"` | Macropad with trackpad + buttons | ◯ |

> `"macropad_tp"` behaves the same way. `"macropad"` behaves the same as `"keyboard"`.

> LED capability check: `gpkrc.ts:145-148`
> ```ts
> const isLedDevice = device.deviceType === 'macropad_tp_btns' ||
>                    device.deviceType === 'macropad_tp' ||
>                    device.deviceType === 'keyboard_tp';
> ```

---

## 3. trackpad_config Packet

Identical 19-byte layout in both directions.

### FW → Host: send_trackpad_config (action: id_trackpad_get_value=0x02)

`actualData` (= FW's data[3..21]):

| actualData[] | bits | Field | Type | Default | UI Label |
|---|---|---|---|---|---|
| [0] | [7:1] | hf_waveform_number | uint7 | 48 | Haptic Pattern |
| [1] | [7] | can_hf_for_layer | bool | true | Haptic on Layer Change |
| [1] | [6] | can_drag | bool | true | Drag & Drop |
| [1] | [5:0] | scroll_term[9:4] | — | upper 6 bits | — |
| [2] | [7:4] | scroll_term[3:0] | — | lower 4 bits | Scroll Term |
| [2] | [3:0] | drag_term[9:6] | — | upper 4 bits | — |
| [3] | [7:2] | drag_term[5:0] | — | lower 6 bits | Term (drag) |
| [3] | [1] | can_trackpad_layer | bool | false | Trackpad Layer |
| [3] | [0] | can_reverse_scrolling_direction | bool | false | Reverse Vertical |
| [4] | [7] | drag_strength_mode | bool | false | Mode (Strength) |
| [4] | [6:2] | drag_strength | uint5 | 6 | Strength |
| [4] | [1:0] | default_speed[5:4] | — | upper 2 bits | — |
| [5] | [7:4] | default_speed[3:0] | — | lower 4 bits | Speed (0.1–5.0) |
| [5] | [3:0] | scroll_step | uint4 | 0 | Scroll Steps (lines) |
| [6] | [7] | can_short_scroll | bool | true | Short Scroll |
| [6] | [6] | can_reverse_h_scrolling_direction | bool | false | Reverse Horizontal |
| [7..8] | — | tap_term | uint16 BE | 200 | Tap Term (ms) |
| [9..10] | — | swipe_term | uint16 BE | 150 | Swipe Term (ms) |
| [11..12] | — | pinch_term | uint16 BE | 300 | Pinch Term (ms) |
| [13..14] | — | gesture_term | uint16 BE | 300 | Gesture Term (ms) |
| [15..16] | — | short_scroll_term | uint16 BE | 70 | Short Scroll Term (ms) |
| [17..18] | — | zoom_distance | uint16 BE | 400 | Pinch Distance (host name) |

**Bit-packing details (join logic):**

```
scroll_term (10bit) = joinScrollTerm(actualData[1], actualData[2])
  = ((actualData[1] & 0b00111111) << 4) | ((actualData[2] & 0b11110000) >> 4)

drag_term (10bit)   = joinDragTerm(actualData[2], actualData[3])
  = ((actualData[2] & 0b00001111) << 6) | ((actualData[3] & 0b11111100) >> 2)

default_speed (6bit) = joinDefaultSpeed(actualData[4], actualData[5])
  = ((actualData[4] & 0b00000011) << 4) | ((actualData[5] & 0b11110000) >> 4)
```

> Host implementation: `gpkrc-modules/trackpadConfig.ts:12-28`

### Host → FW: receive_trackpad_config (action: id_trackpad_set_value=0x02)

**Identical layout** (data[0..18]). The host sends the same byte array when calling `saveTrackpadConfig()`.

> Firmware implementation: [numnum_bento_max/config/trackpad_config.c:138-183](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/trackpad_config.c#L138-L183)

---

## 4. pomodoro_config Packet

### FW → Host: send_pomodoro_config (action: id_pomodoro_get_value=0x03)

`actualData` (= FW's data[3..10], 8 bytes):

| actualData[] | bits | Field | Default | UI Label |
|---|---|---|---|---|
| [0] | [7:0] | work_time | 25 | Work Time (min) |
| [1] | [7:0] | break_time | 5 | Break Time (min) |
| [2] | [7:0] | long_break_time | 15 | Long Break Time (min) |
| [3] | [3:0] | work_interval | 4 | Work Interval |
| [4] | [7:0] | work_hf_pattern | 119 | Haptic (Work) |
| [5] | [7:0] | break_hf_pattern | 16 | Haptic (Break) |
| [6] | [7] | timer_active | — | (status only, not configurable) |
| [6] | [6] | notify_haptic_enable | true | Haptic Notification |
| [6] | [5] | continuous_mode | false | Continuous Mode |
| [6] | [1:0] | phase | — | (status only: 0=IDLE, 1=WORK, 2=BREAK, 3=LONG_BREAK) |
| [7] | [3:0] | pomodoro_cycle | 3 | Pomodoro Cycle |

### Host → FW: receive_pomodoro_config (action: id_pomodoro_set_value=0x03)

Same byte positions, but `timer_active` and `phase` in [6] are ignored when sent by the host:

| data[] | bits | Field |
|---|---|---|
| [6] | [6] | notify_haptic_enable |
| [6] | [5] | continuous_mode |
| [6] | [7],[1:0] | unused (sent as 0) |

> Host implementation: `gpkrc-modules/pomodoroConfig.ts:12-28`
> Firmware implementation: [numnum_bento_max/config/pomodoro_config.c:56-89, 119-142](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/pomodoro_config.c#L56-L89)

### FW → Host: send_pomodoro_active_status (action: id_pomodoro_active_get_value=0x04)

`actualData` (5 bytes):

| actualData[] | bits | Field |
|---|---|---|
| [0] | [7] | timer_active |
| [0] | [1:0] | phase |
| [1] | [7:0] | minutes (remaining time) |
| [2] | [7:0] | seconds |
| [3] | [7:0] | current_work_interval |
| [4] | [7:0] | current_pomodoro_cycle |

> Host implementation: `gpkrc-modules/pomodoroConfig.ts:30-38`

---

## 5. led_config Packet

### FW → Host: send_led_config (action: id_led_get_value=0x05)

`actualData` (18 bytes):

| actualData[] | Field | UI Label |
|---|---|---|
| [0..2] | pomodoro work RGB | Pomodoro Work Color |
| [3..5] | pomodoro break RGB | Pomodoro Break Color |
| [6..8] | pomodoro long_break RGB | Pomodoro Long Break Color |
| [9..11] | indicator speed RGB | Speed Indicator |
| [12..14] | indicator step RGB | Scroll Step Indicator |
| [15..17] | indicator h_scroll RGB | Horizontal Scroll Indicator |

### Host → FW: receive_led_config (action: id_led_set_value=0x04)

**Identical layout** (data[0..17]).

> Host implementation: `gpkrc-modules/ledConfig.ts:12-58, 162-202`
> Firmware implementation: [numnum_bento_max/config/led_config.c:130-178, 207-283](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/led_config.c#L130-L178)

### FW → Host: send_led_layer_config (action: id_led_layer_get_value=0x06)

`actualData`:

| actualData[] | Field |
|---|---|
| [0] | layer_count |
| [1..3] | layer[0] RGB |
| [4..6] | layer[1] RGB |
| ... | ... |
| [1+i*3..3+i*3] | layer[i] RGB |

### Host → FW: receive_led_layer_config (action: id_led_layer_set_value=0x05)

Identical layout (data[0] = layer_count, data[1..] = RGB × layer_count).

> Host implementation: `gpkrc-modules/ledConfig.ts:60-79, 205-230`
> Firmware implementation: [numnum_bento_max/config/led_config.c:181-303](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/led_config.c#L181-L303)

---

## 6. OLED Write Packet (operation)

### Host → FW: id_oled_write (gpkRCOperation=0x03, action=0x02)

```
[0x00, 0xFA, 0x03, 0x02, text_bytes..., 0x00]
```

`text_bytes` = ASCII byte sequence of the time string `YYYY/MM/DD ddd HH:mm ` + null terminator

> Host implementation: `gpkrc-modules/oledDisplay.ts:33`
> Firmware implementation: `device_config.c:94-99` (oled_write handler)

---

## 7. layer_move Packet (operation)

### Host → FW: id_layer_move (gpkRCOperation=0x03, action=0x01)

```
[0x00, 0xFA, 0x03, 0x01, target_layer]
```

`target_layer` = destination layer number (0-indexed)

> Host implementation: `gpkrc.ts:256-263`
> Firmware implementation: `device_config.c:92-93`

---

## 8. trackpad_temp_apply Packet (operation) — Live Apply

### Host → FW: id_trackpad_temp_apply (gpkRCOperation=0x03, action=0x03)

```
[0x00, 0xFA, 0x03, 0x03, trackpad_bytes(19)...]
```

`trackpad_bytes` uses the **same 19-byte layout** as `receive_trackpad_config` in §3.
The received values are applied to the running trackpad_config **temporarily (RAM only, no EEPROM persistence)**.
Used by the Config Edit Mode "Apply" (live preview).

**Difference from `id_trackpad_set_value` (0x02):**
- **Does not persist** (does not call `schedule_device_config_save`)
- **Does not return `send_set_value_complete` (ACK)** (it is an operation command, like layer_move/oled_write)

The host does not wait for an ACK; it reads back via `id_trackpad_get_value` to verify, and re-sends on mismatch
(write → readback → verify → retry).

> Host implementation:
> - `gpkrc-modules/communication.ts:29` (`trackpadTempApply: 0x03`)
> - `gpkrc-modules/trackpadConfig.ts:108-118` (`applyTrackpadTempConfig`)
> - `ipcHandlers/configHandlers.ts:91` (`applyTrackpadTemp` — read-back verification + retry)
> - `preload/api.ts:244` (`applyTrackpadTemp`)

---

## 9. set_value_complete Packet

### FW → Host (action: id_set_value_complete=0x01)

ACK sent from FW to host after receiving a Set-type command:

```
[0xFA, 0x01, 0x01, 0x00...]
```

> Firmware implementation: `device_config.c:41-47`
> Host receive: `deviceManagement.ts:327-330`
