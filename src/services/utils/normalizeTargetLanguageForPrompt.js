const { resolveLanguageCode, resolveLanguageDisplayName } = require('../../utils/languageResolver');

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTargetLanguageForPrompt(targetLanguage) {
  const raw = String(targetLanguage || '').trim();
  if (!raw) return 'target language';

  const resolvedName = resolveLanguageDisplayName(raw) || raw;
  const resolvedCode = resolveLanguageCode(raw) || raw;

  const nameKey = normalizeKey(resolvedName);
  const codeKey = normalizeKey(resolvedCode).replace(/_/g, '-');

  // Portuguese (our config page uses ISO-639-2: por=PT default, pob=PT-BR)
  if (
    codeKey === 'pt-pt' ||
    codeKey === 'por' ||
    nameKey === 'portuguese (portugal)' ||
    nameKey === 'portuguese portugal'
  ) {
    return 'European Portuguese (Português de Portugal)';
  }
  if (
    codeKey === 'pt-br' ||
    codeKey === 'pob' ||
    nameKey === 'portuguese (brazil)' ||
    nameKey === 'portuguese (brazilian)' ||
    nameKey === 'portuguese brazil' ||
    nameKey === 'portuguese brazilian' ||
    nameKey === 'brazilian portuguese'
  ) {
    return 'Brazilian Portuguese (Português do Brasil)';
  }
  if (nameKey === 'portuguese' || codeKey === 'pt') {
    return 'European Portuguese (Português de Portugal)';
  }

  // Spanish (spa=ES default, spn=LATAM)
  if (
    codeKey === 'es-419' ||
    codeKey === 'spn' ||
    nameKey.includes('latin america') ||
    nameKey.includes('latam')
  ) {
    return 'Latin American Spanish (Español de Latinoamérica)';
  }
  if (nameKey === 'spanish' || codeKey === 'es' || codeKey === 'spa') {
    return 'Castilian Spanish (Español de España)';
  }

  // Chinese (chi=ZH default; zhs/zht are our simplified/traditional variants)
  if (codeKey === 'zh-hant' || codeKey === 'zht' || nameKey.includes('traditional')) {
    return 'Traditional Chinese (繁體中文)';
  }
  if (codeKey === 'zh-hans' || codeKey === 'zhs' || codeKey === 'chi' || nameKey.includes('simplified')) {
    return 'Simplified Chinese (简体中文)';
  }
  if (nameKey === 'chinese' || codeKey === 'zh') {
    return 'Simplified Chinese (简体中文)';
  }

  return resolvedName;
}

module.exports = { normalizeTargetLanguageForPrompt };
