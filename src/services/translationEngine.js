/**
 * Translation Engine - Structure-First Subtitle Translation
 *
 * This engine solves subtitle sync problems by:
 * 1. Parsing SRT into structured entries (id, timecode, text)
 * 2. Translating ONLY text content in batches
 * 3. Reconstructing SRT with ORIGINAL timings (guaranteed preservation)
 * 4. Validating structure at every step
 * 5. Streaming results entry-by-entry as they're validated
 *
 * Benefits:
 * - Perfect timing preservation (timings never sent to AI)
 * - No sync issues (structure controlled by us)
 * - Entry-level caching for maximum reuse
 * - Simple, predictable behavior
 */

const { parseSRT, toSRT } = require('../utils/subtitle');
const GeminiService = require('./gemini');
const crypto = require('crypto');

// Entry-level cache for translated subtitle entries
// Key: hash of (source_text + target_language)
// Value: translated text
const entryCache = new Map();
const MAX_ENTRY_CACHE_SIZE = 10000; // Cache up to 10k individual entries

class TranslationEngine {
  constructor(geminiService) {
    this.gemini = geminiService;
    this.batchSize = 100; // Translate 100 entries at a time (adjustable)
    this.maxRetries = 3;
  }

  /**
   * Main translation method - structure-first approach
   * @param {string} srtContent - Original SRT content
   * @param {string} targetLanguage - Target language name
   * @param {string} customPrompt - Optional custom prompt
   * @param {Function} onProgress - Callback for progress updates (entry-by-entry)
   * @returns {Promise<string>} - Translated SRT content
   */
  async translateSubtitle(srtContent, targetLanguage, customPrompt = null, onProgress = null) {
    console.log('[TranslationEngine] Starting structure-first translation');

    // Step 1: Parse SRT into structured entries
    const entries = parseSRT(srtContent);
    if (!entries || entries.length === 0) {
      throw new Error('Invalid SRT content: no valid entries found');
    }

    console.log(`[TranslationEngine] Parsed ${entries.length} subtitle entries`);

    // Step 2: Split entries into batches
    const batches = this.createBatches(entries, this.batchSize);
    console.log(`[TranslationEngine] Created ${batches.length} batches (${this.batchSize} entries each)`);

    // Step 3: Translate each batch
    const translatedEntries = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`[TranslationEngine] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} entries)`);

