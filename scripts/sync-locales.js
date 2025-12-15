#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function syncTreeFromEn(enNode, localeNode, onChange) {
  if (typeof enNode === 'string') {
    if (typeof localeNode === 'string') return localeNode;
    onChange();
    return enNode;
  }

  if (!isPlainObject(enNode)) {
    if (localeNode === undefined) return enNode;
    return localeNode;
  }

  if (!isPlainObject(localeNode)) {
    onChange();
    const created = {};
    for (const key of Object.keys(enNode)) {
      created[key] = syncTreeFromEn(enNode[key], undefined, onChange);
    }
    return created;
  }

  for (const key of Object.keys(enNode)) {
    if (!(key in localeNode)) onChange();
    localeNode[key] = syncTreeFromEn(enNode[key], localeNode[key], onChange);
  }
  return localeNode;
}

function syncAppLocales(repoRoot) {
  const localesDir = path.join(repoRoot, 'locales');
  const enPath = path.join(localesDir, 'en.json');
  const en = readJson(enPath);
  const enMessages = (en && en.messages) || {};

  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const report = [];

  for (const file of localeFiles) {
    if (file === 'en.json') continue;
    const filePath = path.join(localesDir, file);
    const locale = readJson(filePath);

    let changed = false;
    const markChanged = () => {
      changed = true;
    };

    if (Array.isArray(en._comment_do_not_translate)) {
      const localeComment = locale._comment_do_not_translate;
      const sameComment =
        Array.isArray(localeComment) &&
        localeComment.length === en._comment_do_not_translate.length &&
        localeComment.every((v, i) => v === en._comment_do_not_translate[i]);
      if (!sameComment) {
        locale._comment_do_not_translate = en._comment_do_not_translate;
        markChanged();
      }
    }

    if (!locale || typeof locale !== 'object') {
      throw new Error(`Invalid JSON object in ${filePath}`);
    }
    if (!('lang' in locale)) {
      locale.lang = path.basename(file, '.json');
      markChanged();
    }
    if (!isPlainObject(locale.messages)) {
      locale.messages = {};
      markChanged();
    }

    locale.messages = syncTreeFromEn(enMessages, locale.messages, markChanged);

    if (changed) writeJson(filePath, locale);
    report.push({ file: path.relative(repoRoot, filePath), changed });
  }

  return report;
}

function main() {
  const repoRoot = path.join(__dirname, '..');
  const appReport = syncAppLocales(repoRoot);

  const changed = appReport.filter((r) => r.changed);
  process.stdout.write(
    JSON.stringify(
      {
        changedCount: changed.length,
        changedFiles: changed.map((r) => r.file),
        scannedCount: appReport.length,
      },
      null,
      2
    ) + '\n'
  );
}

main();
