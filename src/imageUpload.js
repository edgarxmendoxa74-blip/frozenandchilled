import { supabase } from './supabaseClient';

// Images must live in Supabase Storage (served via CDN, cacheable) and only their URL goes in the
// database. Embedding base64 in table rows makes every `select('*')` download all the photos and
// quickly exhausts the free-plan egress quota.

const BUCKET = 'products';

const resizeToJpeg = (file, maxSize = 640, quality = 0.75) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unsupported image file')); };
    img.src = url;
});

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Cloudinary delivers a resized, modern-format (webp/avif) copy straight from the URL, which keeps
// bandwidth tiny. Other URLs (Supabase, Unsplash, ...) are returned unchanged.
export const optimizeImage = (url, width = 400) => {
    if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
    if (/\/upload\/[^/]*(w_|f_auto|q_auto)/.test(url)) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
};

// Resizes the image and uploads it (Cloudinary when configured, otherwise Supabase Storage).
// Returns the public URL. Throws if the upload fails (no base64 fallback, on purpose).
export async function uploadImage(file, folder = 'products', opts = {}) {
    const blob = await resizeToJpeg(file, opts.maxSize, opts.quality);

    if (CLOUD && PRESET) {
        const form = new FormData();
        form.append('file', blob, `${Date.now()}.jpg`);
        form.append('upload_preset', PRESET);
        form.append('folder', folder);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: form });
        const json = await res.json();
        if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || 'Cloudinary upload failed');
        return json.secure_url;
    }

    const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    if (!data?.publicUrl) throw new Error('Could not get image URL');
    return data.publicUrl;
}
