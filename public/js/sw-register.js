(function() {
    'use strict';

    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', function() {
        // Daily cache-buster ensures clients fetch the latest SW when the file changes
        const cacheBust = Math.floor(Date.now() / 86400000);
        navigator.serviceWorker.register('/sw.js?v=' + cacheBust, { scope: '/', updateViaCache: 'none' })
            .then(function(reg) {
                setInterval(function() {
                    reg.update().catch(function(){});
                }, 60 * 60 * 1000);

                navigator.serviceWorker.addEventListener('controllerchange', function() {
                    // no-op
                });
            })
            .catch(function(){ /* no-op */ });
    });

    navigator.serviceWorker.addEventListener('message', function(){ });
})();
