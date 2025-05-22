# GPK Utility
![Image](https://github.com/user-attachments/assets/706d0026-5f85-492e-bf3a-8cf3270cd40f)

- [English](./README.md)
- [日本語](./README.ja.md)

**GPK Utility** is a configuration utility for touchpads and keyboards.<br>
It provides customization features tailored to each connected device.<br>

This application constantly monitors the state of the active window and offers a layer switching function. <br>
For this reason, it continues to reside in the task tray (or system tray) even after the window is closed.<br>
If you do not wish to use these functions, you can configure the application via the menu to terminate when the window is closed.<br>
![Image](https://github.com/user-attachments/assets/b9a13791-89b5-4eea-942b-cd967c2d444d)

#### Notice
Some touchpad settings may interfere with the proper operation of the device depending on the configuration.<br>
Please review and apply settings carefully. <br>
If any operational issues occur, you can initialize the device settings by pressing the **"EEPROM Clear"** button within the application.<br>


## Feature Tabs

### Common

#### Layer
Manage layer (mode) settings.<br>Switch between different operation modes.

- **Trackpad Layer**: Switch to a dedicated layer while touching the trackpad
- **Haptic Feedback on Layer Change**: Enable/disable haptic feedback and pattern settings for layer changes (See Haptic section)
- **Automatic Layer Switching**: Automatically switch layers based on active applications
  - Automatically switches to a specified layer when a specific application becomes active

#### Haptic
Configure haptic feedback settings.
- **Haptic Feedback on Layer Change**: Enable/disable haptic feedback when the layer changes.
- **Haptic Pattern**: Select the haptic feedback pattern for layer changes.

### Trackpad Features

#### Mouse
Customize mouse cursor behavior.

- **Speed**: Adjust pointer movement speed from 0.1 to 5.0 (higher values are faster)

#### Scroll
Adjust scroll speed and direction settings.<br>Configure smooth scrolling and direction inversion.

- **Direction Inversion**: Invert scrolling direction (standard/inverted)
- **Short Scroll**: Enable/disable high-volume scrolling with short scroll operations
- **Scroll Term**: Adjust scroll inertia duration in the range of 0-300ms
- **Scroll Steps**: Adjust the number of lines moved per scroll action (1-16 lines)
- **Short Scroll Term**: Adjust the time to activate short scroll (0-500ms)

#### Drag & Drop
Configure drag and drop behavior.

- **Drag & Drop**: Enable/disable drag & drop functionality
- **Mode**: Select drag mode
  - Term: Time-based drag control
  - Strength: Intensity-based drag control
- **Term**: Adjust the time it takes to enter drag state (0-1000ms)
- **Strength**: Adjust the intensity required to enter drag state (1-12)

#### Timer
Configure time management features like Pomodoro Timer.<br>Adjust work and break times.

- **Work Time**: Set Pomodoro work time (1-60 minutes)
- **Break Time**: Set short break time (1-30 minutes)
- **Long Break Time**: Set long break time (1-60 minutes)
- **Work Interval Until Long Break**: Set the number of work/break intervals before a long break (1-10)
- **Haptic Feedback**: Configure haptic feedback patterns for work start and break start.
- **Continuous Mode**: Automatically start the next session (work/break) without manual intervention.
- **Desktop Notifications**: Enable/disable desktop notifications for Pomodoro phase changes.
- **Haptic Feedback Notifications**: Enable/disable haptic feedback notifications for Pomodoro phase changes.

#### Gesture
Configure trackpad gesture settings.
- **Tap Term**: Maximum time for a tap to be registered (0-500ms)
- **Swipe Term**: Maximum time for a swipe to be registered (0-500ms)
- **Pinch Term**: Maximum time for a pinch gesture to be registered (0-500ms)
- **Pinch Distance**: Minimum distance for a pinch gesture to be registered (0-500)
- **Gesture Term**: Maximum time for other gestures to be registered (0-500ms)

### Application Settings

- **Language**: Change the application language
- **Import/Export Settings**: Import or export all device and app settings as a file
- **System Tray**: Minimize to tray when closed, start minimized to tray
- **Device Polling Interval**: Adjust how often the app polls devices for status (200-2000ms)

### Keyboard Features

#### OLED
Display settings for keyboard OLED screens

- **Time Display**: Show current time on the OLED display

## Other Features

- Import/Export settings
- System tray functionality
  - Minimize to tray when closed
  - Start minimized to tray
- Language Settings: Change the application language.

## Usage

1. Connect your compatible GPK device to your PC
2. Launch GPK Utility
3. Select your device from the top tabs
4. Choose the feature you want to configure from the left menu
5. Adjust settings and apply them to your device

## Compatible Devices
https://github.com/darakuneko/vial-qmk/tree/gpk_rc

Use the gpk_rc branch and be sure to add GPKRC_ENABLE = yes to your rules.mk

rules.mk<br>
GPKRC_ENABLE = yes

