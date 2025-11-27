(function() {
    'use strict';

    /**
     * Load HTML partials declared via data-include attributes.
     * Exposes window.partialsReady so other scripts can wait before wiring UI.
     */
    function loadPartial(el) {
        const src = el.getAttribute('data-include');
        if (!src) return Promise.resolve();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        return fetch(src, { cache: 'no-store', signal: controller.signal })
            .then(function(res) {
                if (!res.ok) {
                    throw new Error('Failed to load partial: ' + src + ' (' + res.status + ')');
                }
                return res.text();
            })
            .then(function(html) {
                el.innerHTML = html;
                el.removeAttribute('data-include');
            })
            .catch(function(err) {
                console.error(err);
                el.innerHTML = '<div style=\"padding:1rem; color:#ef4444;\">Failed to load ' + src + '</div>';
            })
            .finally(function() {
                clearTimeout(timeout);
            });
    }

    const targets = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
    const ready = Promise.all(targets.map(loadPartial)).catch(function(err) {
        console.error(err);
    });

    window.partialsReady = ready;
})();
