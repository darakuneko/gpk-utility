# Appendix C: Host UI ↔ Bit-Field Mapping

[日本語](./vial_firmware_appendix_c_host_mapping.ja.md)

> Host UI reference: `src/renderer/settings/`
> Host receive reference: `gpkrc-modules/trackpadConfig.ts`, `pomodoroConfig.ts`, `ledConfig.ts`

---

## 1. Layer Tab (layerSettings.tsx)

| UI Item | Function | FW Implementation | Notes |
|---|---|---|---|
| Trackpad Layer | Switch to a dedicated layer while touching the trackpad | `trackpad_config.can_trackpad_layer` | **Shown only for keyboard_tp**. Fixed to layer 3 (numnum_bento_max) |
| Haptic on Layer Change | Haptic on layer change | `trackpad_config.can_hf_for_layer` | |
| Automatic Layer Switch | Per-app automatic layer | electron-store + `layer_move` operation | Realized via an operation sent to the FW |

Automatic Layer Switch is driven by the host (`gpkrc-modules/windowMonitoring.ts`),
which monitors the active window and sends `layer_move`. No special FW implementation is required.

---

## 2. Haptic Tab (hapticSettings.tsx)

| UI Item | FW Field | Packet Position | Range |
|---|---|---|---|
| Haptic Pattern (number) | `hf_waveform_number` | trackpad actualData[0] bits[7:1] | 1–127 |

> UI reference: `src/renderer/settings/hapticSettings.tsx:31-33`

---

## 3. Mouse Tab (mouseSettings.tsx)

| UI Item | FW Field | Packet Position | UI ↔ FW Conversion |
|---|---|---|---|
| Speed (0.1–5.0) | `default_speed` | actualData[4][1:0] + actualData[5][7:4] | UI × 10 = FW value |

`default_speed` is a 6-bit value (0–63). The UI displays it as a decimal (`FW value / 10`).

> UI reference: `src/renderer/settings/mouseSettings.tsx:26-38`

---

## 4. Scroll Tab (scrollSettings.tsx)

| UI Item | FW Field | Packet Position | Range |
|---|---|---|---|
| Reverse Vertical | `can_reverse_scrolling_direction` | actualData[3] bit[0] | bool |
| Reverse Horizontal | `can_reverse_h_scrolling_direction` | actualData[6] bit[6] | bool |
| Scroll Term (ms) | `scroll_term` | actualData[1][5:0] + actualData[2][7:4] | 0–300 |
| Scroll Steps (lines) | `scroll_step` | actualData[5] bits[3:0] | 0–15 (UI: +1 displayed) |
| Short Scroll | `can_short_scroll` | actualData[6] bit[7] | bool |
| Short Scroll Term (ms) | `short_scroll_term` | actualData[15..16] | 0–500 |

> UI reference: `src/renderer/settings/scrollSettings.tsx`
>
> `scroll_step` UI display: `scroll_step + 1` (0 → "1 line", 15 → "16 lines")

---

## 5. Drag & Drop Tab (dragDropSettings.tsx)

| UI Item | FW Field | Packet Position | Range |
|---|---|---|---|
| Drag & Drop (enable) | `can_drag` | actualData[1] bit[6] | bool |
| Mode: Term | `drag_strength_mode = false` | actualData[4] bit[7] | bool |
| Mode: Strength | `drag_strength_mode = true` | actualData[4] bit[7] | bool |
| Term (ms) | `drag_term` | actualData[2][3:0] + actualData[3][7:2] | 0–1000 |
| Strength | `drag_strength` | actualData[4] bits[6:2] | 1–12 |

> UI reference: `src/renderer/settings/dragDropSettings.tsx`

---

## 6. Gesture Tab (gestureSettings.tsx)

| UI Item | FW Field | Packet Position | Range |
|---|---|---|---|
| Tap Term (ms) | `tap_term` | actualData[7..8] | 0–500 |
| Swipe Term (ms) | `swipe_term` | actualData[9..10] | 0–500 |
| Pinch Term (ms) | `pinch_term` | actualData[11..12] | 0–500 |
| Gesture Term (ms) | `gesture_term` | actualData[13..14] | 0–500 |
| Pinch Distance | `zoom_distance` (FW) / `pinch_distance` (host) | actualData[17..18] | 0–500 |

