(function() {
    'use strict';

    function wireProWarningToggle() {
        var modelSelect = document.getElementById('geminiModel');
        var warningDiv = document.getElementById('proRateLimitWarning');
        if (!modelSelect || !warningDiv) return;

        function updateWarning() {
            warningDiv.style.display = modelSelect.value === 'gemini-2.5-pro' ? 'block' : 'none';
        }

        modelSelect.addEventListener('change', updateWarning);
        updateWarning();
    }

    function initWidgets() {
        wireProWarningToggle();
    }

    (window.partialsReady || Promise.resolve()).then(initWidgets).catch(function(err) {
        console.error(err);
    });
})();
