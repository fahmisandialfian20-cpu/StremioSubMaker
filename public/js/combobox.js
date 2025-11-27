(function() {
    'use strict';

    var valueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    var activeCombo = null;

    function dispatchChange(select) {
        var evt;
        try {
            evt = new Event('change', { bubbles: true });
        } catch (_) {
            evt = document.createEvent('Event');
            evt.initEvent('change', true, false);
        }
        select.dispatchEvent(evt);
    }

    function closeActiveCombo(except) {
        if (activeCombo && activeCombo !== except) {
            activeCombo.close();
        }
    }

    function enhanceSelect(select) {
        if (!select || select.dataset.comboInitialized === 'true') return null;
        if (!select.parentNode) return null;

        var wrapper = document.createElement('div');
        wrapper.className = 'combo';
        ['compact-select', 'target-select', 'subtitle-list'].forEach(function(cls) {
            if (select.classList && select.classList.contains(cls)) {
                wrapper.classList.add(cls);
            }
        });
        ['width', 'maxWidth', 'minWidth'].forEach(function(prop) {
            if (select.style && select.style[prop]) {
                wrapper.style[prop] = select.style[prop];
            }
        });
        var idBase = select.id || ('combo-' + Math.random().toString(36).slice(2));
        var panelId = idBase + '-panel';

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'combo-button';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-controls', panelId);

        var panel = document.createElement('div');
        panel.className = 'combo-panel';
        panel.id = panelId;
        panel.setAttribute('role', 'listbox');
        panel.tabIndex = -1;

        select.classList.add('combo-hidden-select');
        select.setAttribute('aria-hidden', 'true');
        select.tabIndex = -1;

        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(button);
        wrapper.appendChild(panel);

        function updateDisabled() {
            var disabled = select.disabled === true || select.getAttribute('disabled') === 'true';
            button.disabled = disabled;
            button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
            if (disabled) {
                wrapper.classList.remove('open');
            }
        }

        function syncFromSelect() {
            var value = select.value;
            var selectedOption = select.options && select.options[select.selectedIndex];
            var label = selectedOption ? selectedOption.textContent.trim() : (select.getAttribute('data-placeholder') || '');
            button.textContent = label || 'Select an option';

            Array.prototype.forEach.call(panel.querySelectorAll('.combo-option'), function(optEl) {
                var isSelected = optEl.dataset.value === value;
                optEl.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            });

            updateDisabled();
        }

        function buildOptions() {
            panel.innerHTML = '';
            Array.prototype.forEach.call(select.options || [], function(opt) {
                var optEl = document.createElement('div');
                optEl.className = 'combo-option';
                optEl.setAttribute('role', 'option');
                optEl.dataset.value = opt.value;
                optEl.textContent = opt.textContent;
                optEl.tabIndex = -1;
                if (opt.disabled) {
                    optEl.setAttribute('aria-disabled', 'true');
                }
                if (opt.selected) {
                    optEl.setAttribute('aria-selected', 'true');
                } else {
                    optEl.setAttribute('aria-selected', 'false');
                }
                panel.appendChild(optEl);
            });
            syncFromSelect();
        }

        function setValue(value) {
            if (valueDescriptor && typeof valueDescriptor.set === 'function') {
                valueDescriptor.set.call(select, value);
            } else {
                select.value = value;
            }
            syncFromSelect();
            dispatchChange(select);
        }

        function focusOption(step) {
            var options = Array.prototype.slice.call(panel.querySelectorAll('.combo-option'));
            if (!options.length) return;
            var focusedIndex = options.indexOf(document.activeElement);
            var targetIndex = 0;
            if (focusedIndex >= 0) {
                targetIndex = Math.min(options.length - 1, Math.max(0, focusedIndex + step));
            } else {
                var selectedIndex = options.findIndex(function(opt) { return opt.getAttribute('aria-selected') === 'true'; });
                targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
            }
            var target = options[targetIndex];
            if (target) {
                target.focus({ preventScroll: true });
            }
        }

        var state = {
            wrapper: wrapper,
            button: button,
            panel: panel,
            select: select,
            close: function() {
                wrapper.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                if (activeCombo === state) {
                    activeCombo = null;
                }
            },
            open: function() {
                if (select.disabled) return;
                closeActiveCombo(state);
                activeCombo = state;
                wrapper.classList.add('open');
                button.setAttribute('aria-expanded', 'true');
                var selected = panel.querySelector('[aria-selected="true"]');
                var first = panel.querySelector('.combo-option');
                var target = selected || first || panel;
                if (target && typeof target.focus === 'function') {
                    target.focus({ preventScroll: true });
                }
            },
            sync: syncFromSelect,
            rebuild: buildOptions
        };

        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (wrapper.classList.contains('open')) {
                state.close();
            } else {
                state.open();
            }
        });

        button.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!wrapper.classList.contains('open')) {
                    state.open();
                }
                focusOption(e.key === 'ArrowUp' ? -1 : 1);
            } else if (e.key === 'Escape' && wrapper.classList.contains('open')) {
                e.preventDefault();
                state.close();
            }
        });

        panel.addEventListener('click', function(e) {
            var optEl = e.target.closest('.combo-option');
            if (!optEl || optEl.getAttribute('aria-disabled') === 'true') return;
            setValue(optEl.dataset.value || '');
            state.close();
            button.focus({ preventScroll: true });
        });

        panel.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusOption(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusOption(-1);
            } else if (e.key === 'Home') {
                e.preventDefault();
                focusOption(-Infinity);
            } else if (e.key === 'End') {
                e.preventDefault();
                focusOption(Infinity);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                state.close();
                button.focus({ preventScroll: true });
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                var active = e.target.closest('.combo-option');
                if (active && active.getAttribute('aria-disabled') !== 'true') {
                    setValue(active.dataset.value || '');
                    state.close();
                    button.focus({ preventScroll: true });
                }
            }
        });

        select.addEventListener('change', syncFromSelect);

        var observer = new MutationObserver(function() {
            buildOptions();
        });
        observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });

        if (valueDescriptor && !select.__comboValuePatched) {
            Object.defineProperty(select, 'value', {
                get: function() {
                    return valueDescriptor.get.call(this);
                },
                set: function(v) {
                    valueDescriptor.set.call(this, v);
                    syncFromSelect();
                    return v;
                },
                configurable: true
            });
            select.__comboValuePatched = true;
        }

        buildOptions();
        updateDisabled();
        select.dataset.comboInitialized = 'true';
        wrapper.__comboState = state;
        return state;
    }

    function enhanceAll(root) {
        var scope = root || document;
        var selects = scope.querySelectorAll('select');
        var combos = [];
        Array.prototype.forEach.call(selects, function(sel) {
            var combo = enhanceSelect(sel);
            if (combo) combos.push(combo);
        });
        return combos;
    }

    document.addEventListener('click', function(e) {
        if (activeCombo && !activeCombo.wrapper.contains(e.target)) {
            activeCombo.close();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && activeCombo) {
            var combo = activeCombo;
            combo.close();
            if (combo.button && typeof combo.button.focus === 'function') {
                combo.button.focus({ preventScroll: true });
            }
        }
    });

    window.ComboBox = {
        enhanceSelect: enhanceSelect,
        enhanceAll: enhanceAll,
        closeAll: function() { closeActiveCombo(null); }
    };
})();
