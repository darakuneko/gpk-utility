# 付録B: device_type 別 必須機能マトリクス

> ホスト参照: `gpkrc-modules/deviceTypes.ts`, `gpkrc.ts:145-148`

---

## 1. 実装コンポーネント マトリクス

| コンポーネント | keyboard | keyboard_oled | keyboard_tp | macropad_tp_btns |
|---|:---:|:---:|:---:|:---:|
| **device_config core** | ◯必須 | ◯必須 | ◯必須 | ◯必須 |
| **EEPROM管理 (init/save)** | — | — | ◯必須 | ◯必須 |
| **VIAL (VIA_ENABLE)** | ◯必須 | ◯必須 | ◯必須 | ◯必須 |
| **GPKRC_ENABLE** | ◯必須 | ◯必須 | ◯必須 | ◯必須 |
| trackpad_config | — | — | ◯必須 | ◯必須 |
| pomodoro_config | △任意 | △任意 | △任意 | △任意 |
| led_config | — | — | ◯必須 | ◯必須 |
| OLED write handler | — | ◯必須 | — | — |
| タッチパッドドライバ | — | — | ◯必須 | ◯必須 |
| DRV2605L (Haptic) | — | — | △推奨 | △推奨 |
| rgb_matrix (LED) | — | — | △推奨 | △推奨 |
| POINTING_DEVICE_ENABLE | — | — | ◯必須 | ◯必須 |

> **pomodoro_config** はタッチパッドの Haptic フィードバックと連動するため、タッチパッドなし機種では動作するが HF通知は機能しない。
>
> **`keyboard_tp` のみ** Layer タブに「Trackpad Layer」トグルが表示される。`macropad_tp` は `macropad_tp_btns` と、`macropad` は `keyboard` と同等の動作をする。

---

## 2. rules.mk 構成例

### keyboard (最小構成)

```makefile
VIA_ENABLE = yes
VIAL_ENABLE = yes
GPKRC_ENABLE = yes
SRC += config/device_config.c
```

### keyboard_oled

```makefile
VIA_ENABLE = yes
VIAL_ENABLE = yes
GPKRC_ENABLE = yes
OLED_ENABLE = yes
SRC += config/device_config.c
```

### macropad_tp_btns (タッチパッド付き — numnum_bento_max と同等)

```makefile
POINTING_DEVICE_ENABLE = yes
POINTING_DEVICE_DRIVER = custom        # またはデバイス固有ドライバ
VIA_ENABLE = yes
VIAL_ENABLE = yes
VIALRGB_ENABLE = yes                    # RGB Matrix + Vial 連携
CONSOLE_ENABLE = yes                    # デバッグ用 (本番では削除可)
GPKRC_ENABLE = yes
SRC += i2c_master.c \
       device/iqs5xx.c \
       config/trackpad_config.c \
       timer/pomodoro.c \
       config/pomodoro_config.c \
       config/device_config.c \
       config/led_config.c
```

> 参照: [numnum_bento_max/rules.mk](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/rules.mk), [numnum_bento_max/keymaps/vial/rules.mk](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/keymaps/vial/rules.mk)

---

## 3. keyboard.json 必須 features

| 機能 | 必須条件 |
|---|---|
| `"mousekey": true` | タッチパッド系 (mouse report 使用) |
| `"extrakey": true` | ほぼ全機種推奨 |
| `"rgb_matrix": true` | LED 機能使用時 |
| `"haptic": true` | DRV2605L Haptic 使用時 |
| `"encoder_map": true` | エンコーダー使用時 |

---

## 4. GPK Utility 表示タブ対応

| device_type | 表示されるタブ/機能 |
|---|---|
| keyboard | Layer (Auto Layer), App Settings |
| keyboard_oled | 上記 + OLED 設定 |
| keyboard_tp | 上記 (OLED なし) + Trackpad全機能 + LED + **Trackpad Layer トグル** |
| macropad_tp_btns | keyboard + Trackpad全機能 + Pomodoro + LED |

---

## 5. device_name 文字列 と deviceType の対応

ファームウェアの `send_device_config()` で返す文字列がアプリの表示を決定する。

```c
// device_config.c: send_device_config()
const char device_name[] = "macropad_tp_btns";  // ← 機種に合わせて変更 ("macropad_tp" も可)
memcpy(&data[5], device_name, sizeof(device_name));
```

ホスト側の変換: `gpkrc-modules/deviceTypes.ts:15-33`
```ts
// stringToDeviceType() で enum に変換
"macropad_tp_btns" → DeviceType.MACROPAD_TP_BTNS
```

---

## 6. EEPROM サイズ要件

`#define EECONFIG_USER_DATA_SIZE` に指定すべき最小サイズ:

| 使用コンポーネント | 必要サイズ (目安) |
|---|---|
| device_config (init flag のみ) | 4 bytes |
| + trackpad_config_t | ~16 bytes |
| + pomodoro_config_t | ~8 bytes |
| + led_config (9 layers + pomodoro + indicator) | ~64 bytes |
| **フル構成合計** | **~96 bytes** |

> numnum_bento_max: `#define EECONFIG_USER_DATA_SIZE 128` (余裕を持って設定)
>
> RP2040 の場合 `#define EECONFIG_USER_DATA_SIZE` は `quantum/eeprom/eeprom_driver.h` の
> 上限内であれば任意の値を指定可能。
