import React, { useState, useEffect } from "react";
import type { JSX } from 'react';

import { useStateContext } from "../../context.tsx";
import {
  CustomSwitch,
  CustomSelect
} from "../../components/CustomComponents.tsx";
import { useLanguage } from "../../i18n/LanguageContext.tsx";
import type { LayerSetting, ActiveWindowResult, Device, DeviceConfig, AutoLayerSettings, TrackpadConfig } from "../../types/device";
import type { SavedConfig } from "../../types/store";
import { BASELINE_CONFIG_NAME } from "../../types/store";
import { DeviceType } from '../../../gpkrc-modules/deviceTypes';
import DataTab from "../DataTab.tsx";

const { api } = window;

interface LayerSettingsProps {
    device: Device;
    isConfigEditMode?: boolean;
    onAutoLayerEnabledChange?: (enabled: boolean) => void;
    onConfigEditModeChange?: (enabled: boolean) => void;
    configEditFilename?: string;
    onConfigEditFilenameChange?: (v: string) => void;
}

const LayerSettings: React.FC<LayerSettingsProps> = ({ device, isConfigEditMode = false, onAutoLayerEnabledChange, onConfigEditModeChange, configEditFilename, onConfigEditFilenameChange }): JSX.Element => {
    const { state, setState } = useStateContext();
    const { t } = useLanguage();
    const [layerSettings, setLayerSettings] = useState<LayerSetting[]>([]);
    const [isEnabled, setIsEnabled] = useState(false);
    const [localActiveWindows, setLocalActiveWindows] = useState<ActiveWindowResult[]>([]);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [trackpadLayerEnabled, setTrackpadLayerEnabled] = useState(false);
    const [userChangedTrackpadLayer, setUserChangedTrackpadLayer] = useState(false);
    const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);

    const trackpadConfig = device.config?.trackpad || {};

    useEffect((): (() => void) => {
        const fetchActiveWindows = async (): Promise<void> => {
            if (!api || !api.getActiveWindows) return;
            try {
                const windows = await api.getActiveWindows();
                if (Array.isArray(windows) && windows.length > 0) {
                    setLocalActiveWindows(windows as ActiveWindowResult[]);
                }
            } catch (error) {
                console.error("Failed to fetch active windows:", error);
            }
        };

        void fetchActiveWindows();
        const intervalId = setInterval(fetchActiveWindows, 1000);
        return (): void => clearInterval(intervalId);
    }, []);

    useEffect((): void => {
        const loadSettingsFromStore = async (): Promise<void> => {
            try {
                if (api && device && device.id) {
                    const allSettings = await api.getAllStoreSettings();
                    const autoLayerSettings = allSettings?.autoLayerSettings as AutoLayerSettings | undefined;
                    const storedSettings = autoLayerSettings?.[device.id];

                    if (storedSettings) {
                        if (storedSettings.layerSettings) {
                            setLayerSettings(storedSettings.layerSettings);
                        }
                        if (storedSettings.enabled !== undefined) {
                            setIsEnabled(storedSettings.enabled);
                        }
                        if (!device.config) {
                            device.config = { pomodoro: {}, trackpad: {} } as DeviceConfig;
                        }
                        if (!device.config.trackpad) device.config.trackpad = {};
                        device.config.trackpad.auto_layer_enabled = storedSettings.enabled ? 1 : 0;
                        device.config.trackpad.auto_layer_settings = storedSettings.layerSettings || [];
                        (device.config as DeviceConfig & { changed?: boolean }).changed = true;

                        const newState = {
                            ...state,
                            devices: state.devices.map((d): Device => d.id === device.id ? {...device} : d)
                        };
                        await setState(newState);
                    }
                }
            } catch (error) {
                console.error("Error loading layer settings:", error);
            }
        };
        void loadSettingsFromStore();
    }, [device.id]);

    useEffect((): void => {
        const init = async (): Promise<void> => {
            try {
                setDeviceId(device.id);
                const settings = trackpadConfig?.auto_layer_settings || [];
                if (settings.length > 0 && layerSettings.length === 0) {
                    setLayerSettings(settings);
                }
                if (trackpadConfig?.auto_layer_enabled !== undefined) {
                    setIsEnabled(trackpadConfig?.auto_layer_enabled === 1);
                }
            } catch (error) {
                console.error("Error initializing layer settings:", error);
            }
        };
        void init();
    }, [device.id]);

    useEffect((): void => {
        if (trackpadConfig?.can_trackpad_layer !== undefined && !userChangedTrackpadLayer) {
            setTrackpadLayerEnabled(trackpadConfig.can_trackpad_layer === 1);
        }
    }, [trackpadConfig?.can_trackpad_layer, userChangedTrackpadLayer]);

    useEffect((): void => {
        void api.listSavedConfigs().then((configs): void => {
            setSavedConfigs(configs.filter((c): boolean => c.deviceId === device.id));
        });
    }, [device.id]);

    // Snapshot the live trackpad config as the auto-layer-off baseline (restored on edit-mode exit
    // and used as the fallback config for apps without a layer mapping).
    const persistBaseline = async (): Promise<void> => {
        if (!device.config?.trackpad) return;
        const existing = savedConfigs.find((c): boolean => c.name === BASELINE_CONFIG_NAME);
        const entry: SavedConfig = {
            id: existing?.id ?? crypto.randomUUID(),
            name: BASELINE_CONFIG_NAME,
            deviceId: device.id,
            config: { trackpad: { ...device.config.trackpad, auto_layer_enabled: 0 }, pomodoro: {} },
            savedAt: Date.now()
        };
        await api.saveConfig(entry);
        setSavedConfigs((prev): SavedConfig[] => [
            ...prev.filter((c): boolean => c.name !== BASELINE_CONFIG_NAME),
            entry
        ]);
    };

    const handleToggleEnabled = async (e: React.ChangeEvent<HTMLInputElement> | { target: { checked: boolean } }): Promise<void> => {
        const enabled = e.target.checked ? 1 : 0;
        setIsEnabled(enabled === 1);
        if (enabled === 1 && isConfigEditMode) {
            onConfigEditModeChange?.(false);
        }

        if (!e.target.checked) {
            try {
                await persistBaseline();
            } catch {
                // ignore save errors
            }
        }

        const updatedDevice: Device = {
            ...device,
            config: {
                ...(device.config ?? { pomodoro: {}, trackpad: {} }),
                trackpad: { ...(device.config?.trackpad ?? {}), auto_layer_enabled: enabled }
            } as DeviceConfig
        };

        const newState = {
            ...state,
            devices: state.devices.map((d): Device => d.id === device.id ? updatedDevice : d)
        };
        await setState(newState);
        onAutoLayerEnabledChange?.(enabled === 1);
        await saveSettingsToStore(enabled === 1, layerSettings);
    };

    const handleToggleTrackpadLayer = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const enabled = e.target.checked ? 1 : 0;
        setTrackpadLayerEnabled(enabled === 1);
        setUserChangedTrackpadLayer(true);

        const updatedDevice: Device = {
            ...device,
            config: {
                ...(device.config ?? { pomodoro: {}, trackpad: {} }),
                trackpad: { ...(device.config?.trackpad ?? {}), can_trackpad_layer: enabled }
            } as DeviceConfig
        };

        const newState = {
            ...state,
            devices: state.devices.map((d): Device => d.id === device.id ? updatedDevice : d)
        };
        await setState(newState);
        if (updatedDevice.config?.trackpad) {
            try {
                await api.saveTrackpadConfig(updatedDevice, updatedDevice.config.trackpad);
            } catch (error) {
                console.error("Error saving trackpad config:", error);
            }
        }
    };

    const handleAddLayerSetting = async (): Promise<void> => {
        const newSetting: LayerSetting = { appName: "", applicationName: "", layer: 0 };
        await updateLayerSettings([...layerSettings, newSetting]);
    };

    const handleDeleteLayerSetting = async (index: number): Promise<void> => {
        await updateLayerSettings(layerSettings.filter((_, i): boolean => i !== index));
    };

    const handleAppNameChange = async (index: number, appName: string): Promise<void> => {
        const updatedSettings = [...layerSettings];
        updatedSettings[index] = {
            ...updatedSettings[index],
            appName,
            applicationName: appName,
            layer: updatedSettings[index]?.layer || 0
        };
        await updateLayerSettings(updatedSettings);
    };

    const handleLayerChange = async (index: number, layer: string): Promise<void> => {
        const updatedSettings = [...layerSettings];
        updatedSettings[index] = {
            ...updatedSettings[index],
            layer: parseInt(layer, 10),
            applicationName: updatedSettings[index]?.applicationName || '',
            appName: updatedSettings[index]?.appName || ''
        };
        await updateLayerSettings(updatedSettings);
    };

    const handleConfigChange = async (index: number, configId: string): Promise<void> => {
        const updatedSettings = [...layerSettings];
        const current = { ...updatedSettings[index]! };
        if (configId) {
            current.savedConfigId = configId;
        } else {
            delete current.savedConfigId;
        }
        updatedSettings[index] = current;
        await updateLayerSettings(updatedSettings);
    };

    const saveSettingsToStore = async (enabled: boolean, settings: LayerSetting[]): Promise<void> => {
        try {
            if (api && deviceId) {
                const allSettings = await api.getAllStoreSettings();
                const currentSettings = (allSettings?.autoLayerSettings as AutoLayerSettings) || {};
                const updatedSettings = {
                    ...currentSettings,
                    [deviceId]: { enabled, layerSettings: settings }
                };
                await api.saveStoreSetting('autoLayerSettings', updatedSettings);
            }
        } catch (error) {
            console.error("Error saving layer settings:", error);
        }
    };

    const updateLayerSettings = async (settings: LayerSetting[]): Promise<void> => {
        setLayerSettings(settings);

        const updatedDevice: Device = {
            ...device,
            config: {
                ...(device.config ?? { pomodoro: {}, trackpad: {} }),
                trackpad: { ...(device.config?.trackpad ?? {}), auto_layer_settings: settings }
            } as DeviceConfig
        };

        const newState = {
            ...state,
            devices: state.devices.map((d): Device => d.id === device.id ? updatedDevice : d)
        };
        await setState(newState);
        await saveSettingsToStore(isEnabled, settings);
    };

    const getAppOptions = (currentAppName: string, _index: number): Array<{ value: string; label: string }> => {
        const windowsList = [
            ...new Set([
                ...(localActiveWindows.map((w): string => w.application) || []),
                ...(state.activeWindow || [])
            ])
        ];

        const baseOptions = [{ value: "", label: "--- Select Application ---" }];
        const windowOptions = windowsList.map((window): { value: string; label: string } => ({
            value: window,
            label: window
        }));

        if (currentAppName && !windowsList.includes(currentAppName) && currentAppName !== "os:win" && currentAppName !== "os:mac" && currentAppName !== "os:linux") {
            windowOptions.push({ value: currentAppName, label: currentAppName });
        }

        if (isEditing) {
            layerSettings.forEach((setting): void => {
                if (setting.appName &&
                    !windowsList.includes(setting.appName) &&
                    setting.appName !== "os:win" &&
                    setting.appName !== "os:mac" &&
                    setting.appName !== "os:linux" &&
                    !windowOptions.some((opt): boolean => opt.value === setting.appName)) {
                    windowOptions.push({ value: setting.appName, label: setting.appName });
                }
            });
        }

        return [...baseOptions, ...windowOptions];
    };

    const getConfigOptions = (): Array<{ value: string; label: string }> => {
        return [
            { value: '', label: t('layer.noConfig') },
            ...savedConfigs.map((c): { value: string; label: string } => ({ value: c.id, label: c.name }))
        ];
    };

    const getConfigName = (configId: string | undefined): string => {
        if (!configId) return '---';
        const config = savedConfigs.find((c): boolean => c.id === configId);
        return config?.name ?? '---';
    };

    const handleToggleConfigEditMode = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const enabled = e.target.checked;
        onConfigEditModeChange?.(enabled);

        if (!enabled) {
            // Restore the device to the pre-edit baseline captured when edit mode turned on.
            // Fetch fresh rather than reading savedConfigs state: on a tab-switch remount the
            // state may not have reloaded yet, but the baseline is always persisted in the store.
            const all = await api.listSavedConfigs();
            const baseline = all.find((c): boolean => c.name === BASELINE_CONFIG_NAME && c.deviceId === device.id);
            if (baseline?.config?.trackpad && device.config?.trackpad) {
                const restoredTrackpad: TrackpadConfig = {
                    ...baseline.config.trackpad,
                    auto_layer_enabled: 0,
                    auto_layer_settings: device.config.trackpad.auto_layer_settings ?? []
                };
                const updatedDevice: Device = {
                    ...device,
                    config: { ...device.config, trackpad: restoredTrackpad } as DeviceConfig
                };
                try {
                    await api.dispatchSaveDeviceConfig(updatedDevice, ['trackpad']);
                } catch {
                    // ignore device write errors
                }
                setState({
                    ...state,
                    devices: state.devices.map((d): Device => d.id === device.id ? updatedDevice : d)
                });
            }
            return;
        }

        const tasks: Promise<unknown>[] = [
            persistBaseline().catch((): void => { /* ignore save errors */ })
        ];

        if (isEnabled) {
            setIsEnabled(false);
            onAutoLayerEnabledChange?.(false);
            const updatedDevice: Device = {
                ...device,
                config: {
                    ...(device.config ?? { pomodoro: {}, trackpad: {} }),
                    trackpad: { ...(device.config?.trackpad ?? {}), auto_layer_enabled: 0 }
                } as DeviceConfig
            };
            setState({
                ...state,
                devices: state.devices.map((d): Device => d.id === device.id ? updatedDevice : d)
            });
            tasks.push(saveSettingsToStore(false, layerSettings));
        }

        await Promise.all(tasks);
    };

    const _handleEditMode = (): void => {
        setIsEditing(!isEditing);
    };

    const layerOptions = Array.from({ length: 16 }, (_, i): { value: string; label: string } => ({
        value: i.toString(),
        label: `Layer ${i}`
    }));

    return (
        <div className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-xs">
            {device.deviceType === DeviceType.KEYBOARD_TP && (
                <div className="flex items-center mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('layer.trackpadLayer')}</h3>
                    </div>
                    <div className="ml-4">
                        <CustomSwitch
                            id="config-can_trackpad_layer"
                            onChange={handleToggleTrackpadLayer}
                            checked={trackpadLayerEnabled}
                        />
                    </div>
                </div>
            )}

            <div className={`${device.deviceType === DeviceType.KEYBOARD_TP ? "border-t dark:border-gray-700 pt-4 mt-4" : ""}`}>
                <div className="flex items-center mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('layer.autoSwitching')}</h3>
                    </div>
                    <div className="ml-4">
                        <CustomSwitch
                            id="config-auto_layer_enabled"
                            onChange={handleToggleEnabled}
                            checked={isEnabled}
                        />
                    </div>
                </div>

                <div className="flex items-center mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('layer.configEditMode')}</h3>
                    </div>
                    <div className="ml-4">
                        <CustomSwitch
                            id="config-edit-mode"
                            onChange={handleToggleConfigEditMode}
                            checked={isConfigEditMode}
                        />
                    </div>
                </div>

                {isConfigEditMode ? (
                    <DataTab
                        device={device}
                        {...(configEditFilename !== undefined && { filename: configEditFilename })}
                        {...(onConfigEditFilenameChange !== undefined && { onFilenameChange: onConfigEditFilenameChange })}
                    />
                ) : isEnabled ? (
                    <div className="mt-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">{t('layer.currentMappings')}</h4>
                        {layerSettings.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.application')}
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.layer')}
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.config')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                        {layerSettings.map((setting, index): JSX.Element => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                    {setting.appName || t('layer.notSpecified')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                    {t('layer.layerNumber', { number: setting.layer })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                    {getConfigName(setting.savedConfigId)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                {t('layer.noMappingsEnabledHint')}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mt-4 mb-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-900 dark:text-white font-medium">{t('layer.appLayerMappings')}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddLayerSetting}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        {t('layer.addMapping')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {layerSettings.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.application')}
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.layer')}
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.config')}
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.actions')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                        {layerSettings.map((setting, index): JSX.Element => (
                                            <tr key={index}>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <CustomSelect
                                                        id={`app-name-${index}`}
                                                        value={setting.appName}
                                                        onChange={(e): Promise<void> => handleAppNameChange(index, e.target.value)}
                                                        options={getAppOptions(setting.appName, index)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <CustomSelect
                                                        id={`layer-${index}`}
                                                        value={setting.layer.toString()}
                                                        onChange={(e): Promise<void> => handleLayerChange(index, e.target.value)}
                                                        options={layerOptions}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <CustomSelect
                                                        id={`config-${index}`}
                                                        value={setting.savedConfigId ?? ''}
                                                        onChange={(e): Promise<void> => handleConfigChange(index, e.target.value)}
                                                        options={getConfigOptions()}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={(): Promise<void> => handleDeleteLayerSetting(index)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        {t('common.delete')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                {t('layer.noMappingsFound')}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LayerSettings;
