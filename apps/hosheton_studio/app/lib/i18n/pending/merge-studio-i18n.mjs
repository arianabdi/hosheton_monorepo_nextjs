import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(dir, '..', 'locales');
const extract = JSON.parse(fs.readFileSync(path.join(dir, '_en-extract.json'), 'utf8'));
const langs = ['ar', 'es', 'de', 'fr', 'ru', 'ja', 'zh', 'tr'];
const placeholderRe = /\{\{[^}]+\}\}/g;
const htmlTagRe = /<\/?[a-z]+>/gi;

function placeholders(s) {
  return (String(s).match(placeholderRe) || []).sort();
}

function htmlTags(s) {
  return (String(s).match(htmlTagRe) || []).sort();
}

const rowFiles = fs
  .readdirSync(dir)
  .filter((name) => name.startsWith('studio-rows-') && name.endsWith('.json'))
  .sort();

if (!rowFiles.length) {
  console.error('No studio-rows-*.json files found');
  process.exit(1);
}

const patches = Object.fromEntries(langs.map((lang) => [lang, {}]));

for (const name of rowFiles) {
  const rows = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  if (!Array.isArray(rows.langs) || rows.langs.join(',') !== langs.join(',')) {
    console.error(`${name}: langs must be ${langs.join(', ')}`);
    process.exit(1);
  }
  for (const [ns, keys] of Object.entries(rows)) {
    if (ns === 'langs') continue;
    if (!keys || typeof keys !== 'object') continue;
    for (const [key, values] of Object.entries(keys)) {
      if (!Array.isArray(values) || values.length !== langs.length) {
        console.error(`${name} ${ns}.${key}: expected array of ${langs.length}`);
        process.exit(1);
      }
      const enSrc = extract[ns]?.[key];
      if (enSrc) {
        const enPh = placeholders(enSrc).join(',');
        const enHtml = htmlTags(enSrc).join(',');
        for (let i = 0; i < langs.length; i++) {
          const val = values[i];
          if (typeof val !== 'string' || !val.trim()) {
            console.error(`${name} ${ns}.${key}[${langs[i]}]: empty`);
            process.exit(1);
          }
          if (placeholders(val).join(',') !== enPh) {
            console.error(`${name} ${ns}.${key}[${langs[i]}]: placeholder mismatch`);
            console.error(`  en: ${enPh || '(none)'}`);
            console.error(`  got: ${placeholders(val).join(',') || '(none)'}`);
            process.exit(1);
          }
          if (htmlTags(val).join(',') !== enHtml) {
            console.error(`${name} ${ns}.${key}[${langs[i]}]: HTML tag mismatch`);
            process.exit(1);
          }
        }
      }
      for (let i = 0; i < langs.length; i++) {
        const lang = langs[i];
        if (!patches[lang][ns]) patches[lang][ns] = {};
        patches[lang][ns][key] = values[i];
      }
    }
  }
  console.log(`loaded ${name}`);
}

const namespaces = Object.keys(extract);
for (const lang of langs) {
  const file = path.join(localesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const patch = patches[lang];
  for (const ns of namespaces) {
    if (!patch[ns]) {
      console.error(`Missing namespace ${ns} for ${lang}`);
      process.exit(1);
    }
    const expected = Object.keys(extract[ns]);
    const missing = expected.filter((k) => !(k in patch[ns]));
    if (missing.length) {
      console.error(`${lang}.${ns} missing ${missing.length}: ${missing.slice(0, 12).join(', ')}`);
      process.exit(1);
    }
    data[ns] = { ...(data[ns] || {}), ...patch[ns] };
    console.log(`${lang}.${ns}: wrote ${Object.keys(patch[ns]).length} keys`);
  }
  if (patch.menu) {
    data.menu = { ...(data.menu || {}), ...patch.menu };
  }
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

console.log('done');
