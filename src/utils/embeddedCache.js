/**
 * Embedded Subtitle Cache
 * Stores extracted embedded subtitle tracks (original + translated) keyed by video hash and track id.
 */

const log = require('./logger');
const { StorageFactory, StorageAdapter } = require('../storage');

let storageAdapter = null;

async function getStorageAdapter() {
  if (!storageAdapter) {
    storageAdapter = await StorageFactory.getStorageAdapter();
  }
  return storageAdapter;
}

function normalizeString(value, fallback = '') {
  if (!value && fallback) return fallback;
  if (!value) return '';
  const str = String(value);

  // Sanitize wildcards and special characters to prevent NoSQL injection attacks
  // Replace: * ? [ ] \ with underscores
  let normalized = str.replace(/[\*\?\[\]\\]/g, '_');
  // Also replace whitespace
  normalized = normalized.replace(/\s+/g, '_');

  if (normalized.length > 120) {
    return normalized.slice(0, 100) + '_' + require('crypto').createHash('md5').update(str).digest('hex').slice(0, 8);
  }
  return normalized;
}

function generateEmbeddedCacheKey(videoHash, trackId, languageCode, type = 'original', targetLanguageCode = '') {
  const safeVideo = normalizeString(videoHash || 'unknown');
  const safeTrack = normalizeString(trackId || 'track');
  const safeLang = normalizeString(languageCode || 'und');
  const safeTarget = normalizeString(targetLanguageCode || '');
  const base = `${safeVideo}_${type}_${safeLang}_${safeTrack}`;
  return type === 'translation' && safeTarget ? `${base}_${safeTarget}` : base;
}

function unwrapEntry(entry) {
  if (!entry) return null;
  if (entry.content && typeof entry.content === 'object' && (entry.content.videoHash || entry.content.type)) {
    return entry.content;
  }
  if (typeof entry === 'object' && entry.videoHash) {
    return entry;
  }
  if (entry.content && typeof entry.content === 'string') {
    return { content: entry.content };
  }
  if (typeof entry === 'string') {
    return { content: entry };
  }
  return entry;
}

async function saveOriginalEmbedded(videoHash, trackId, languageCode, content, metadata = {}) {
  const adapter = await getStorageAdapter();
  const cacheKey = generateEmbeddedCacheKey(videoHash, trackId, languageCode, 'original');
  const entry = {
    type: 'original',
    videoHash,
    trackId,
    languageCode,
    content,
    metadata: metadata || {},
    timestamp: Date.now(),
    version: '1.0'
  };
  await adapter.set(cacheKey, { content: entry }, StorageAdapter.CACHE_TYPES.EMBEDDED);
  log.debug(() => `[Embedded Cache] Saved original: ${cacheKey}`);
  return { cacheKey, entry };
}

async function saveTranslatedEmbedded(videoHash, trackId, sourceLanguageCode, targetLanguageCode, content, metadata = {}) {
  const adapter = await getStorageAdapter();
  const cacheKey = generateEmbeddedCacheKey(videoHash, trackId, sourceLanguageCode, 'translation', targetLanguageCode);
  const entry = {
    type: 'translation',
    videoHash,
    trackId,
    languageCode: sourceLanguageCode,
    targetLanguageCode,
    content,
    metadata: metadata || {},
    timestamp: Date.now(),
    version: '1.0'
  };
  await adapter.set(cacheKey, { content: entry }, StorageAdapter.CACHE_TYPES.EMBEDDED);
  log.debug(() => `[Embedded Cache] Saved translation: ${cacheKey}`);
  return { cacheKey, entry };
}

async function getOriginalEmbedded(videoHash, trackId, languageCode) {
  const adapter = await getStorageAdapter();
  const cacheKey = generateEmbeddedCacheKey(videoHash, trackId, languageCode, 'original');
  const entry = unwrapEntry(await adapter.get(cacheKey, StorageAdapter.CACHE_TYPES.EMBEDDED));
  if (!entry) return null;
  return { cacheKey, ...entry };
}

async function getTranslatedEmbedded(videoHash, trackId, sourceLanguageCode, targetLanguageCode) {
  const adapter = await getStorageAdapter();
  const cacheKey = generateEmbeddedCacheKey(videoHash, trackId, sourceLanguageCode, 'translation', targetLanguageCode);
  const entry = unwrapEntry(await adapter.get(cacheKey, StorageAdapter.CACHE_TYPES.EMBEDDED));
  if (!entry) return null;
  return { cacheKey, ...entry };
}

async function listEmbeddedTranslations(videoHash) {
  const adapter = await getStorageAdapter();
  const pattern = `${normalizeString(videoHash || 'unknown')}_translation_*`;
  const keys = await adapter.list(StorageAdapter.CACHE_TYPES.EMBEDDED, pattern);
  const results = [];
  for (const key of keys) {
    try {
      const entry = unwrapEntry(await adapter.get(key, StorageAdapter.CACHE_TYPES.EMBEDDED));
      if (!entry) continue;
      results.push({ cacheKey: key, ...entry });
    } catch (error) {
      log.warn(() => [`[Embedded Cache] Failed to fetch translation ${key}:`, error.message]);
    }
  }
  results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return results;
}

async function listEmbeddedOriginals(videoHash) {
  const adapter = await getStorageAdapter();
  const pattern = `${normalizeString(videoHash || 'unknown')}_original_*`;
  const keys = await adapter.list(StorageAdapter.CACHE_TYPES.EMBEDDED, pattern);
  const results = [];
  for (const key of keys) {
    try {
      const entry = unwrapEntry(await adapter.get(key, StorageAdapter.CACHE_TYPES.EMBEDDED));
      if (!entry) continue;
      results.push({ cacheKey: key, ...entry });
    } catch (error) {
      log.warn(() => [`[Embedded Cache] Failed to fetch original ${key}:`, error.message]);
    }
  }
  results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return results;
}

module.exports = {
  generateEmbeddedCacheKey,
  saveOriginalEmbedded,
  saveTranslatedEmbedded,
  getOriginalEmbedded,
  getTranslatedEmbedded,
  listEmbeddedOriginals,
  listEmbeddedTranslations
};
