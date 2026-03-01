import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_PREFIX = 'pos_draft_';

/**
 * Drop-in replacement for useState that persists to localStorage.
 * Returns [state, setState, clearPersistedValue].
 *
 * @param {string|null} key - localStorage key (auto-prefixed). Pass null to disable persistence.
 * @param {*} defaultValue - fallback when nothing is in storage
 * @param {object} options
 * @param {number} options.debounceMs - write delay in ms (default: 300)
 * @param {number} options.maxAgeMs - max age before stale (default: 24h)
 * @param {number} options.version - schema version; bump to invalidate (default: 1)
 */
export function usePersistedState(key, defaultValue, options = {}) {
    const {
        debounceMs = 300,
        maxAgeMs = 24 * 60 * 60 * 1000,
        version = 1,
    } = options;

    const fullKey = key != null ? STORAGE_PREFIX + key : null;
    const timerRef = useRef(null);
    const defaultRef = useRef(defaultValue);

    const [state, setState] = useState(() => {
        if (!fullKey) return defaultValue;
        try {
            const raw = localStorage.getItem(fullKey);
            if (raw === null) return defaultValue;
            const parsed = JSON.parse(raw);
            if (parsed.v !== version) {
                localStorage.removeItem(fullKey);
                return defaultValue;
            }
            if (Date.now() - parsed.t > maxAgeMs) {
                localStorage.removeItem(fullKey);
                return defaultValue;
            }
            return parsed.d;
        } catch {
            localStorage.removeItem(fullKey);
            return defaultValue;
        }
    });

    useEffect(() => {
        if (!fullKey) return;
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(fullKey, JSON.stringify({ v: version, t: Date.now(), d: state }));
            } catch (e) {
                console.warn('usePersistedState: write failed', e);
            }
        }, debounceMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [state, fullKey, version, debounceMs]);

    const clearPersistedValue = useCallback(() => {
        if (fullKey) localStorage.removeItem(fullKey);
        setState(defaultRef.current);
    }, [fullKey]);

    return [state, setState, clearPersistedValue];
}

/**
 * Remove all persisted draft keys matching a prefix.
 * e.g., clearPersistedModule('pos') removes all pos_draft_pos_* keys.
 * clearPersistedModule('') removes ALL pos_draft_* keys.
 */
export function clearPersistedModule(modulePrefix) {
    const target = STORAGE_PREFIX + modulePrefix;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(target)) {
            keysToRemove.push(k);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
}
