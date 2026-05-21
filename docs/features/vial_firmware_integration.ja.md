# Vial ファームウェア GPK Utility 対応 実装仕様書

[English](./vial_firmware_integration.md)

> 関連付録:
> - [付録A: パケット/構造体ビット早見表](./vial_firmware_appendix_a_packets.ja.md)
> - [付録B: device_type 別必須機能マトリクス](./vial_firmware_appendix_b_device_matrix.ja.md)
> - [付録C: ホスト UI ↔ ビットフィールド対応](./vial_firmware_appendix_c_host_mapping.ja.md)
> - [付録D: 実装チェックリスト](./vial_firmware_appendix_d_checklist.ja.md)

---

## 0. 対象読者と前提

**対象**: 自作 Vial キーボード/タッチパッドを GPK Utility で設定可能にしたい開発者。

**前提条件**:
- QMK / Vial ファームウェアの基本的な知識
- `darakuneko/vial-qmk` の `gpk-utility` ブランチを使用する
- 参考実装: `https://github.com/darakuneko/keyboard/tree/main/qmk/numnum_bento_max` (macropad_tp_btns 型)

**注意**: アプリが複数の通信ソフト (Vial アプリ等) と競合する。GPK Utility 起動前に他アプリを終了すること。

---

## 1. アーキテクチャ概要

### 1.1 通信レイヤ

```
GPK Utility (Electron)
    │
    ├─ Main Process (index.ts)
    │   └─ gpkrc-modules/deviceManagement.ts ── HID 読み書き
    │
    └─ Preload (preload/device.ts, preload/api.ts)
        └─ IPC 経由でレンダラーに API を公開

Vial キーボード (QMK)
    └─ raw_hid_receive → gpk_rc_handle_command_user()
```

**HID プロトコル**:
- Usage Page: `0xFF60`
- Usage: `0x61`
- パケットサイズ: ホスト→FW 64バイト / FW→ホスト 32バイト
- 先頭バイト (prefix): `0xFA`

> ホスト参照: `gpkrc-modules/communication.ts:40-43`

### 1.2 デバイス検出条件

アプリは起動時に接続済み HID デバイスをスキャンし、以下の条件を満たすものを対象とする:

1. `serialNumber` が `"vial:"` で始まる (Vial ファームウェアが自動付与)
2. HID Usage Page = `0xFF60`、Usage = `0x61`

> ホスト参照: `gpkrc-modules/deviceManagement.ts:96-101`

### 1.3 コマンド体系

| command_id | 値 | 用途 |
|---|---|---|
| `customSetValue` | `0x01` | ホスト → FW: 設定書き込み |
| `customGetValue` | `0x02` | ホスト → FW: 設定読み出し要求 |
| `gpkRCOperation` | `0x03` | ホスト → FW: layer_move / oled_write / trackpad_temp_apply |

| action_id (Set) | 値 | 対象 |
|---|---|---|
| `setValueComplete` | `0x01` | FW → Host ACK |
| `trackpadSetValue` | `0x02` | タッチパッド設定 |
| `pomodoroSetValue` | `0x03` | Pomodoro 設定 |
| `ledSetValue` | `0x04` | LED 設定 |
| `ledLayerSetValue` | `0x05` | LED レイヤー設定 |

| action_id (Get) | 値 | 対象 |
|---|---|---|
| `deviceGetValue` | `0x01` | デバイス識別情報 |
| `trackpadGetValue` | `0x02` | タッチパッド設定 |
| `pomodoroGetValue` | `0x03` | Pomodoro 設定 |
| `pomodoroActiveGetValue` | `0x04` | Pomodoro 動作状態 |
| `ledGetValue` | `0x05` | LED 設定 |
| `ledLayerGetValue` | `0x06` | LED レイヤー設定 |

| action_id (Operation) | 値 | 用途 |
|---|---|---|
| `layerMove` | `0x01` | レイヤー切替 |
| `oledWrite` | `0x02` | OLED テキスト書き込み |
| `trackpadTempApply` | `0x03` | タッチパッド設定の一時適用 (Live Apply, 非永続) |

> ホスト参照: `gpkrc-modules/communication.ts:2-29`

---

## 2. ファームウェアセットアップ

### 2.1 vial-qmk ブランチ

```bash
git clone https://github.com/darakuneko/vial-qmk.git
cd vial-qmk
git checkout gpk-utility
```

