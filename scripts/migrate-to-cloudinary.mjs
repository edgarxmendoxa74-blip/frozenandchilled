// Copies every image currently hosted in Supabase Storage to Cloudinary and rewrites the URLs.
//   $env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_KEY="<secret key>"
//   $env:CLOUDINARY_CLOUD_NAME="..."; $env:CLOUDINARY_UPLOAD_PRESET="..."   (unsigned preset)
//   node scripts/migrate-to-cloudinary.mjs --dry     # report only
//   node scripts/migrate-to-cloudinary.mjs           # migrate (safe to re-run)
import { createClient } from '@supabase/supabase-js';

const dry = process.argv.includes('--dry');
const { SUPABASE_URL, SUPABASE_SERVICE_KEY, CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_UPLOAD_PRESET: preset } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !cloud || !preset) throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const isSupabaseImg = (v) => typeof v === 'string' && v.includes('/storage/v1/object/public/');
const cache = new Map();

async function toCloudinary(src, folder) {
    if (cache.has(src)) return cache.get(src);
    if (dry) return src;
    const form = new FormData();
    form.append('file', src); // Cloudinary fetches the public URL itself
    form.append('upload_preset', preset);
    form.append('folder', folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || 'Cloudinary upload failed');
    cache.set(src, json.secure_url);
    return json.secure_url;
}

const targets = [
    ['menu_items', ['image'], [], 'products'],
    ['payment_settings', ['qr_url'], [], 'qr-codes'],
    ['store_settings', [], ['banner_images'], 'banners'],
];

for (const [table, singles, arrays, folder] of targets) {
    const { data: rows, error } = await supabase.from(table).select('*');
    if (error) { console.error(table, error.message); continue; }
    let changed = 0;
    for (const row of rows) {
        const patch = {};
        for (const c of singles) if (isSupabaseImg(row[c])) patch[c] = await toCloudinary(row[c], folder);
        for (const c of arrays) {
            if (Array.isArray(row[c]) && row[c].some(isSupabaseImg)) {
                patch[c] = await Promise.all(row[c].map(v => (isSupabaseImg(v) ? toCloudinary(v, folder) : v)));
            }
        }
        if (!Object.keys(patch).length) continue;
        changed++;
        if (!dry) {
            const { error: e } = await supabase.from(table).update(patch).eq('id', row.id);
            if (e) console.error(table, row.id, e.message);
        }
    }
    console.log(`${table}: ${changed} row(s) ${dry ? 'would be ' : ''}migrated`);
}
