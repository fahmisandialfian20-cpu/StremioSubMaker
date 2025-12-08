const fs = require('fs');

function main() {
  const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
  const ar = JSON.parse(fs.readFileSync('locales/ar.json', 'utf8'));

  if (!ar.messages || !ar.messages.toolbox) {
    throw new Error('ar.json is missing messages.toolbox structure');
  }

  const autoEn = en.messages.toolbox.autoSubs;
  const autoAr = ar.messages.toolbox.autoSubs || (ar.messages.toolbox.autoSubs = {});

  // Ensure nested objects exist
  const stepsAr = autoAr.steps || (autoAr.steps = {});
  const actionsAr = autoAr.actions || (autoAr.actions = {});
  const statusAr = autoAr.status || (autoAr.status = {});
  const logsAr = autoAr.logs || (autoAr.logs = {});

  // Missing step keys
  stepsAr.singleBatch = stepsAr.singleBatch || 'وضع دفعة واحدة';
  stepsAr.sendTimestamps =
    stepsAr.sendTimestamps || 'إرسال الطوابع الزمنية للذكاء الاصطناعي';
  stepsAr.providerLabel = stepsAr.providerLabel || 'مزود الترجمة';
  stepsAr.providerModelLabel = stepsAr.providerModelLabel || 'نموذج الترجمة';
  stepsAr.providerModelPlaceholder =
    stepsAr.providerModelPlaceholder || 'استخدام الإعداد الافتراضي للمزود';

  // Card + empty-state in steps
  stepsAr.translationsEmpty = stepsAr.translationsEmpty || 'لا توجد ترجمات بعد.';
  stepsAr.translationCardTitle = stepsAr.translationCardTitle || 'ترجمة {lang}';
  stepsAr.translationCardFallback =
    stepsAr.translationCardFallback || 'ترجمة مترجمة';

  // Actions
  actionsAr.downloadTranslation =
    actionsAr.downloadTranslation || 'تحميل {lang}';

  // Status additions
  statusAr.transcriptionDone =
    statusAr.transcriptionDone ||
    'اكتمل التفريغ الصوتي. جارٍ تجهيز التحميلات...';
  statusAr.failedPrefix = statusAr.failedPrefix || 'فشل: ';

  // Hash block
  autoAr.hash = {
    ...(autoAr.hash || {}),
    mismatch:
      autoAr.hash?.mismatch ||
      'عدم تطابق في التجزئة: المرتبط {linked} مقابل المُدخل {stream}. تم تعطيل رفع التخزين المؤقت.',
    linked:
      autoAr.hash?.linked ||
      'مرتبط: {linked} | البث: {stream}{cache}',
    waiting:
      autoAr.hash?.waiting || 'بانتظار تجزئة البث...',
    cacheDisabled:
      autoAr.hash?.cacheDisabled ||
      'تم تعطيل التخزين المؤقت لهذه العملية.',
  };

  // Logs additions (preserve existing ones if present)
  logsAr.noStream = logsAr.noStream || 'الصق رابط بث أولاً.';
  logsAr.noTargets =
    logsAr.noTargets ||
    'اختر لغة هدف واحدة على الأقل أو عطّل الترجمة.';
  logsAr.sendingRequest =
    logsAr.sendingRequest ||
    'جارٍ إرسال الطلب إلى Cloudflare Workers AI...';
  logsAr.finished = logsAr.finished || 'تم. التحميلات جاهزة.';
  logsAr.cacheSkipped =
    logsAr.cacheSkipped ||
    'تم تخطي رفع التخزين المؤقت بسبب عدم تطابق التجزئة.';

  // Providers block
  autoAr.providers = {
    ...(autoAr.providers || {}),
    missing: autoAr.providers?.missing || 'لا يوجد مزود مُكوَّن',
  };

  fs.writeFileSync('locales/ar.json', JSON.stringify(ar, null, 2) + '\n', 'utf8');
}

main();

