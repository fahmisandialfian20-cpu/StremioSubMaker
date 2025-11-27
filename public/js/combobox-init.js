(function() {
    'use strict';

    function initCombos() {
        if (!window.ComboBox || typeof window.ComboBox.enhanceAll !== 'function') {
            return;
        }
        window.ComboBox.enhanceAll(document);
    }

    (window.partialsReady || Promise.resolve()).then(initCombos).catch(function(err) {
        console.error(err);
    });
})();
