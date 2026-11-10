#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../app/lib/i18n/locales');

function flatten(obj, prefix = '') {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(...flatten(value, p));
        } else {
            keys.push(p);
        }
    }
    return keys.sort();
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const masterKeys = flatten(en);
let failed = false;

console.log(`Master (en.json): ${masterKeys.length} keys\n`);

for (const lang of ['fa', 'ar', 'es', 'de', 'fr', 'ru', 'ja', 'zh', 'tr']) {
    const data = JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf8'));
    const keys = new Set(flatten(data));
    const missing = masterKeys.filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !masterKeys.includes(k));
    const status = missing.length === 0 && extra.length === 0 ? 'OK' : 'FAIL';
    if (status === 'FAIL') failed = true;
    console.log(`${lang}: ${keys.size} keys — ${status}`);
    if (missing.length) console.log(`  missing (${missing.length}): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    if (extra.length) console.log(`  extra (${extra.length}): ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? '...' : ''}`);
}

process.exit(failed ? 1 : 0);
