// ============================================
// Event Handlers
// ============================================

var App = window.App || {};

// Debounce utility for input events
App.debounce = function(fn, delay) {
    var timeoutId;
    return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(function() {
            fn.apply(context, args);
        }, delay);
    };
};

// Throttle utility for resize events
App.throttle = function(fn, delay) {
    var lastCall = 0;
    var timeoutId;
    return function() {
        var context = this;
        var args = arguments;
        var now = Date.now();
        var remaining = delay - (now - lastCall);

        clearTimeout(timeoutId);

        if (remaining <= 0) {
            lastCall = now;
            fn.apply(context, args);
        } else {
            timeoutId = setTimeout(function() {
                lastCall = Date.now();
                fn.apply(context, args);
            }, remaining);
        }
    };
};

// Schedule render using requestAnimationFrame to avoid blocking
App._renderScheduled = false;
App.scheduleRender = function() {
    if (App._renderScheduled) return;
    App._renderScheduled = true;
    requestAnimationFrame(function() {
        App._renderScheduled = false;
        App.renderAllPreviews();
    });
};

// Debounced render for text inputs (300ms delay)
App.debouncedRender = App.debounce(function() {
    App.scheduleRender();
}, 300);

// Debounced render for color hex inputs (200ms delay)
App.debouncedColorRender = App.debounce(function() {
    App.scheduleRender();
    App.updateApplyToAllButton();
}, 200);

App.normalizeHex = function(value) {
    var hex = value.trim().toUpperCase();
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    // Validate hex format
    if (/^#[0-9A-F]{6}$/.test(hex)) {
        return hex.toLowerCase();
    }
    // Support 3-char hex
    if (/^#[0-9A-F]{3}$/.test(hex)) {
        return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return null;
};

App.initEventListeners = function() {
    // Add screenshot
    var addBtn = document.getElementById('addScreenshotBtn');
    var input = document.getElementById('screenshotInput');
    addBtn.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function(e) { App.handleScreenshots(e.target.files); });

    // Format select
    document.getElementById('formatSelect').addEventListener('change', function(e) {
        App.setCurrentFormat(e.target.value);
        App.scheduleRender();
    });

    // Text inputs (debounced for better INP)
    document.getElementById('headline').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.headline = e.target.value;
            App.debouncedRender();
        }
    });

    document.getElementById('subheadline').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.subheadline = e.target.value;
            App.debouncedRender();
        }
    });

    // Title font
    document.getElementById('titleFont').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.titleFont = e.target.value;
            App.scheduleRender();
            App.updateApplyToAllButton();
        }
    });

    // Body font
    document.getElementById('bodyFont').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bodyFont = e.target.value;
            App.scheduleRender();
            App.updateApplyToAllButton();
        }
    });

    // Size buttons
    document.querySelectorAll('.size-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var settings = App.getActiveSettings();
            if (!settings) return;

            var target = btn.dataset.target;
            var size = btn.dataset.size;

            // Update active state
            document.querySelectorAll('.size-btn[data-target="' + target + '"]').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');

            // Update settings
            if (target === 'title') {
                settings.titleSize = size;
            } else if (target === 'body') {
                settings.bodySize = size;
            }

            App.scheduleRender();
            App.updateApplyToAllButton();
        });
    });

    // Colors - color picker (use scheduleRender for smoother dragging)
    document.getElementById('textColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.textColor = e.target.value;
            document.getElementById('textColorHex').value = e.target.value.toUpperCase();
            App.scheduleRender();
            App.updateApplyToAllButton();
        }
    });

    document.getElementById('bgColor1').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bgColor = e.target.value;
            document.getElementById('bgColor1Hex').value = e.target.value.toUpperCase();
            App.scheduleRender();
            App.updateApplyToAllButton();
        }
    });

    // Colors - hex input (debounced for better INP)
    document.getElementById('textColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.textColor = hex;
                document.getElementById('textColor').value = hex;
                App.debouncedColorRender();
            }
        }
    });

    document.getElementById('bgColor1Hex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.bgColor = hex;
                document.getElementById('bgColor1').value = hex;
                App.debouncedColorRender();
            }
        }
    });

    document.getElementById('deviceFrameColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.deviceFrameColor = hex;
                document.getElementById('deviceFrameColor').value = hex;
                App.debouncedColorRender();
            }
        }
    });

    // Shadow toggle
    document.getElementById('addShadow').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.addShadow = e.target.checked;
            App.scheduleRender();
            App.updateApplyToAllButton();
        }
    });

    // Device frame toggle
    document.getElementById('addDeviceFrame').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.addDeviceFrame = e.target.checked;
            document.getElementById('deviceFrameColorRow').style.display = e.target.checked ? 'flex' : 'none';
            App.scheduleRender();
            App.updateApplyToAllButton();
        }
    });

    // Device frame color (use scheduleRender for smoother dragging)
    document.getElementById('deviceFrameColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.deviceFrameColor = e.target.value;
            document.getElementById('deviceFrameColorHex').value = e.target.value.toUpperCase();
            App.scheduleRender();
            App.updateApplyToAllButton();
        }
    });

    // Position presets
    document.querySelectorAll('.position-btn-new').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var settings = App.getActiveSettings();
            if (settings) {
                document.querySelectorAll('.position-btn-new').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                settings.preset = btn.dataset.preset;
                App.updateTextFieldsState();
                App.scheduleRender();
                App.updateApplyToAllButton();
            }
        });
    });

    // Platform selection
    document.querySelectorAll('.platform-header').forEach(function(header) {
        header.addEventListener('click', function() {
            var platformItem = header.closest('.platform-item');
            var platformKey = platformItem.dataset.platform;
            App.selectPlatform(platformKey);
        });
    });

    // Export format checkboxes (per platform)
    document.querySelectorAll('.size-item input[type="checkbox"]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            var platformKey = cb.dataset.platform;
            var platform = App.state.platforms[platformKey];

            // Update exportFormats for this platform
            platform.exportFormats = Array.from(
                document.querySelectorAll('.size-item input[data-platform="' + platformKey + '"]:checked')
            ).map(function(c) { return c.dataset.format; });

            App.updateExportButton();
        });

        // Prevent click from bubbling to platform header
        cb.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });

    // Prevent label clicks from selecting platform
    document.querySelectorAll('.size-item').forEach(function(label) {
        label.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', App.exportAll);

    // Apply to All
    document.getElementById('applyToAllBtn').addEventListener('click', function() {
        App.applySettingsToAll();
    });
};
