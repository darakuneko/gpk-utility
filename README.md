# GPK Utility

- [English](./README.md)
- [日本語](./README.ja.md)

GPK Utility is a configuration tool for trackpads and keyboards.<br>
It provides customization features tailored to each device.

## Feature Tabs

### Common

#### Layer
Manage layer (mode) settings.<br>Switch between different operation modes.

- **Trackpad Layer**: Switch to a dedicated layer while touching the trackpad
- **Haptic Feedback on Layer Change**: Enable/disable haptic feedback and pattern settings for layer changes
- **Automatic Layer Switching**: Automatically switch layers based on active applications
  - Automatically switches to a specified layer when a specific application becomes active

### Trackpad Features

#### Mouse
Customize mouse cursor behavior.

- **Speed**: Adjust pointer movement speed from 0.1 to 5.0 (higher values are faster)

#### Scroll
Adjust scroll speed and direction settings.<br>Configure smooth scrolling and direction inversion.

- **Direction Inversion**: Invert scrolling direction (standard/inverted)
- **Short Scroll**: Enable/disable high-volume scrolling with short scroll operations
- **Term**: Adjust scroll inertia duration in the range of 0-300ms
- **Scroll Steps**: Adjust the number of lines moved per scroll action (1-16 lines)

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
- **Cycles Until Long Break**: Set the number of work/break cycles before a long break (1-10)
- **Haptic Feedback**: Configure haptic feedback patterns for work start, break start, and long break start

### Keyboard Features

#### OLED
Display settings for keyboard OLED screens

- **Time Display**: Show current time on the OLED display

## Other Features

- Import/Export settings
- System tray functionality
  - Minimize to tray when closed
  - Start minimized to tray

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