このブランチには `GPKRC_ENABLE = yes` を有効化するビルドシステムと、
`gpk_rc_handle_command_user()` を呼び出す `raw_hid_receive` フックが含まれる。

### 2.2 rules.mk

キーボードルートの `rules.mk` — 実装パターンにより異なる:

**keyboard / keyboard_oled:**
```makefile
OLED_ENABLE = yes    # keyboard_oled のみ
GPKRC_ENABLE = yes
SRC += config/device_config.c
```
**keyboard_tp / macropad_tp 系:**
```makefile
POINTING_DEVICE_ENABLE = yes
POINTING_DEVICE_DRIVER = custom
GPKRC_ENABLE = yes
SRC += i2c_master.c device/iqs5xx.c config/trackpad_config.c timer/pomodoro.c config/pomodoro_config.c config/device_config.c config/led_config.c
```

キーマップの `keymaps/<name>/rules.mk`:

```makefile
VIA_ENABLE = yes
VIAL_ENABLE = yes
VIALRGB_ENABLE = yes       # RGB Matrix + Vial 連携が必要な場合
```

> 参照: [numnum_bento_max/rules.mk](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/rules.mk), [numnum_bento_max/keymaps/vial/rules.mk](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/keymaps/vial/rules.mk)

### 2.3 config.h

```c
// Vial 識別子 (vial-qmk の Vial configurator で生成)
#define VIAL_KEYBOARD_UID {0xEA, 0xFA, 0x04, 0x88, 0x9B, 0x23, 0xD8, 0xFB}

// Vial セキュリティ解除コンボ
#define VIAL_UNLOCK_COMBO_ROWS {1, 1}
#define VIAL_UNLOCK_COMBO_COLS {5, 6}

// EEPROM ユーザーデータサイズ (device_config_t より大きく設定)
#define EECONFIG_USER_DATA_SIZE 128

// タッチパッドが MOUSE_EXTENDED_REPORT を必要とする場合
#define MOUSE_EXTENDED_REPORT

// Haptic (DRV2605L) 使用時
#define DRV2605L_FB_ERM_LRA 0
#define DRV2605L_RATED_VOLTAGE 3
#define DRV2605L_V_PEAK 5
#define DRV2605L_F_LRA 205
```

> 参照: [numnum_bento_max/config.h](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config.h)

### 2.4 vial.json のカスタムキーコード

GPK Utility 連携に必要なカスタムキーコードを `vial.json` に定義する:

```json
{
  "customKeycodes": [
    {"shortName": "Layer UP",  "title": "Layer UP",           "name": "U_Layer_UP"},
    {"shortName": "Layer DOWN","title": "Layer DOWN",          "name": "U_Layer_DOWN"},
    {"shortName": "Pomodoro",  "title": "Pomodoro Toggle",     "name": "U_POMODR_TGL"},
    {"shortName": "EEPROM Clr","title": "EEPROM Clear",        "name": "U_EEP_CLR"},
    {"shortName": "H-Scroll",  "title": "Horizontal Scrolling","name": "U_H_SCROLL"},
    {"shortName": "Drag Drop", "title": "Toggle Drag Mode",    "name": "U_DRAGDROP"},
    {"shortName": "Accel 2x",  "title": "Mouse Accel 2x",     "name": "U_M_ACL_2x"},
    {"shortName": "Accel 4x",  "title": "Mouse Accel 4x",     "name": "U_M_ACL_4x"},
    {"shortName": "Accel 1/2", "title": "Mouse Accel 1/2",    "name": "U_M_ACL_HALF"},
    {"shortName": "Accel 1/4", "title": "Mouse Accel 1/4",    "name": "U_M_ACL_QUARTER"},
    {"shortName": "Accel UP",  "title": "Mouse Accel UP",     "name": "U_M_ACL_UP"},
    {"shortName": "Accel DOWN","title": "Mouse Accel DOWN",    "name": "U_M_ACL_DOWN"},
    {"shortName": "Scroll 2x", "title": "Scroll Step 2x",     "name": "U_S_ACL_2x"},
    {"shortName": "Scroll 4x", "title": "Scroll Step 4x",     "name": "U_S_ACL_4x"},
    {"shortName": "Scroll 8x", "title": "Scroll Step 8x",     "name": "U_S_ACL_8x"},
    {"shortName": "Scroll Step","title": "Scroll Step UP",     "name": "U_S_ACL_STEP"}
  ]
}
```

