// Imports the CSV backup in ./backup into the NEW Supabase project, and moves every embedded
// base64 image (menu photos, QR codes, banners) into Storage so the tables stay tiny.
//
//   $env:SUPABASE_URL="https://xxxx.supabase.co"; $env:SUPABASE_SERVICE_KEY="<secret key>"
//   node scripts/import-backup.mjs --dry     # parse + report only
//   node scripts/import-backup.mjs           # real import (safe to re-run: upserts by id)
//
// The service/secret key bypasses RLS. Use it only in your terminal; never put it in .env or git.
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseCsv } from './csv.mjs';

const dry = process.argv.includes('--dry');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!dry && (!url || !key)) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first');
const supabase = dry ? null : createClient(url, key, { auth: { persistSession: false } });
const BUCKET = 'products';
const dir = path.resolve('backup');

const JSON_COLS = new Set(['variations', 'flavors', 'addons', 'boxes', 'banner_images', 'customer_details', 'items']);
const isData = (v) => typeof v === 'string' && v.startsWith('data:image');
let uploaded = 0;

async function toStorage(dataUrl, folder) {
    const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,([\s\S]*)$/);
    if (!m) throw new Error('Unsupported data URL');
    const ext = m[1].split('/')[1].replace('jpeg', 'jpg').replace('+xml', '');
    const file = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    uploaded++;
    if (dry) return `DRY/${file}`;
    const { error } = await supabase.storage.from(BUCKET).upload(file, Buffer.from(m[2], 'base64'), {
        contentType: m[1], cacheControl: '31536000',
    });
    if (error) throw new Error(`upload failed: ${error.message}`);
    return supabase.storage.from(BUCKET).getPublicUrl(file).data.publicUrl;
}

const load = (table) => parseCsv(fs.readFileSync(path.join(dir, `${table}_rows.csv`), 'utf8'));

async function convert(row, folder) {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
        if (v === '') { out[k] = null; continue; }
        if (JSON_COLS.has(k)) {
            let parsed = JSON.parse(v);
            if (Array.isArray(parsed)) parsed = await Promise.all(parsed.map(x => (isData(x) ? toStorage(x, folder) : x)));
            out[k] = parsed;
        } else if (isData(v)) out[k] = await toStorage(v, folder);
        else out[k] = v;
    }
    return out;
}

// Keep only the newest row per (lower-cased) name — the old DB accumulated duplicates.
function latestByName(rows, dateCol) {
    const best = new Map();
    for (const r of rows) {
        const k = (r.name || '').trim().toLowerCase();
        const cur = best.get(k);
        if (!cur || r[dateCol] > cur[dateCol]) best.set(k, r);
    }
    return [...best.values()];
}

async function run(table, rows, folder, conflict = 'id') {
    const converted = [];
    for (const r of rows) converted.push(await convert(r, folder));
    if (!dry) {
        for (let i = 0; i < converted.length; i += 50) {
            const { error } = await supabase.from(table).upsert(converted.slice(i, i + 50), { onConflict: conflict });
            if (error) throw new Error(`${table}: ${error.message}`);
        }
    }
    console.log(`${table}: ${converted.length} row(s) ${dry ? 'parsed' : 'imported'}`);
}

await run('categories', load('categories'), 'categories');
await run('menu_items', load('menu_items'), 'products');
await run('delivery_locations', load('delivery_locations'), 'misc');
await run('order_types', latestByName(load('order_types'), 'created_at'), 'misc');
await run('payment_settings', latestByName(load('payment_settings'), 'created_at'), 'qr-codes');
const settings = load('store_settings').sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).slice(0, 1);
await run('store_settings', settings, 'banners');
await run('orders', load('orders'), 'misc');
await run('store_visits', load('store_visits'), 'misc');
console.log(`images moved to Storage: ${uploaded}${dry ? ' (dry run, nothing written)' : ''}`);
