import React, { useState, useEffect } from "react";

import { useStateContext, useDeviceType } from "../../context.tsx";
import { 
  CustomSwitch,
  CustomSelect
} from "../../components/CustomComponents.tsx";
import { useLanguage } from "../../i18n/LanguageContext.tsx";
import type { LayerSetting, ActiveWindowResult } from "../../types/device";

const { api } = window;

const LayerSettings: React.FC<any> = ({ device, handleChange: _handleChange }) => {
    const { state, setState } = useStateContext();
    const DeviceType = useDeviceType();
    const { t } = useLanguage();
    const [layerSettings, setLayerSettings] = useState<LayerSetting[]>([]);
    const [isEnabled, setIsEnabled] = useState(false);
    const [localActiveWindows, setLocalActiveWindows] = useState<ActiveWindowResult[]>([]);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [trackpadLayerEnabled, setTrackpadLayerEnabled] = useState(false);
    const [userChangedTrackpadLayer, setUserChangedTrackpadLayer] = useState(false);

    // Get trackpad configuration or empty object if not defined
    const trackpadConfig = device.config?.trackpad || {};

    useEffect(() => {
        const fetchActiveWindows = async () => {
            if (!api || !api.getActiveWindows) return;
            
            try {
                const windows = await api.getActiveWindows();
                if (Array.isArray(windows) && windows.length > 0) {
                    setLocalActiveWindows(windows);
                }
            } catch (error) {
                console.error("Failed to fetch active windows:", error);
            }
        };
        
        void fetchActiveWindows();
        
        const intervalId = setInterval(fetchActiveWindows, 1000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const loadSettingsFromStore = async () => {
            try {
                if (api && api.getStoreSetting && api.getAllStoreSettings && device && device.id) { 
                    const allSettings = await api.getAllStoreSettings(); 
                    const storedSettings = allSettings && allSettings.autoLayerSettings ? allSettings.autoLayerSettings[device.id] : undefined;
                        
                    if (storedSettings) {
                            if (storedSettings.layerSettings) {
                                setLayerSettings(storedSettings.layerSettings);
                            }
                            
                            if (storedSettings.enabled !== undefined) {
                                setIsEnabled(storedSettings.enabled);
                            }
                            
                            if (!device.config) device.config = {};
                            if (!device.config.trackpad) device.config.trackpad = {};
                            device.config.trackpad.auto_layer_enabled = storedSettings.enabled ? 1 : 0;
                            device.config.trackpad.auto_layer_settings = storedSettings.layerSettings || [];
                            device.config.changed = true;
                            
                            const newState = {
                                ...state,
                                devices: state.devices.map(d => d.id === device.id ? {...device} : d)
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

    useEffect(() => {
        const init = async () => {
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
    
    useEffect(() => {
        if (trackpadConfig?.can_trackpad_layer !== undefined && !userChangedTrackpadLayer) {
            const newValue = trackpadConfig.can_trackpad_layer === 1;
            setTrackpadLayerEnabled(newValue);
        }
    }, [trackpadConfig?.can_trackpad_layer, userChangedTrackpadLayer]);
    
    const handleToggleEnabled = async (e: React.ChangeEvent<HTMLInputElement> | { target: { checked: boolean } }) => {
        const enabled = e.target.checked ? 1 : 0;
        setIsEnabled(enabled === 1);
        
        const updatedDevice = {...device};
        if (!updatedDevice.config) updatedDevice.config = {};
        if (!updatedDevice.config.trackpad) updatedDevice.config.trackpad = {};
        updatedDevice.config.trackpad.auto_layer_enabled = enabled; 

        const newState = {
            ...state,
            devices: state.devices.map(d => d.id === device.id ? updatedDevice : d)
        };
        
        await setState(newState);
        await saveSettingsToStore(enabled === 1, layerSettings);
    };
    
    const handleToggleTrackpadLayer = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const enabled = e.target.checked ? 1 : 0;
        setTrackpadLayerEnabled(enabled === 1);
        setUserChangedTrackpadLayer(true);
                
        const updatedDevice = {...device};
        if (!updatedDevice.config) updatedDevice.config = {};
        if (!updatedDevice.config.trackpad) updatedDevice.config.trackpad = {};
        updatedDevice.config.trackpad.can_trackpad_layer = enabled;

        const newState = {
            ...state,
            devices: state.devices.map(d => d.id === device.id ? updatedDevice : d)
        };
        
        await setState(newState);
        if (updatedDevice.config.trackpad) {
            try {
                await api.saveTrackpadConfig(updatedDevice);
            } catch (error) {
                console.error("Error saving trackpad config:", error);
            }
        }
    };
    
    const handleAddLayerSetting = async () => {
        const newSetting: LayerSetting = { appName: "", applicationName: "", layer: 0 };
        const updatedSettings = [...layerSettings, newSetting];
        
        await updateLayerSettings(updatedSettings);
    };
    
    const handleDeleteLayerSetting = async (index: number) => {
        const updatedSettings = layerSettings.filter((_, i) => i !== index);
        
        await updateLayerSettings(updatedSettings);
    };
    
    const handleAppNameChange = async (index: number, appName: string) => {
        const updatedSettings = [...layerSettings];
        updatedSettings[index] = {...updatedSettings[index], appName, applicationName: appName, layer: updatedSettings[index]?.layer || 0};
        
        await updateLayerSettings(updatedSettings);
    };
    
    const handleLayerChange = async (index: number, layer: string) => {
        const updatedSettings = [...layerSettings];
        updatedSettings[index] = {...updatedSettings[index], layer: parseInt(layer, 10), applicationName: updatedSettings[index]?.applicationName || '', appName: updatedSettings[index]?.appName || ''};
        
        await updateLayerSettings(updatedSettings);
    };
    
    const saveSettingsToStore = async (enabled: boolean, settings: LayerSetting[]) => {
        try {
            if (api && api.getStoreSetting && api.saveStoreSetting && deviceId) { // Changed
                const allSettings = await api.getAllStoreSettings();
                const currentSettings = allSettings.autoLayerSettings || {};
                
                const updatedSettings = {
                    ...currentSettings,
                    [deviceId]: {
                        enabled,
                        layerSettings: settings
                    }
                };
                
                await api.saveStoreSetting('autoLayerSettings', updatedSettings); // Use unified API
            }
        } catch (error) {
            console.error("Error saving layer settings:", error);
        }
    };
    
    const updateLayerSettings = async (settings: LayerSetting[]) => {
        setLayerSettings(settings);
        
        const updatedDevice = {...device};
        if (!updatedDevice.config) updatedDevice.config = {};
        if (!updatedDevice.config.trackpad) updatedDevice.config.trackpad = {};
        updatedDevice.config.trackpad.auto_layer_settings = settings; // App-level setting
        // updatedDevice.config.changed = true;

        const newState = {
            ...state,
            devices: state.devices.map(d => d.id === device.id ? updatedDevice : d)
        };
        
        await setState(newState);
        // auto_layer_settings is an application-side setting.
        // No direct firmware call here unless C side handles it.
        // For now, we only save it to the store.
        
        await saveSettingsToStore(isEnabled, settings);
    };

    const getAppOptions = (currentAppName: string, _index: number) => {
        const windowsList = [
            ...new Set([
                ...(localActiveWindows.map(w => w.application) || []),
                ...(state.activeWindow || [])
            ])
        ];
        
        const baseOptions = [
            { value: "", label: "--- Select Application ---" }
        ];
        
        const windowOptions = windowsList.map(window => ({
            value: window,
            label: window
        }));
        
        if (currentAppName && !windowsList.includes(currentAppName) && currentAppName !== "os:win" && currentAppName !== "os:mac" && currentAppName !== "os:linux") {
            windowOptions.push({
                value: currentAppName,
                label: currentAppName
            });
        }
        
        if (isEditing) {
            layerSettings.forEach(setting => {
                if (setting.appName && 
                    !windowsList.includes(setting.appName) && 
                    setting.appName !== "os:win" && 
                    setting.appName !== "os:mac" && 
                    setting.appName !== "os:linux" &&
                    !windowOptions.some(opt => opt.value === setting.appName)) {
                    windowOptions.push({
                        value: setting.appName,
                        label: setting.appName
                    });
                }
            });
        }
        
        return [...baseOptions, ...windowOptions];
    };
    
    const _handleEditMode = () => {
        setIsEditing(!isEditing);
    };
    
    const layerOptions = Array.from({ length: 16 }, (_, i) => ({ value: i.toString(), label: `Layer ${i}` }));
    
    useEffect(() => {
        const windowsList = [
            ...new Set([
                ...(localActiveWindows.map(w => w.application) || []),
                ...(state.activeWindow || [])
            ])
        ];
        
        const missing: string[] = [];
        layerSettings.forEach(setting => {
            if (setting.appName && 
                !windowsList.includes(setting.appName) && 
                setting.appName !== "os:win" && 
                setting.appName !== "os:mac" && 
                setting.appName !== "os:linux" &&
                !missing.includes(setting.appName)) {
                missing.push(setting.appName);
            }
        });
        
    }, [layerSettings, localActiveWindows, state.activeWindow]);
    
    return (
        <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            {DeviceType && device.deviceType === (DeviceType as any)?.KEYBOARD_TP && (
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
            
            <div className={`${DeviceType && device.deviceType === (DeviceType as any)?.KEYBOARD_TP ? "border-t dark:border-gray-700 pt-4 mt-4" : ""}`}>
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
                
                {isEnabled ? (
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
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                        {layerSettings.map((setting, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                    {setting.appName || t('layer.notSpecified')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                                                    {t('layer.layerNumber', { number: setting.layer })}
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
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.application')}
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.layer')}
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                {t('layer.actions')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                        {layerSettings.map((setting, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <CustomSelect
                                                        id={`app-name-${index}`}
                                                        value={setting.appName}
                                                        onChange={(e) => handleAppNameChange(index, e.target.value)}
                                                        options={getAppOptions(setting.appName, index)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <CustomSelect
                                                        id={`layer-${index}`}
                                                        value={setting.layer.toString()}
                                                        onChange={(e) => handleLayerChange(index, e.target.value)}
                                                        options={layerOptions}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => handleDeleteLayerSetting(index)}
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