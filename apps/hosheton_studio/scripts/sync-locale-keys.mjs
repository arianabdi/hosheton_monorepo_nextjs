#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../app/lib/i18n/locales');
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

function merge(target, source) {
    const out = Array.isArray(target) ? [...target] : { ...target };
    for (const [k, v] of Object.entries(source)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = merge(target?.[k] && typeof target[k] === 'object' ? target[k] : {}, v);
        } else if (out[k] === undefined) {
            out[k] = v;
        }
    }
    return out;
}

for (const lang of ['ar', 'es', 'de', 'fr', 'ru', 'ja', 'zh', 'tr', 'fa']) {
    const file = path.join(dir, `${lang}.json`);
    const current = JSON.parse(fs.readFileSync(file, 'utf8'));
    const merged = merge(current, en);
    fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n');
    console.log('synced', lang);
}
