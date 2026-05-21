# Appendix B: Required-Feature Matrix by device_type

[日本語](./vial_firmware_appendix_b_device_matrix.ja.md)

> Host references: `gpkrc-modules/deviceTypes.ts`, `gpkrc.ts:145-148`

---

## 1. Implementation Component Matrix

| Component | keyboard | keyboard_oled | keyboard_tp | macropad_tp_btns |
|---|:---:|:---:|:---:|:---:|
| **device_config core** | ◯ required | ◯ required | ◯ required | ◯ required |
| **EEPROM management (init/save)** | — | — | ◯ required | ◯ required |
| **VIAL (VIA_ENABLE)** | ◯ required | ◯ required | ◯ required | ◯ required |
| **GPKRC_ENABLE** | ◯ required | ◯ required | ◯ required | ◯ required |
| trackpad_config | — | — | ◯ required | ◯ required |
| pomodoro_config | △ optional | △ optional | △ optional | △ optional |
| led_config | — | — | ◯ required | ◯ required |
| OLED write handler | — | ◯ required | — | — |
| Trackpad driver | — | — | ◯ required | ◯ required |
| DRV2605L (Haptic) | — | — | △ recommended | △ recommended |
| rgb_matrix (LED) | — | — | △ recommended | △ recommended |
| POINTING_DEVICE_ENABLE | — | — | ◯ required | ◯ required |

> **pomodoro_config** is linked to the trackpad's haptic feedback, so it works on devices without a trackpad but the HF notification will not function.
>
> **Only `keyboard_tp`** shows the "Trackpad Layer" toggle in the Layer tab. `macropad_tp` behaves the same as `macropad_tp_btns`, and `macropad` behaves the same as `keyboard`.

---

## 2. rules.mk Configuration Examples

### keyboard (minimal)

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

### macropad_tp_btns (with trackpad — equivalent to numnum_bento_max)

```makefile
POINTING_DEVICE_ENABLE = yes
POINTING_DEVICE_DRIVER = custom        # or a device-specific driver
VIA_ENABLE = yes
VIAL_ENABLE = yes
VIALRGB_ENABLE = yes                    # RGB Matrix + Vial integration
CONSOLE_ENABLE = yes                    # for debugging (can be removed in production)
GPKRC_ENABLE = yes
SRC += i2c_master.c \
       device/iqs5xx.c \
       config/trackpad_config.c \
       timer/pomodoro.c \
       config/pomodoro_config.c \
       config/device_config.c \
       config/led_config.c
```

> Reference: [numnum_bento_max/rules.mk](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/rules.mk), [numnum_bento_max/keymaps/vial/rules.mk](https://github.com/darakuneko/keyboard/blob/main/qmk/numnum_bento_max/keymaps/vial/rules.mk)

---

## 3. Required keyboard.json features

| Feature | Required when |
|---|---|
| `"mousekey": true` | Trackpad devices (uses mouse report) |
| `"extrakey": true` | Recommended for nearly all devices |
| `"rgb_matrix": true` | When using LED features |
| `"haptic": true` | When using DRV2605L haptic |
| `"encoder_map": true` | When using encoders |

---

## 4. GPK Utility Tab Mapping

| device_type | Displayed tabs/features |
|---|---|
| keyboard | Layer (Auto Layer), App Settings |
| keyboard_oled | Above + OLED settings |
| keyboard_tp | Above (no OLED) + all Trackpad features + LED + **Trackpad Layer toggle** |
| macropad_tp_btns | keyboard + all Trackpad features + Pomodoro + LED |

---

## 5. device_name String ↔ deviceType Mapping

The string returned by the firmware's `send_device_config()` determines what the app displays.

```c
// device_config.c: send_device_config()
const char device_name[] = "macropad_tp_btns";  // ← change to match your device ("macropad_tp" is also valid)
memcpy(&data[5], device_name, sizeof(device_name));
```

Host-side conversion: `gpkrc-modules/deviceTypes.ts:15-33`
```ts
// stringToDeviceType() converts to an enum
"macropad_tp_btns" → DeviceType.MACROPAD_TP_BTNS
```

---

## 6. EEPROM Size Requirements

Minimum size to specify for `#define EECONFIG_USER_DATA_SIZE`:

| Components used | Required size (approx.) |
|---|---|
| device_config (init flag only) | 4 bytes |
| + trackpad_config_t | ~16 bytes |
| + pomodoro_config_t | ~8 bytes |
| + led_config (9 layers + pomodoro + indicator) | ~64 bytes |
| **Full configuration total** | **~96 bytes** |

> numnum_bento_max: `#define EECONFIG_USER_DATA_SIZE 128` (set with headroom)
>
> For RP2040, `#define EECONFIG_USER_DATA_SIZE` can be any value within the limit
> defined in `quantum/eeprom/eeprom_driver.h`.