      try {
        const translatedBatch = await this.translateBatch(
          batch,
          targetLanguage,
          customPrompt,
          batchIndex,
          batches.length
        );

        // Validate: ensure we got the same number of entries
        if (translatedBatch.length !== batch.length) {
          console.error(`[TranslationEngine] Batch ${batchIndex + 1} validation failed: expected ${batch.length} entries, got ${translatedBatch.length}`);
          throw new Error(`Translation validation failed: entry count mismatch in batch ${batchIndex + 1}`);
        }

        // Merge translated text with original structure
        for (let i = 0; i < batch.length; i++) {
          const original = batch[i];
          const translated = translatedBatch[i];

          // Create entry with original timing and translated text
          const translatedEntry = {
            id: original.id,
            timecode: original.timecode, // PRESERVE ORIGINAL TIMING
            text: translated.text
          };

          translatedEntries.push(translatedEntry);

          // Call progress callback if provided
          if (typeof onProgress === 'function') {
            try {
              await onProgress({
                totalEntries: entries.length,
                completedEntries: translatedEntries.length,
                currentBatch: batchIndex + 1,
                totalBatches: batches.length,
                entry: translatedEntry
              });
            } catch (err) {
              console.warn('[TranslationEngine] Progress callback error:', err.message);
            }
          }
        }

        console.log(`[TranslationEngine] Batch ${batchIndex + 1}/${batches.length} completed successfully`);

        // Small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`[TranslationEngine] Error in batch ${batchIndex + 1}:`, error.message);
        throw new Error(`Translation failed at batch ${batchIndex + 1}: ${error.message}`);
      }
    }

    // Step 4: Final validation
    if (translatedEntries.length !== entries.length) {
      throw new Error(`Translation validation failed: expected ${entries.length} entries, got ${translatedEntries.length}`);
    }

    console.log(`[TranslationEngine] Translation completed: ${translatedEntries.length} entries translated`);

    // Step 5: Convert back to SRT format
    const translatedSRT = toSRT(translatedEntries);

    return translatedSRT;
  }

  /**
   * Create batches from entries
   * @param {Array} entries - Subtitle entries
   * @param {number} batchSize - Number of entries per batch
   * @returns {Array<Array>} - Array of batches
   */
  createBatches(entries, batchSize) {
    const batches = [];
    for (let i = 0; i < entries.length; i += batchSize) {
      batches.push(entries.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Translate a batch of entries
   * @param {Array} batch - Batch of subtitle entries
   * @param {string} targetLanguage - Target language name
   * @param {string} customPrompt - Optional custom prompt
   * @param {number} batchIndex - Current batch index
   * @param {number} totalBatches - Total number of batches
   * @returns {Promise<Array>} - Array of translated entries
   */
  async translateBatch(batch, targetLanguage, customPrompt, batchIndex, totalBatches) {
    // Check cache first
    const cacheResults = this.checkBatchCache(batch, targetLanguage);

    // If all entries are cached, return immediately
    if (cacheResults.allCached) {
      console.log(`[TranslationEngine] Batch ${batchIndex + 1} fully cached (${batch.length} entries)`);
      return cacheResults.entries;
    }

    // Prepare batch for translation
    const batchText = this.prepareBatchText(batch);

    // Create translation prompt
    const prompt = this.createBatchPrompt(batchText, targetLanguage, customPrompt, batch.length);

    // Translate with retries
    let translatedText = null;
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[TranslationEngine] Translating batch ${batchIndex + 1}/${totalBatches} (attempt ${attempt}/${this.maxRetries})`);
        translatedText = await this.gemini.translateSubtitle(
          batchText,
          'detected',
          targetLanguage,
          prompt
        );
        break; // Success
      } catch (error) {
        lastError = error;
        console.error(`[TranslationEngine] Batch translation attempt ${attempt} failed:`, error.message);

        if (attempt < this.maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`[TranslationEngine] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!translatedText) {
      throw new Error(`Batch translation failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }

    // Parse translated text back into entries
    const translatedEntries = this.parseBatchResponse(translatedText, batch.length);

    // Validate: must have same number of entries
    if (translatedEntries.length !== batch.length) {
      console.error(`[TranslationEngine] Batch validation failed: expected ${batch.length} entries, got ${translatedEntries.length}`);
      console.error(`[TranslationEngine] Translated text:\n${translatedText.substring(0, 500)}...`);
      throw new Error(`Translation validation failed: expected ${batch.length} translated entries, got ${translatedEntries.length}`);
    }

    // Cache individual entries
    for (let i = 0; i < batch.length; i++) {
      this.cacheEntry(batch[i].text, targetLanguage, translatedEntries[i].text);
    }

    console.log(`[TranslationEngine] Batch ${batchIndex + 1} translated and validated (${translatedEntries.length} entries)`);

    return translatedEntries;
  }

  /**
   * Prepare batch text for translation
   * Format: numbered list of texts
   * @param {Array} batch - Batch of subtitle entries
   * @returns {string} - Formatted batch text
   */
  prepareBatchText(batch) {
    const lines = batch.map((entry, index) => {
      const num = index + 1;
      // Clean text: remove extra whitespace, normalize line breaks
      const cleanText = entry.text.trim().replace(/\n+/g, '\n');
      return `${num}. ${cleanText}`;
    });

    return lines.join('\n\n');
  }

  /**
   * Create translation prompt for a batch
   * @param {string} batchText - Formatted batch text
   * @param {string} targetLanguage - Target language name
   * @param {string} customPrompt - Optional custom prompt
   * @param {number} expectedCount - Expected number of entries
   * @returns {string} - Complete prompt
   */
  createBatchPrompt(batchText, targetLanguage, customPrompt, expectedCount) {
    if (customPrompt) {
      // Use custom prompt if provided
      return customPrompt.replace('{target_language}', targetLanguage);
    }

    // Default structured prompt
    const prompt = `You are translating subtitle text to ${targetLanguage}.

CRITICAL RULES:
1. Translate ONLY the text content
2. PRESERVE the numbering exactly (1. 2. 3. etc.)
3. Return EXACTLY ${expectedCount} numbered entries
4. Keep line breaks within each entry
5. Maintain natural dialogue flow for ${targetLanguage}
6. Use appropriate colloquialisms for ${targetLanguage}

DO NOT:
- Add explanations or notes
- Skip any entries
- Merge or split entries
- Change the numbering
- Add extra entries

INPUT (${expectedCount} entries):

${batchText}

OUTPUT FORMAT (must be ${expectedCount} numbered entries):`;

    return prompt;
  }

  /**
   * Parse batch translation response
   * @param {string} translatedText - Raw translated text from Gemini
   * @param {number} expectedCount - Expected number of entries
   * @returns {Array} - Array of translated entries (with index and text)
   */
  parseBatchResponse(translatedText, expectedCount) {
    // Clean the response
    let cleaned = translatedText.trim();

    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```[a-z]*\n?/g, '');

    // Try to extract numbered entries
    // Pattern: "1. text" or "1) text" or "1 - text"
    const entries = [];

    // Split by double newlines first (entry separator)
    const blocks = cleaned.split(/\n\n+/);

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      // Try to match numbered entry: "N. text" or "N) text" or "N - text"
      const match = trimmed.match(/^(\d+)[.):\s-]+(.+)$/s);

      if (match) {
        const num = parseInt(match[1]);
        const text = match[2].trim();

        entries.push({
          index: num - 1, // Convert to 0-based index
          text: text
        });
      } else {
        // If no number found, try to add as-is if we're missing entries
        if (entries.length < expectedCount) {
          console.warn('[TranslationEngine] Found unnumbered entry, attempting to use as-is:', trimmed.substring(0, 50));
          entries.push({
            index: entries.length,
            text: trimmed
          });
        }
      }
    }

    // Sort by index to ensure correct order
    entries.sort((a, b) => a.index - b.index);

    // Validate: must have expected count
    if (entries.length !== expectedCount) {
      console.warn(`[TranslationEngine] Entry count mismatch: expected ${expectedCount}, parsed ${entries.length}`);

      // Try alternative parsing: split by newlines and look for patterns
      const lines = cleaned.split('\n');
      const altEntries = [];
      let currentEntry = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const match = trimmed.match(/^(\d+)[.):\s-]+(.+)$/);

        if (match) {
          // New entry starts
          if (currentEntry) {
            altEntries.push(currentEntry);
          }
          const num = parseInt(match[1]);
          currentEntry = {
            index: num - 1,
            text: match[2].trim()
          };
        } else if (currentEntry) {
          // Continue current entry
          currentEntry.text += '\n' + trimmed;
        }
      }

      if (currentEntry) {
        altEntries.push(currentEntry);
      }

      if (altEntries.length === expectedCount) {
        console.log(`[TranslationEngine] Alternative parsing successful: ${altEntries.length} entries`);
        return altEntries.sort((a, b) => a.index - b.index);
      }
    }

    return entries;
  }

  /**
   * Check if batch entries are cached
   * @param {Array} batch - Batch of entries
   * @param {string} targetLanguage - Target language
   * @returns {Object} - { allCached: boolean, entries: Array }
   */
  checkBatchCache(batch, targetLanguage) {
    const cachedEntries = [];
    let cacheHits = 0;

    for (const entry of batch) {
      const cached = this.getCachedEntry(entry.text, targetLanguage);
      if (cached) {
        cachedEntries.push({ index: entry.id - 1, text: cached });
        cacheHits++;
      } else {
        cachedEntries.push(null);
      }
    }

    const allCached = cacheHits === batch.length;

    if (cacheHits > 0) {
      console.log(`[TranslationEngine] Cache: ${cacheHits}/${batch.length} entries cached`);
    }

    return {
      allCached,
      entries: allCached ? cachedEntries : []
    };
  }

  /**
   * Get cached entry translation
   * @param {string} sourceText - Source text
   * @param {string} targetLanguage - Target language
   * @returns {string|null} - Cached translation or null
   */
  getCachedEntry(sourceText, targetLanguage) {
    const key = this.createCacheKey(sourceText, targetLanguage);
    return entryCache.get(key) || null;
  }

  /**
   * Cache an entry translation
   * @param {string} sourceText - Source text
   * @param {string} targetLanguage - Target language
   * @param {string} translatedText - Translated text
   */
  cacheEntry(sourceText, targetLanguage, translatedText) {
    // Enforce cache size limit (LRU-like behavior)
    if (entryCache.size >= MAX_ENTRY_CACHE_SIZE) {
      // Remove oldest entries (first 1000)
      const keysToDelete = Array.from(entryCache.keys()).slice(0, 1000);
      for (const key of keysToDelete) {
        entryCache.delete(key);
      }
    }

    const key = this.createCacheKey(sourceText, targetLanguage);
    entryCache.set(key, translatedText);
  }

  /**
   * Create cache key for an entry
   * @param {string} sourceText - Source text
   * @param {string} targetLanguage - Target language
   * @returns {string} - Cache key
   */
  createCacheKey(sourceText, targetLanguage) {
    const normalized = sourceText.trim().toLowerCase();
    const hash = crypto.createHash('md5')
      .update(`${normalized}:${targetLanguage}`)
      .digest('hex');
    return hash;
  }

  /**
   * Clear entry cache
   */
  clearCache() {
    entryCache.clear();
    console.log('[TranslationEngine] Entry cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      size: entryCache.size,
      maxSize: MAX_ENTRY_CACHE_SIZE
    };
  }
}

module.exports = TranslationEngine;
