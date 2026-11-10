#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../app/lib/i18n/locales');
const pendingDir = path.join(__dirname, '../app/lib/i18n/pending');

function setPath(obj, parts, value) {
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!cur[p] || typeof cur[p] !== 'object' || Array.isArray(cur[p])) cur[p] = {};
        cur = cur[p];
    }
    const last = parts[parts.length - 1];
    if (cur[last] === undefined) cur[last] = value;
}

const pendingFiles = fs.readdirSync(pendingDir).filter((f) => f.endsWith('.json'));
const extras = [];

for (const file of pendingFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(pendingDir, file), 'utf8'));
    extras.push(data);
}

const langs = ['en', 'fa', 'ar', 'es', 'de', 'fr', 'ru', 'ja', 'zh', 'tr'];
const locales = {};
for (const lang of langs) {
    locales[lang] = JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf8'));
}

let added = 0;
for (const extra of extras) {
    for (const [ns, keys] of Object.entries(extra)) {
        if (!keys || typeof keys !== 'object') continue;
        for (const [key, val] of Object.entries(keys)) {
            if (!val || typeof val !== 'object') continue;
            const enVal = val.en ?? val.fa ?? '';
            const faVal = val.fa ?? val.en ?? '';
            for (const lang of langs) {
                const value = lang === 'fa' ? faVal : enVal;
                setPath(locales[lang], [ns, key], value);
            }
            added += 1;
        }
    }
}

for (const lang of langs) {
    fs.writeFileSync(
        path.join(localesDir, `${lang}.json`),
        JSON.stringify(locales[lang], null, 2) + '\n',
    );
}

console.log(`merged ${added} keys from ${pendingFiles.length} pending files into ${langs.length} locales`);