> 参照: [numnum_bento_max/keymaps/vial/vial.json](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/keymaps/vial/vial.json)

---

## 3. device_config (中核実装)

全 device_type で必須。実装は **最小構成** (`keyboard`, `keyboard_oled`) と **フル構成** (`keyboard_tp`, `macropad_tp_btns`) の 2 パターンに分かれる。

### 3.1 device_config.h

**最小構成 (keyboard / keyboard_oled)** — struct・EEPROM 不要:
```c
#pragma once
#include "gpk_rc.h"
enum id_device_get_value_t { id_device_get_value = 0x01 };
enum id_device_operation_t { id_layer_move = 0x01, id_oled_write = 0x02 };
```

**フル構成 (keyboard_tp / macropad_tp 系)**:
```c
#pragma once
#include "gpk_rc.h"
#include "trackpad_config.h"
#include "pomodoro_config.h"
#include "led_config.h"
#define SAVE_DEVICE_CONFIG_TERM 5000
typedef struct {
    bool init : 1;
    trackpad_config_t trackpad_config;
    pomodoro_config_t pomodoro_config;
    device_led_config_t led_config;
} device_config_t;
extern device_config_t device_config;
```

### 3.2 enum 定義 — フル構成のみ (最小構成は §3.1 の 2 enum で足りる)

```c
enum id_device_set_value_t {
    id_set_value_complete   = 0x01,
    id_trackpad_set_value   = 0x02,
    id_pomodoro_set_value   = 0x03,
    id_led_set_value        = 0x04,
    id_led_layer_set_value  = 0x05
};

enum id_device_get_value_t {
    id_device_get_value          = 0x01,
    id_trackpad_get_value        = 0x02,
    id_pomodoro_get_value        = 0x03,
    id_pomodoro_active_get_value = 0x04,
    id_led_get_value             = 0x05,
    id_led_layer_get_value       = 0x06
};

enum id_device_operation_t {
    id_layer_move          = 0x01,
    id_oled_write          = 0x02,
    id_trackpad_temp_apply = 0x03   // Live Apply: RAM 一時適用 (非永続) — tp 系のみ
};
```

> ホスト参照: `gpkrc-modules/communication.ts:10-29`

### 3.3 EEPROM 永続化 (device_config.c) — keyboard_tp / macropad_tp 系のみ

```c
device_config_t device_config;
static bool save_pending = false;
static uint32_t save_timer = 0;
static device_config_t pending_config;

void init_device_config(device_config_t *cfg) {
    eeconfig_init_user_datablock();
    init_trackpad_config(&cfg->trackpad_config);  // tp 系のみ
    init_pomodoro_config(&cfg->pomodoro_config);
    init_led_config(&cfg->led_config);            // LED 対応機種のみ
    cfg->init = 1;
    save_device_config(*cfg);
}

void save_device_config(device_config_t cfg) {
    eeconfig_update_user_datablock(&cfg, 0, sizeof(cfg));
}

void schedule_device_config_save(device_config_t cfg) {
    pending_config = cfg;
    save_timer = timer_read32();
    save_pending = true;
}

void check_and_save_device_config(void) {
    if (save_pending && timer_elapsed32(save_timer) >= SAVE_DEVICE_CONFIG_TERM) {
        save_device_config(pending_config);
        save_pending = false;
    }
}
```

