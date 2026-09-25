// The browser only gives each site ~5MB of localStorage. Menu items can carry
// uploaded photos as base64 data URLs, which quickly blow past that limit.
// The cache is only an offline fallback (the real data lives in Supabase), so a
// full cache must never make a successful save look like a failure.

const stripInlineImages = (value) => {
    if (Array.isArray(value)) return value.map(stripInlineImages);
    if (value && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = typeof v === 'string' && v.startsWith('data:') ? '' : stripInlineImages(v);
        }
        return out;
    }
    return value;
};

// Writes JSON to localStorage without ever throwing. If the value is too big,
// retries without inline (base64) images, then gives up and drops the stale key.
export const safeSetCache = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        try {
            localStorage.setItem(key, JSON.stringify(stripInlineImages(value)));
            return true;
        } catch (err) {
            console.warn(`Local cache "${key}" skipped (browser storage full):`, err?.message);
            try { localStorage.removeItem(key); } catch { /* ignore */ }
            return false;
        }
    }
};