> `zoom_distance` (FW-side name) = `pinch_distance` (host-side TypeScript name)
> Host reference: `gpkrc-modules/trackpadConfig.ts:50`

---

## 7. Timer Tab (timerSettings.tsx)

| UI Item | FW Field | actualData[] | Range |
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

**Read-only fields** (FW → Host only, ignored on Set):
- `timer_active` ([6] bit[7])
- `phase` ([6] bits[1:0]): 0=IDLE, 1=WORK, 2=BREAK, 3=LONG_BREAK

> Host reference: `gpkrc-modules/pomodoroConfig.ts:12-28`

---

## 8. LED Tab (ledSettings.tsx)

Targets: `macropad_tp_btns`, `macropad_tp`, `keyboard_tp` only

### send_led_config / receive_led_config (18 bytes)

| UI Item | FW Field | actualData[] |
|---|---|---|
| Pomodoro Work Color | `pomodoro_colors.work_r/g/b` | [0..2] |
| Pomodoro Break Color | `pomodoro_colors.break_r/g/b` | [3..5] |
| Pomodoro Long Break Color | `pomodoro_colors.long_break_r/g/b` | [6..8] |
| Speed Indicator Color | `indicator_colors.speed_r/g/b` | [9..11] |
| Scroll Step Indicator Color | `indicator_colors.step_r/g/b` | [12..14] |
| Horizontal Scroll Indicator | `indicator_colors.h_scroll_r/g/b` | [15..17] |

### send_led_layer_config / receive_led_layer_config

| UI Item | FW Field | actualData[] |
|---|---|---|
| Layer Count | `layer_count` | [0] |
| Layer 0 Color | `layer_colors[0].r/g/b` | [1..3] |
| Layer 1 Color | `layer_colors[1].r/g/b` | [4..6] |
| Layer N Color | `layer_colors[N].r/g/b` | [1+N*3 .. 3+N*3] |

**LED operating condition**: Works only when the RGB Effect is in `Solid Color` mode.
Opening the color picker automatically switches to that layer.

> Host reference: `gpkrc-modules/ledConfig.ts:12-79`
> Firmware reference: [numnum_bento_max/config/led_config.h](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/led_config.h), `led_config.c`

---

## 9. OLED Tab (OLEDSettings.tsx)

Target: `keyboard_oled` only

| UI Item | Function | FW Implementation |
|---|---|---|
| Time Display (on/off) | Show the time on the last line of the OLED | Receives the `id_oled_write` operation |

The app writes a string in the format `YYYY/MM/DD ddd HH:mm ` to the OLED every minute.
The FW only needs to call `oled_write()`. The OLED layout itself is managed by the FW.

> Host reference: `gpkrc-modules/oledDisplay.ts:26-34`

---

## 10. App Settings (AppSettings.tsx)

| UI Item | FW Relationship | Notes |
|---|---|---|
| Language | None | electron-store only |
| Import / Export | Entire device_config | Applied in bulk when a device connects |
| Minimize to Tray | None | electron-store only |
| Device Polling Interval | HID polling interval | Host-side only (200–2000ms) |

---

## 11. Config Edit Mode (settingEdit.tsx / layerSettings.tsx)

Save and apply per-device presets of Mouse / Scroll / Drag & Drop / Gesture (= trackpad_config).

| UI Item | Function | FW Implementation | Notes |
|---|---|---|---|
| Apply (live preview) | Temporarily apply the selected preset | `id_trackpad_temp_apply` operation (0x03) | RAM only, non-persistent. The host verifies via read-back |
| Save / Default / View / Rename / Delete | Preset management | None | electron-store only (FW not involved) |

"Apply" reflects trackpad_config on the device **without persisting it**, allowing settings to be tried out.
After applying, the host reads back via `id_trackpad_get_value` and re-sends until the values match.

> Host reference: `ipcHandlers/configHandlers.ts:91` (`applyTrackpadTemp`),
> `gpkrc-modules/trackpadConfig.ts:108-118` (`applyTrackpadTempConfig`)
> Packet details: Appendix A §8
