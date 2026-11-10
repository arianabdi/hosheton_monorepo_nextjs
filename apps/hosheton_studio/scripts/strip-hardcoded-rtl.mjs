#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function walk(dir, acc = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, acc);
        else if (entry.name.endsWith('.scss') || entry.name.endsWith('.css')) acc.push(full);
    }
    return acc;
}

let files = 0;
let lines = 0;
for (const file of walk(root)) {
    const orig = fs.readFileSync(file, 'utf8');
    const next = orig
        .replace(/^[ \t]*direction:\s*rtl;[^\n]*\n/gm, '')
        .replace(/text-align:\s*right;/g, 'text-align: start;');
    if (next !== orig) {
        fs.writeFileSync(file, next);
        files += 1;
        lines += (orig.match(/direction:\s*rtl;/g) || []).length;
    }
}

console.log(`updated ${files} stylesheet(s), removed ${lines} direction:rtl declarations`);
