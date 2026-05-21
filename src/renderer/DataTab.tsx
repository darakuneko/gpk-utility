import React, { useState, useEffect, useCallback } from "react";
import type { JSX } from 'react';

import type { Device, DeviceConfig, TrackpadConfig } from '../types/device';
import type { SavedConfig } from '../types/store';
import { BASELINE_CONFIG_NAME } from '../types/store';
import { useStateContext } from "../context.tsx";
import { useLanguage } from "../i18n/LanguageContext";
import { BaseModal } from "../components/BaseModalComponents";

interface DataTabProps {
    device: Device | null;
    filename?: string;
    onFilenameChange?: (v: string) => void;
    editingConfigId?: string | null;
    onEditingChange?: (configId: string | null) => void;
}

const TRACKPAD_SAVE_KEYS: ReadonlyArray<keyof TrackpadConfig> = [
    'default_speed',
    'can_drag', 'drag_strength_mode', 'drag_term', 'drag_strength',
    'can_reverse_scrolling_direction', 'can_reverse_h_scrolling_direction',
    'scroll_term', 'scroll_step', 'can_short_scroll', 'short_scroll_term',
    'tap_term', 'swipe_term', 'pinch_term', 'pinch_distance',
];

const BOOL_KEYS = new Set<keyof TrackpadConfig>([
    'can_drag', 'can_reverse_scrolling_direction', 'can_reverse_h_scrolling_direction', 'can_short_scroll',
]);

const MS_KEYS = new Set<keyof TrackpadConfig>([
    'drag_term', 'scroll_term', 'short_scroll_term', 'tap_term', 'swipe_term', 'pinch_term',
]);

const VIEW_GROUPS: ReadonlyArray<{ tabKey: 'mouse' | 'dragDrop' | 'scroll' | 'gesture'; keys: ReadonlyArray<keyof TrackpadConfig> }> = [
    { tabKey: 'mouse',   keys: ['default_speed'] },
    { tabKey: 'dragDrop', keys: ['can_drag', 'drag_strength_mode', 'drag_term', 'drag_strength'] },
    { tabKey: 'scroll',  keys: ['can_reverse_scrolling_direction', 'can_reverse_h_scrolling_direction', 'scroll_term', 'scroll_step', 'can_short_scroll', 'short_scroll_term'] },
    { tabKey: 'gesture', keys: ['tap_term', 'swipe_term', 'pinch_term', 'pinch_distance'] },
];

const btnSmall = "px-3 py-1 text-xs text-white rounded";
const btnOutline = "px-3 py-1 text-xs rounded border border-blue-500 text-blue-500 hover:bg-blue-500/10";
const DISABLED_CLS = "disabled:opacity-50 disabled:cursor-not-allowed";

// Keep only the persistable trackpad keys from a (possibly fuller) config.
const filterTrackpadByKeys = (src: TrackpadConfig): TrackpadConfig =>
    Object.fromEntries(
        TRACKPAD_SAVE_KEYS.filter((k): boolean => src[k] !== undefined).map((k): [string, unknown] => [k, src[k]])
    ) as TrackpadConfig;

