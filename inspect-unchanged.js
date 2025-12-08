const fs = require('fs');
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const es = JSON.parse(fs.readFileSync('locales/es.json', 'utf8'));
const keys = [
  'toolbox.documentTitle',
  'toolbox.header.title',
  'toolbox.status.addon',
  'toolbox.hero.eyebrow',
  'toolbox.downloads.unitB',
  'toolbox.embedded.step1.helper',
  'toolbox.embedded.step1.extractBlocked',
  'toolbox.autoSubs.steps.streamPlaceholder',
  'toolbox.autoSubs.steps.modeLocal',
  'config.heroTitle',
  'config.quickStatsToolbox',
  'config.opensubs.title',
  'config.validation.error',
  'config.providers.subsource.title',
  'config.providers.subsource.linkLabel',
  'config.providers.subdl.title',
  'config.providers.subdl.linkLabel',
  'config.providersUi.main.defaultGemini',
  'config.providersUi.placeholders.cfworkers',
  'config.gemini.apiKey.linkLabel',
  'config.gemini.model.options.flashLite',
  'config.gemini.model.options.flash',
  'config.otherApiKeys.cloudflare.label',
  'config.otherApiKeys.cloudflare.placeholder',
  'config.learnMode.label',
  'nav.subToolbox',
  'fileUpload.advanced.topP.label',
  'fileUpload.queue.meta.target',
  'sync.badges.addon',
  'sync.badges.hash',
  'sync.step3.autosync.generic',
  'sync.plan.summary',
  'sync.plan.windowCountSeconds'
];
function get(obj, path) { return path.split('.').reduce((o,k)=>o&&o[k], obj); }
for (const k of keys) {
  console.log('===', k, '===');
  console.log('EN:', get(en.messages, k));
  console.log('ES:', get(es.messages, k));
}
