// Moves base64 images stored inside table rows to Supabase Storage and replaces them with URLs.
// Run AFTER importing your data and running storage_setup.sql on the new project:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=... node scripts/migrate-base64-images.mjs
// Add --dry to only report what would change. Never commit the service key.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const dry = process.argv.includes('--dry');
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
const supabase = createClient(url, key);
const BUCKET = 'products';

const isData = (v) => typeof v === 'string' && v.startsWith('data:image');

async function toUrl(dataUrl, folder) {
    const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.*)$/s);
    if (!m) throw new Error('Unsupported data URL');
    const ext = m[1].split('/')[1].replace('jpeg', 'jpg').replace('+xml', '');
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(m[2], 'base64'), {
        contentType: m[1], cacheControl: '31536000',
    });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// [table, columns holding a single image, columns holding an array of images, folder]
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
        for (const c of singles) if (isData(row[c])) patch[c] = dry ? 'DRY' : await toUrl(row[c], folder);
        for (const c of arrays) {
            if (Array.isArray(row[c]) && row[c].some(isData)) {
                patch[c] = dry ? row[c] : await Promise.all(row[c].map(v => (isData(v) ? toUrl(v, folder) : v)));
            }
        }
        if (Object.keys(patch).length === 0) continue;
        changed++;
        if (!dry) {
            const { error: e } = await supabase.from(table).update(patch).eq('id', row.id);
            if (e) console.error(table, row.id, e.message);
        }
    }
    console.log(`${table}: ${changed} row(s) ${dry ? 'would be ' : ''}migrated`);
}