const DataTab: React.FC<DataTabProps> = ({ device, filename: controlledFilename, onFilenameChange, editingConfigId: controlledEditingConfigId, onEditingChange }): JSX.Element => {
    const { t } = useLanguage();
    const { state, setState } = useStateContext();
    const [localFilename, setLocalFilename] = useState('');
    const filename = controlledFilename !== undefined ? controlledFilename : localFilename;
    const setFilename = useCallback((v: string): void => {
        if (controlledFilename === undefined) setLocalFilename(v);
        onFilenameChange?.(v);
    }, [controlledFilename, onFilenameChange]);
    const [allConfigs, setAllConfigs] = useState<SavedConfig[]>([]);
    // Inline rename of a saved config's name (distinct from the live-edit mode below).
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [viewingConfig, setViewingConfig] = useState<TrackpadConfig | null>(null);
    const [viewingName, setViewingName] = useState('');
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
    const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    // Live-edit mode: the config currently being tuned via the Mouse/Scroll/Gesture tabs.
    const [localEditingConfigId, setLocalEditingConfigId] = useState<string | null>(null);
    const editingConfigId = controlledEditingConfigId !== undefined ? controlledEditingConfigId : localEditingConfigId;
    const setEditingConfigId = useCallback((v: string | null): void => {
        if (controlledEditingConfigId === undefined) setLocalEditingConfigId(v);
        onEditingChange?.(v);
    }, [controlledEditingConfigId, onEditingChange]);
    const isEditingActive = editingConfigId !== null;

    useEffect((): void => {
        void window.api.listSavedConfigs().then(setAllConfigs);
    }, []);

    const deviceConfigs = allConfigs.filter((c): boolean => c.deviceId === (device?.id ?? '') && c.name !== BASELINE_CONFIG_NAME);
    const baselineConfig = allConfigs.find((c): boolean => c.deviceId === (device?.id ?? '') && c.name === BASELINE_CONFIG_NAME);
    const defaultTrackpad = baselineConfig?.config?.trackpad ?? null;

    // Create a new saved config, seeded with the Default (baseline) values.
    const handleCreate = async (): Promise<void> => {
        if (!device?.config || !filename.trim()) return;
        const trimmedName = filename.trim();
        const existing = deviceConfigs.find((c): boolean => c.name === trimmedName);
        if (existing && !confirmingOverwrite) {
            setConfirmingOverwrite(true);
            return;
        }

        const src = defaultTrackpad ?? device.config.trackpad ?? {};
        const filteredTrackpad = filterTrackpadByKeys(src);
        const entry: SavedConfig = {
            id: existing?.id ?? crypto.randomUUID(),
            name: trimmedName,
            deviceId: device.id,
            config: { trackpad: filteredTrackpad, pomodoro: {} },
            savedAt: Date.now(),
        };
        try {
            await window.api.saveConfig(entry);
            setFilename('');
            setConfirmingOverwrite(false);
            setAllConfigs((prev): SavedConfig[] =>
                existing
                    ? prev.map((c): SavedConfig => c.id === existing.id ? entry : c)
                    : [...prev, entry]
            );
        } catch {
            // save failed — do not update local state
        }
    };

    const handleDelete = async (entry: SavedConfig): Promise<void> => {
        if (confirmingDeleteId !== entry.id) {
            setConfirmingDeleteId(entry.id);
            return;
        }
        setConfirmingDeleteId(null);
        await window.api.deleteConfig(entry.id);
        setAllConfigs((prev): SavedConfig[] => prev.filter((c): boolean => c.id !== entry.id));
    };

    const dispatchApplyStatus = (deviceId: string, success: boolean, pending: boolean): void => {
        window.dispatchEvent(new CustomEvent('configSaveComplete', {
            detail: { deviceId, success, timestamp: Date.now(), isApply: true, pending }
        }));
    };

    // Send a trackpad config to the device without persisting it, surfacing the apply status.
    const applyConfigLive = async (mergedTrackpad: TrackpadConfig): Promise<void> => {
        if (!device?.config) return;
        const updatedDevice: Device = {
            ...device,
            config: { ...device.config, trackpad: mergedTrackpad } as DeviceConfig
        };
        setState({
            ...state,
            devices: state.devices.map((d): Device => d.id === device.id ? updatedDevice : d)
        });

        setIsApplying(true);
        dispatchApplyStatus(device.id, false, true);

        let success = false;
        try {
            const result = await window.api.applyTrackpadTemp(updatedDevice);
            success = result.success;
        } catch {
            // success stays false on device write error
        } finally {
            setIsApplying(false);
        }
        dispatchApplyStatus(device.id, success, false);
    };

    // Toggle live-edit mode for a saved config.
    // Enter: apply the config to the device for live tuning via the Mouse/Scroll/Gesture tabs.
    // Exit: persist the tuned values back into the config, then reset the device to Default.
    const handleEdit = async (entry: SavedConfig): Promise<void> => {
        if (!device?.config?.trackpad || isApplying) return;

        if (editingConfigId === entry.id) {
            const updated: SavedConfig = {
                ...entry,
                config: {
                    trackpad: { ...entry.config.trackpad, ...filterTrackpadByKeys(device.config.trackpad) },
                    pomodoro: entry.config.pomodoro ?? {}
                },
                savedAt: Date.now()
            };
            try {
                await window.api.saveConfig(updated);
                setAllConfigs((prev): SavedConfig[] => prev.map((c): SavedConfig => c.id === updated.id ? updated : c));
            } catch {
                // keep going even if the persist fails; device still resets below
            }
            setEditingConfigId(null);
            await applyConfigLive({ ...device.config.trackpad, ...(defaultTrackpad ?? {}) });
            return;
        }

        setEditingConfigId(entry.id);
        setConfirmingOverwrite(false);
        await applyConfigLive({ ...device.config.trackpad, ...entry.config.trackpad });
    };

    const editBtnClass = (active: boolean): string =>
        `${active ? `${btnSmall} bg-blue-500 hover:bg-blue-600` : btnOutline} ${DISABLED_CLS}`;

    const startEditing = (entry: SavedConfig): void => {
        if (isEditingActive) return;
        setEditingId(entry.id);
        setEditingName(entry.name);
    };

    const commitRename = async (): Promise<void> => {
        if (!editingId) return;
        const trimmed = editingName.trim();
        if (trimmed) {
            await window.api.renameConfig(editingId, trimmed);
            setAllConfigs((prev): SavedConfig[] =>
                prev.map((c): SavedConfig => c.id === editingId ? { ...c, name: trimmed } : c)
            );
        }
        setEditingId(null);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') void commitRename();
        if (e.key === 'Escape') setEditingId(null);
    };

    const openView = (config: TrackpadConfig, name: string): void => {
        setViewingConfig(config);
        setViewingName(name);
    };

    const labelForKey = (key: keyof TrackpadConfig): string => {
        const labels: Partial<Record<keyof TrackpadConfig, string>> = {
            default_speed: t('mouse.speed'),
            can_drag: t('dragDrop.title'),
            drag_strength_mode: t('dragDrop.mode'),
            drag_term: t('dragDrop.term'),
            drag_strength: t('dragDrop.strength'),
            can_reverse_scrolling_direction: t('scroll.reverseDirection'),
            can_reverse_h_scrolling_direction: t('scroll.reverseHDirection'),
            scroll_term: t('scroll.term'),
            scroll_step: t('scroll.scrollStep'),
            can_short_scroll: t('scroll.shortScroll'),
            short_scroll_term: t('scroll.shortScrollTerm'),
            tap_term: t('gesture.tapTerm'),
            swipe_term: t('gesture.swipeTerm'),
            pinch_term: t('gesture.pinchTerm'),
            pinch_distance: t('gesture.pinchDistance'),
        };
        return labels[key] ?? key;
    };

    const formatValue = (key: keyof TrackpadConfig, val: number): string => {
        if (BOOL_KEYS.has(key)) return val === 1 ? 'ON' : 'OFF';
        if (MS_KEYS.has(key)) return `${val} ms`;
        if (key === 'default_speed') return (val / 10).toFixed(1);
        if (key === 'scroll_step') return String(val + 1);
        if (key === 'drag_strength_mode') return val === 0 ? t('dragDrop.term') : t('dragDrop.strength');
        return String(val);
    };

    return (
        <div className="p-4 text-text-primary dark:text-white">
            {device && (
                <>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={filename}
                            onChange={(e): void => { setFilename(e.target.value); setConfirmingOverwrite(false); }}
                            placeholder={t('data.saveHint')}
                            onKeyDown={(e): void => { if (e.key === 'Enter') void handleCreate(); }}
                            disabled={isEditingActive}
                            className={`flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${DISABLED_CLS}`}
                        />
                        <button
                            onClick={(): void => { void handleCreate(); }}
                            onBlur={(): void => setConfirmingOverwrite(false)}
                            disabled={!filename.trim() || isEditingActive}
                            className={`${btnSmall} ${confirmingOverwrite ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600'} ${DISABLED_CLS}`}
                        >
                            {confirmingOverwrite ? t('data.overwriteConfirm') : t('data.create')}
                        </button>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="flex items-center gap-2 px-3 py-2">
                            <span className="flex-1 text-sm truncate text-gray-500 dark:text-gray-400 italic">
                                {t('data.default')}
                            </span>
                            {defaultTrackpad != null && (
                                <>
                                    <button
                                        onClick={(): void => openView(defaultTrackpad, t('data.default'))}
                                        disabled={isEditingActive}
                                        className={`${btnOutline} ${DISABLED_CLS}`}
                                    >
                                        {t('data.view')}
                                    </button>
                                    {/* Default is read-only: spacers keep View aligned with the Edit/Delete columns below */}
                                    <span className={`${btnOutline} invisible`} aria-hidden="true">{t('data.edit')}</span>
                                    <span className={`${btnSmall} invisible`} aria-hidden="true">{t('common.delete')}</span>
                                </>
                            )}
                        </div>

                        {deviceConfigs.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {t('data.noSaves')}
                            </div>
                        ) : (
                            deviceConfigs.map((entry): JSX.Element => (
                                <div key={entry.id} className="flex items-center gap-2 px-3 py-2">
                                    {editingId === entry.id ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editingName}
                                            onChange={(e): void => setEditingName(e.target.value)}
                                            onBlur={(): void => { void commitRename(); }}
                                            onKeyDown={handleRenameKeyDown}
                                            className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm bg-white dark:bg-gray-700 focus:outline-none"
                                        />
                                    ) : (
                                        <span
                                            className={`flex-1 text-sm truncate ${isEditingActive ? 'cursor-not-allowed' : 'cursor-pointer hover:text-blue-500'}`}
                                            onClick={(): void => startEditing(entry)}
                                            title={entry.name}
                                        >
                                            {entry.name}
                                        </span>
                                    )}
                                    <button
                                        onClick={(): void => openView(entry.config.trackpad, entry.name)}
                                        disabled={isEditingActive}
                                        className={`${btnOutline} ${DISABLED_CLS}`}
                                    >
                                        {t('data.view')}
                                    </button>
                                    <button
                                        onClick={(): void => { void handleEdit(entry); }}
                                        disabled={isApplying || (isEditingActive && editingConfigId !== entry.id)}
                                        className={editBtnClass(editingConfigId === entry.id)}
                                    >
                                        {editingConfigId === entry.id ? t('data.editing') : t('data.edit')}
                                    </button>
                                    <button
                                        onClick={(): void => { void handleDelete(entry); }}
                                        onBlur={(): void => setConfirmingDeleteId(null)}
                                        disabled={isEditingActive}
                                        className={`${btnSmall} bg-red-500 hover:bg-red-600 ${DISABLED_CLS}`}
                                    >
                                        {confirmingDeleteId === entry.id ? t('common.deleteConfirm') : t('common.delete')}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            <BaseModal
                isOpen={viewingConfig !== null}
                onClose={(): void => setViewingConfig(null)}
                title={viewingName}
                showCloseIcon
            >
                {viewingConfig != null && VIEW_GROUPS.map((group): JSX.Element => (
                    <div key={group.tabKey} className="mb-4">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            {t(`tabs.${group.tabKey}`)}
                        </div>
                        <div className="space-y-1">
                            {group.keys.map((key): JSX.Element | null => {
                                const val = viewingConfig[key];
                                if (val === undefined) return null;
                                return (
                                    <div key={key} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-gray-600 dark:text-gray-300">{labelForKey(key)}</span>
                                        <span className="font-mono text-gray-900 dark:text-white">{formatValue(key, val as number)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </BaseModal>
        </div>
    );
};

export default DataTab;
