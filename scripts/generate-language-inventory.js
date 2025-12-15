const fs = require('fs');
const path = require('path');

const { getAllLanguages } = require('../src/utils/languages');
const { normalizeTargetLanguageForPrompt } = require('../src/services/utils/normalizeTargetLanguageForPrompt');

function byNameKey(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mdEscape(text) {
  return String(text || '').replace(/\|/g, '\\|');
}

function main() {
  const languages = getAllLanguages();

  const duplicates = new Map(); // nameKey -> { name, codes: [] }
  for (const lang of languages) {
    const key = byNameKey(lang.name);
    if (!duplicates.has(key)) {
      duplicates.set(key, { name: lang.name, codes: [lang.code] });
    } else {
      duplicates.get(key).codes.push(lang.code);
    }
  }

  const dupeList = Array.from(duplicates.values())
    .filter(d => d.codes.length > 1)
    .sort((a, b) => a.name.localeCompare(b.name));

  const normalizationCandidates = languages
    .map(l => {
      const normalized = normalizeTargetLanguageForPrompt(l.code);
      const changed = normalized && normalized !== l.name && normalized !== l.code;
      return {
        code: l.code,
        name: l.name,
        promptTarget: normalized,
        changed
      };
    })
    .filter(x => x.changed)
    .sort((a, b) => a.code.localeCompare(b.code));

  const outDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outDir, { recursive: true });

  const inventoryPath = path.join(outDir, 'target-languages.md');
  const normalizationPath = path.join(outDir, 'prompt-target-normalization.md');

  const inventoryLines = [];
  inventoryLines.push(`# Target Languages (Config Page)\n`);
  inventoryLines.push(`Source: \`/api/languages\` → \`src/utils/languages.js#getAllLanguages()\`\n`);
  inventoryLines.push(`Total: **${languages.length}**\n`);
  inventoryLines.push(`| Code | Name |`);
  inventoryLines.push(`|---|---|`);
  for (const lang of languages) {
    inventoryLines.push(`| \`${mdEscape(lang.code)}\` | ${mdEscape(lang.name)} |`);
  }
  inventoryLines.push('');
  inventoryLines.push(`## Duplicate Display Names\n`);
  inventoryLines.push(`Some names appear multiple times because ISO-639-2 has bibliographic/terminologic duplicates (e.g., \`fre\`/ \`fra\`).\n`);
  inventoryLines.push(`| Name | Codes |`);
  inventoryLines.push(`|---|---|`);
  for (const d of dupeList) {
    inventoryLines.push(`| ${mdEscape(d.name)} | ${d.codes.map(c => `\`${mdEscape(c)}\``).join(', ')} |`);
  }
  inventoryLines.push('');
  fs.writeFileSync(inventoryPath, inventoryLines.join('\n'), 'utf8');

  const normLines = [];
  normLines.push(`# Prompt Target Normalization\n`);
  normLines.push(`This is what we feed to translation prompts (LLM providers) when a given config-page target code is selected.\n`);
  normLines.push(`| Code | Display Name | Prompt Target |`);
  normLines.push(`|---|---|---|`);
  for (const row of normalizationCandidates) {
    normLines.push(`| \`${mdEscape(row.code)}\` | ${mdEscape(row.name)} | ${mdEscape(row.promptTarget)} |`);
  }
  normLines.push('');
  fs.writeFileSync(normalizationPath, normLines.join('\n'), 'utf8');

  process.stdout.write(`Wrote:\n- ${inventoryPath}\n- ${normalizationPath}\n`);
}

main();