> 参照: [numnum_bento_max/config/device_config.c:8-39](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/device_config.c#L8-L39)

### 3.4 gpk_rc_handle_command_user() (device_config.c)

`GPKRC_ENABLE = yes` により、`raw_hid_receive` から自動的に呼び出される。

**最小構成 (keyboard / keyboard_oled)** — get_value は action に関わらず常に `send_device_config()` を返す:
```c
void gpk_rc_handle_command_user(uint8_t id, uint8_t action, uint8_t *data, uint8_t length) {
    if (id == id_gpk_rc_get_value)        send_device_config();
    else if (id == id_gpk_rc_operation) {
        if (action == id_layer_move) layer_move(data[0]);
#ifdef OLED_ENABLE
        else if (action == id_oled_write && is_oled_on()) oled_write((const char*)data, false);
#endif
    }
}
```

**フル構成 (keyboard_tp / macropad_tp 系)**:
```c
void gpk_rc_handle_command_user(uint8_t id, uint8_t action,
                                uint8_t *data, uint8_t length) {
    if (id == id_gpk_rc_set_value) {
        if (action == id_trackpad_set_value) {
            receive_trackpad_config(data);
            send_set_value_complete();
        } else if (action == id_pomodoro_set_value) {
            receive_pomodoro_config(data);
            send_set_value_complete();
        } else if (action == id_led_set_value) {
            receive_led_config(data);
            send_set_value_complete();
        } else if (action == id_led_layer_set_value) {
            receive_led_layer_config(data);
            send_set_value_complete();
        }
    } else if (id == id_gpk_rc_get_value) {
        if (action == id_device_get_value)          send_device_config();
        if (action == id_trackpad_get_value)        send_trackpad_config(&device_config.trackpad_config);
        if (action == id_pomodoro_get_value)        send_pomodoro_config(&device_config.pomodoro_config);
        if (action == id_pomodoro_active_get_value) send_pomodoro_active_status(&device_config.pomodoro_config);
        if (action == id_led_get_value)             send_led_config(&device_config.led_config);
        if (action == id_led_layer_get_value)       send_led_layer_config(&device_config.led_config);
    } else if (id == id_gpk_rc_operation) {
        if (action == id_layer_move) {
            layer_move(data[0]);
        } else if (action == id_oled_write) {
#ifdef OLED_ENABLE
            if (is_oled_on()) oled_write((const char *)data, false);
#endif
        } else if (action == id_trackpad_temp_apply) {
            // Live Apply (Config Edit Mode "Apply"): parse the same 19-byte trackpad
            // payload as id_trackpad_set_value and apply it to the running config for
            // live preview, but RAM only:
            //   - do NOT call schedule_device_config_save() (no EEPROM persist)
            //   - do NOT call send_set_value_complete()    (no ACK; operation command)
            // The host does not wait for an ACK; it reads back via id_trackpad_get_value
            // and retries until the values match.
            apply_trackpad_config_temp(data);   // apply to RAM without persisting
        }
    }
}
```

> `apply_trackpad_config_temp()` は `receive_trackpad_config()` と同じ 19 バイトを解釈して
> 稼働中の `trackpad_config` に反映するが、`schedule_device_config_save()` と
> `send_set_value_complete()` を呼ばない点だけが異なる (パケット詳細: 付録A §8)。

> 参照: [numnum_bento_max/config/device_config.c:61-102](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/device_config.c#L61-L102)

### 3.5 send_device_config() — デバイス識別

```c
void send_device_config(void) {
    uint8_t data[32] = {0};
    data[0] = id_gpk_rc_prefix;
    data[1] = id_gpk_rc_get_value;
    data[2] = id_device_get_value;
    data[3] = 1;                        // protocol version
    data[4] = device_config.init;       // init flag

    // device_type を決定する文字列 — GPK Utility の表示を制御する
    const char device_name[] = "macropad_tp_btns";  // ← 機種に合わせて変更 ("macropad_tp" も可)
    memcpy(&data[5], device_name, sizeof(device_name));
    raw_hid_send(data, sizeof(data));
}

void send_set_value_complete(void) {
    uint8_t data[32] = {0};
    data[0] = id_gpk_rc_prefix;
    data[1] = id_gpk_rc_set_value;
    data[2] = id_set_value_complete;
    raw_hid_send(data, sizeof(data));
}
```

> **最小構成 (keyboard_oled)**: `data[4] = 1` ハードコード — `device_config.init` は参照しない。

**device_name 選択指針** (→ 付録B 参照):
- キーボードのみ: `"keyboard"` (`"macropad"` も可)
- OLED 付きキーボード: `"keyboard_oled"`
- タッチパッド付き: `"keyboard_tp"` / `"macropad_tp_btns"` (`"macropad_tp"` も可)

> 参照: [numnum_bento_max/config/device_config.c:49-58](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/device_config.c#L49-L58)

---

## 4. サブシステム実装

### 4.1 trackpad_config (tp 系のみ)

`trackpad_config_t` の定義とパッキング仕様 → **付録A §3** 参照。

**初期値** (`init_trackpad_config` で設定):

| フィールド | デフォルト |
|---|---|
| hf_waveform_number | 48 |
| can_hf_for_layer | true |
| can_drag | true |
| scroll_term | 100 ms |
| drag_term | 500 ms |
| default_speed | 10 (UI表示: 1.0) |
| scroll_step | 0 |
| tap_term | 200 ms |
| swipe_term | 150 ms |
| pinch_term | 300 ms |
| gesture_term | 300 ms |
| short_scroll_term | 70 ms |
| zoom_distance | 400 |

> 参照: [numnum_bento_max/config/trackpad_config.h](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/trackpad_config.h), `trackpad_config.c:19-44`

**必須実装関数**:
- `init_trackpad_config(trackpad_config_t *)`
- `send_trackpad_config(const trackpad_config_t *)` — パケット送信
- `receive_trackpad_config(uint8_t *data)` — パケット受信・反映
- `update_trackpad_config(trackpad_config_t, bool should_save)` — 状態更新

### 4.2 pomodoro_config (任意)

**初期値** (`init_pomodoro_config` で設定):

| フィールド | デフォルト |
|---|---|
| work_time | 25 min |
| break_time | 5 min |
| long_break_time | 15 min |
| work_interval | 4 |
| work_hf_pattern | 119 |
| break_hf_pattern | 16 |
| notify_haptic_enable | true |
| continuous_mode | false |
| pomodoro_cycle | 3 |

タイマー本体 (`timer/pomodoro.c`) が必要:
- `pomodoro_update()` を `matrix_scan_user` から毎回呼び出す
- `pomodoro_toggle()` を `U_POMODR_TGL` キーコードハンドラーから呼ぶ

> 参照: [numnum_bento_max/config/pomodoro_config.h](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/pomodoro_config.h), `timer/pomodoro.c`

### 4.3 led_config (LED 対応機種のみ)

対象: `macropad_tp_btns`, `macropad_tp`, `keyboard_tp` のみ。

`device_led_config_t` の構成:
- `layer_colors[9]` — 各レイヤーの RGB (最大9レイヤー)
- `layer_count` — 実際のレイヤー数
- `pomodoro_colors` — work/break/long_break の RGB
- `indicator_colors` — speed/step/h_scroll インジケーターの RGB

**必須実装関数**:
- `init_led_config(device_led_config_t *)` — デフォルトカラー設定
- `send_led_config(const device_led_config_t *)` — 18バイト送信
- `send_led_layer_config(const device_led_config_t *)` — layer_count + RGB 送信
- `receive_led_config(uint8_t *)`, `receive_led_layer_config(uint8_t *)` — 受信・反映

LED インジケーターの実際の表示は `rgb_matrix_indicators_user()` で実装する。
- `is_pomodoro_flashing()` が true の間: `get_pomodoro_flash_color()` で点滅
- 通常時: `device_led_config.layer_colors[current_layer]` で全灯

> 参照: [numnum_bento_max/config/led_config.h](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/config/led_config.h), `led_config.c`

### 4.4 OLED 出力 (keyboard_oled のみ)

`gpk_rc_handle_command_user` 内の `id_oled_write` ハンドラーで受信テキストを書き込む。
アプリは毎分 `YYYY/MM/DD ddd HH:mm ` 形式で時刻を送信する。

```c
} else if (action == id_oled_write) {
#ifdef OLED_ENABLE
    if (is_oled_on()) oled_write((const char *)data, false);
#endif
}
```

> ホスト参照: `gpkrc-modules/oledDisplay.ts:26-34`

---

## 5. キーマップ Hook

### 5.1 keyboard_post_init_user

```c
void keyboard_post_init_user(void) {
    // EEPROM からコンフィグ読込
    eeconfig_read_user_datablock(&device_config, 0, sizeof(device_config));

    // タッチパッドドライバ初期化 (tp 系のみ)
    init_iqs5xx();
    wait_ms(300);

    // 未初期化の場合はデフォルト値で初期化・保存
    if (!device_config.init) {
        init_device_config(&device_config);
    }

    // ランタイムに設定を反映
    set_trackpad_config(device_config.trackpad_config);  // tp 系のみ
    set_pomodoro_config(device_config.pomodoro_config);
    set_led_config(device_config.led_config);             // LED 対応機種のみ
}
```

> 参照: [numnum_bento_max/keymaps/vial/keymap.c:547-560](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/keymaps/vial/keymap.c#L547-L560)

### 5.2 matrix_scan_user

```c
void matrix_scan_user(void) {
    // タッチパッド読み取り + マウスレポート送信 (tp 系のみ)
    // ... iqs5xx_data_t 処理 ...

    // Pomodoro タイマー更新
    if (timer_active) {
        pomodoro_update();
    }

    // 遅延 EEPROM 保存チェック
    check_and_save_device_config();
}
```

> 参照: [numnum_bento_max/keymaps/vial/keymap.c:572-674](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/keymaps/vial/keymap.c#L572-L674)

### 5.3 process_record_user — カスタムキーコード

```c
enum {
    U_Layer_UP = QK_KB_0,
    U_Layer_DOWN,
    U_M_ACL_2x, U_M_ACL_4x, U_M_ACL_HALF, U_M_ACL_QUARTER,
    U_M_ACL_UP, U_M_ACL_DOWN,
    U_S_ACL_2x, U_S_ACL_4x, U_S_ACL_8x, U_S_ACL_STEP,
    U_DRAGDROP,
    U_POMODR_TGL,
    U_EEP_CLR,
    U_H_SCROLL
};

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    switch (keycode) {
        case U_POMODR_TGL:
            if (record->event.pressed) pomodoro_toggle();
            return false;
        case U_EEP_CLR:
            if (record->event.pressed) {
                eeconfig_init();
                init_device_config(&device_config);
                soft_reset_keyboard();
            }
            return false;
        case U_DRAGDROP:
            if (record->event.pressed) use_drag = !use_drag;
            return false;
        case U_H_SCROLL:
            if (record->event.pressed) {
                use_horizontal_scrolling = !use_horizontal_scrolling;
            }
            return false;
        // ... 他のキーコード ...
        default:
            return true;
    }
}
```

> 参照: [numnum_bento_max/keymaps/vial/keymap.c:413-550](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/keymaps/vial/keymap.c#L413-L550)

---

## 6. hires_scroll オプション

タッチパッドのハイレゾスクロール対応が必要な場合、`keymaps/vial_hires_scroll/config.h` に定義する:
```c
#define POINTING_DEVICE_HIRES_SCROLL_ENABLE
#define POINTING_DEVICE_HIRES_SCROLL_MULTIPLIER 50
#define POINTING_DEVICE_HIRES_SCROLL_WHEEL_ENABLE
#define POINTING_DEVICE_HIRES_SCROLL_EXPONENT 0
#define WHEEL_EXTENDED_REPORT
```
> 参照: [numnum_bento_max/keymaps/vial_hires_scroll/config.h](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/keymaps/vial_hires_scroll/config.h)

---

## 7. 検証手順

1. **デバイス認識**: GPK Utility 起動 → 上部タブにデバイス名が表示されること
2. **設定読み込み**: 各タブを開き、ファームウェアのデフォルト値が表示されること
3. **設定保存**: スライダーを変更 → デバイスに反映されること (CONSOLE_ENABLE で uprintf 確認)
4. **EEPROM 永続化**: 設定変更後 5 秒待ち、デバイスを再接続して同じ値が読み込まれること
5. **EEPROM Clear**: `U_EEP_CLR` キーを押してデフォルト値に戻ること
6. **Auto Layer**: Layer タブで自動レイヤー設定を行い、アプリ切り替えでレイヤーが変わること
7. **Pomodoro**: タイマー設定 → `U_POMODR_TGL` でタイマー開始 → トレイメニューに進捗表示

---

## 8. トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| デバイスが認識されない | シリアル番号が `vial:` で始まらない | VIAL_ENABLE が正しく設定されているか確認 |
| デバイスが認識されない | Usage Page / Usage が不一致 | `GPKRC_ENABLE = yes` が有効か確認 |
| 設定が反映されない | `gpk_rc_handle_command_user` が呼ばれない | `GPKRC_ENABLE = yes` と SRC に `device_config.c` が含まれているか確認 |
| EEPROM に保存されない | `check_and_save_device_config` が未呼び出し | `matrix_scan_user` に追加 |
| 起動時に設定リセットされる | `EECONFIG_USER_DATA_SIZE` が足りない | 128 以上に設定 |
| LED タブが表示されない | device_name が不正 | `"macropad_tp_btns"`, `"keyboard_tp"` のいずれかに設定 |
| Vial と競合する | 複数アプリが HID を同時使用 | GPK Utility 起動前に Vial を終了 |
