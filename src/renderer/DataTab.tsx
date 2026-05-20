import React, { useState, useEffect } from "react";
import type { JSX } from 'react';

import type { Device, TrackpadConfig } from '../types/device';
import type { SavedConfig } from '../types/store';
import { useLanguage } from "../i18n/LanguageContext";
import { BaseModal } from "../components/BaseModalComponents";

interface DataTabProps {
    device: Device | null;
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

const DataTab: React.FC<DataTabProps> = ({ device }): JSX.Element => {
    const { t } = useLanguage();
    const [filename, setFilename] = useState('');
    const [allConfigs, setAllConfigs] = useState<SavedConfig[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [viewingConfig, setViewingConfig] = useState<TrackpadConfig | null>(null);
    const [viewingName, setViewingName] = useState('');

    useEffect((): void => {
        void window.api.listSavedConfigs().then(setAllConfigs);
    }, []);

    const deviceConfigs = allConfigs.filter((c): boolean => c.deviceId === (device?.id ?? ''));
    const currentTrackpad = device?.config?.trackpad ?? null;

    const handleSave = async (): Promise<void> => {
        if (!device?.config || !filename.trim()) return;
        const trimmedName = filename.trim();
        const existing = deviceConfigs.find((c): boolean => c.name === trimmedName);
        if (existing && !window.confirm(t('data.overwriteConfirm'))) return;

        const src = device.config.trackpad ?? {};
        const filteredTrackpad = Object.fromEntries(
            TRACKPAD_SAVE_KEYS.filter((k): boolean => src[k] !== undefined).map((k): [string, unknown] => [k, src[k]])
        ) as TrackpadConfig;
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
        if (!window.confirm(t('data.deleteConfirm'))) return;
        await window.api.deleteConfig(entry.id);
        setAllConfigs((prev): SavedConfig[] => prev.filter((c): boolean => c.id !== entry.id));
    };

    const startEditing = (entry: SavedConfig): void => {
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
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">Global</span>
                <div className="flex gap-2">
                    <button
                        onClick={(): void => { void window.api.importFile(); }}
                        className={`${btnSmall} bg-blue-500 hover:bg-blue-600`}
                    >
                        {t('common.import')}
                    </button>
                    <button
                        onClick={(): void => { void window.api.exportFile(); }}
                        className={`${btnSmall} bg-blue-500 hover:bg-blue-600`}
                    >
                        {t('common.export')}
                    </button>
                </div>
            </div>

            {device && (
                <>
                    <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        {device.product}
                    </div>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={filename}
                            onChange={(e): void => setFilename(e.target.value)}
                            placeholder={t('data.saveHint')}
                            onKeyDown={(e): void => { if (e.key === 'Enter') void handleSave(); }}
                            className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={(): void => { void handleSave(); }}
                            disabled={!filename.trim()}
                            className={`${btnSmall} bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {t('data.save')}
                        </button>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="flex items-center gap-2 px-3 py-2">
                            <span className="flex-1 text-sm truncate text-gray-500 dark:text-gray-400 italic">
                                {t('data.current')}
                            </span>
                            {currentTrackpad != null && (
                                <button
                                    onClick={(): void => openView(currentTrackpad, t('data.current'))}
                                    className={btnOutline}
                                >
                                    {t('data.view')}
                                </button>
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
                                            className="flex-1 text-sm cursor-pointer hover:text-blue-500 truncate"
                                            onClick={(): void => startEditing(entry)}
                                            title={entry.name}
                                        >
                                            {entry.name}
                                        </span>
                                    )}
                                    <button
                                        onClick={(): void => openView(entry.config.trackpad, entry.name)}
                                        className={btnOutline}
                                    >
                                        {t('data.view')}
                                    </button>
                                    <button
                                        onClick={(): void => { void handleDelete(entry); }}
                                        className={`${btnSmall} bg-red-500 hover:bg-red-600`}
                                    >
                                        {t('common.delete')}
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
