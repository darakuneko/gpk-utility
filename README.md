# GPK Utility [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/darakuneko/gpk-utility)
![Image](https://github.com/user-attachments/assets/706d0026-5f85-492e-bf3a-8cf3270cd40f)

[README (日本語)](./README.ja.md)

**GPK Utility** is a configuration utility for touchpads and keyboards.<br>
It provides customization features tailored to each connected device.<br>

This application constantly monitors the state of the active window and offers a layer switching function. <br>
For this reason, it continues to reside in the task tray (or system tray) even after the window is closed.<br>
If you do not wish to use these functions, you can configure the application via the menu to terminate when the window is closed.<br>
![Image](https://github.com/user-attachments/assets/b9a13791-89b5-4eea-942b-cd967c2d444d)

#### Notice
Please do not launch any applications that communicate with the device, such as Vial, before starting GPK Utility.  
If the device is not recognized when multiple applications are running simultaneously, please close all related applications, reconnect the device, and then launch GPK Utility.  
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
- **Registration Method**: When you activate an application you wish to configure, it will be added to the select list.  
  Only the 10 most recent applications will be kept in the list.  
  The list will be reset when the application is restarted.

https://github.com/user-attachments/assets/ba6a7bcf-7245-4bfc-9b17-367660a74c7d

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
- **Scroll Term**: Adjust the interval between scroll commands within a range of 0–300 ms.
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
Configure time management settings for the Pomodoro timer.  
You can adjust both the work time and break time intervals.  

![Image](https://github.com/user-attachments/assets/bc964f72-80b5-40a8-9988-5310a1126fa4)

The timer is disabled when the device starts up.  
Press **Pomodoro Toggle** to start the timer.

- **Work Time**: Set Pomodoro work time (1-60 minutes)
- **Break Time**: Set short break time (1-30 minutes)
- **Long Break Time**: Set long break time (1-60 minutes)
- **Work Interval**: Set the number of work/break intervals before a long break (1-10)
- **Pomodoro Cycle**: Set the number of work interval repetitions (1-10)
- **Haptic Feedback**: Configure haptic feedback patterns for work start and break start.
- **Continuous Mode**: Automatically start the next session (work/break) without manual intervention.
- **Desktop Notifications**: Enable/disable desktop notifications for Pomodoro phase changes.  
Notified when the GPK Utility is inactive.
- **Haptic Feedback Notifications**: Enable/disable haptic feedback notifications for Pomodoro phase changes.
During **Break** and **Long Break**, the notification will be active for 30 seconds.  
While the notification is active, tap operations on the trackpad will be disabled.  
Double-tap the trackpad to dismiss the notification.

Enable or disable haptic notifications when the Pomodoro phase changes.  
During **Break** and **Long Break**, the notification will be active for 30 seconds.  
While the notification is active, tap operations on the trackpad will be disabled.  
Double-tap the trackpad to dismiss the notification.

On supported devices, certain LEDs will light up according to the device status (only when in `solid_color` mode).

Work - RED  
![RED](https://github.com/user-attachments/assets/18df9665-6e15-411e-a44b-80f67e20b3cb)  
Break - GREEN  
![GREEN](https://github.com/user-attachments/assets/07c4853a-408d-4321-897a-69f009da559b)  
Long Break - BLUE  
![BLUE](https://github.com/user-attachments/assets/d8f952c1-e35a-46e3-b6fd-e4bd8a21cbc8)  

#### Gesture
Configure touchpad gesture settings
- **Tap Term**: Interval before the next tap gesture can be recognized (0–500 ms)
- **Swipe Term**: Interval before the next swipe gesture can be recognized (0–500 ms)
- **Pinch Term**: Interval before the next pinch gesture can be recognized (0–500 ms)
- **Pinch Distance**: Minimum distance required to recognize the next pinch gesture (0–500)
- **Gesture Term**: Interval before the next gesture can be recognized (0–500 ms)

### Application Settings

- **Language**: Change the application language
- **Import/Export Settings**: Import or export all device and app settings as a file
- **System Tray**: Minimize to tray when closed, start minimized to tray
- **Device Polling Interval**: Adjust how often the app polls devices for status (200-2000ms)

### Keyboard Features

#### OLED
Display settings for keyboard OLED screens

- **Time Display**: Displays the current time on the last line of the OLED screen.

## Other Features

- Import/Export settings
- System tray functionality
  - Minimize to tray when closed
  - Start minimized to tray
- Language Settings: Change the application language.
- Updates: Information on the latest 10 updates.

## Usage

1. Connect your compatible GPK device to your PC
2. Launch GPK Utility
3. Select your device from the top tabs
4. Choose the feature you want to configure from the left menu
5. Adjust settings and apply them to your device

## Custom Devices
https://github.com/darakuneko/vial-qmk/tree/gpk-utility

If you would like to make your own Vial-compatible keyboard work with this utility, please use the `gpk-utility` branch and make sure to add the following line to your `rules.mk`.

```
rules.mk  
GPKRC_ENABLE = yes
```

### Definitions
- **Device**:  
  https://github.com/darakuneko/vial-qmk/blob/gpk-utility/quantum/gpk_rc.h  
- **Application**:  
  https://github.com/darakuneko/gpk-utility/blob/main/gpkrc.js  

### Examples
- **Keyboard (Auto Layer Switch / OLED)**: [gpk60_47gr1re_vial](https://github.com/darakuneko/keyboard/tree/main/qmk/gpk60_47gr1re_vial)  
- **Trackpad**: [numnum bento](https://github.com/darakuneko/keyboard/tree/main/qmk/numnum_bento)

**Specifications are subject to change without notice.**
