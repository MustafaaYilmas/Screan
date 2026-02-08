// ============================================
// Event Handlers
// ============================================

var App = window.App || {};

// Helper to render and save after settings change (only active canvas)
App.renderAndSave = function() {
    App.renderActivePreview();
    App.updateSectionApplyButtons();
    App.Storage.scheduleSave();
    // Re-render after fonts finish loading (Google Fonts may load weight on demand)
    document.fonts.ready.then(function() {
        App.renderActivePreview();
    });
};

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
    // Settings tabs
    document.querySelectorAll('.settings-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            var targetTab = this.getAttribute('data-tab');

            // Update tab buttons
            document.querySelectorAll('.settings-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            this.classList.add('active');

            // Update tab content
            document.querySelectorAll('.settings-tab-content').forEach(function(content) {
                content.classList.remove('active');
            });
            document.getElementById(targetTab + 'Tab').classList.add('active');

            // Toggle footers based on active tab
            var translateFooter = document.getElementById('translateFooter');
            if (targetTab === 'localize') {
                App.updateTranslateFooterVisibility();
            } else {
                translateFooter.style.display = 'none';
            }
        });
    });

    // Add screenshot
    var addBtn = document.getElementById('addScreenshotBtn');
    var input = document.getElementById('screenshotInput');
    addBtn.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function(e) { App.handleScreenshots(e.target.files); });

    // Format select
    document.getElementById('formatSelect').addEventListener('change', function(e) {
        App.setCurrentFormat(e.target.value);
        App.renderAllPreviews();
    });

    // Text inputs
    document.getElementById('headline').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.headline = e.target.value;
            App.saveContentToActiveLanguage(settings);
            App.markTranslationDirty();
            App.renderAndSave();
        }
    });

    document.getElementById('subheadline').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.subheadline = e.target.value;
            App.saveContentToActiveLanguage(settings);
            App.markTranslationDirty();
            App.renderAndSave();
        }
    });

    // Title font
    document.getElementById('titleFont').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.titleFont = e.target.value;
            App.renderAndSave();
        }
    });

    // Body font
    document.getElementById('bodyFont').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bodyFont = e.target.value;
            App.renderAndSave();
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

            App.renderAndSave();
        });
    });

    // Title color - color picker
    document.getElementById('titleColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.titleColor = e.target.value;
            document.getElementById('titleColorHex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Title color - hex input
    document.getElementById('titleColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.titleColor = hex;
                document.getElementById('titleColor').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Title weight
    document.getElementById('titleWeight').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.titleWeight = e.target.value;
            App.renderAndSave();
        }
    });

    // Body color - color picker
    document.getElementById('bodyColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bodyColor = e.target.value;
            document.getElementById('bodyColorHex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Body color - hex input
    document.getElementById('bodyColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.bodyColor = hex;
                document.getElementById('bodyColor').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Body weight
    document.getElementById('bodyWeight').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bodyWeight = e.target.value;
            App.renderAndSave();
        }
    });

    // Background color - color picker
    document.getElementById('bgColor1').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bgColor = e.target.value;
            document.getElementById('bgColor1Hex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Background color - hex input
    document.getElementById('bgColor1Hex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.bgColor = hex;
                document.getElementById('bgColor1').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Background gradient toggle
    document.getElementById('bgGradient').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bgGradient = e.target.checked;
            document.getElementById('gradientColorRow').style.display = e.target.checked ? 'flex' : 'none';
            App.renderAndSave();
        }
    });

    // Gradient end color - color picker
    document.getElementById('bgGradientColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bgGradientColor = e.target.value;
            document.getElementById('bgGradientColorHex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Gradient end color - hex input
    document.getElementById('bgGradientColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.bgGradientColor = hex;
                document.getElementById('bgGradientColor').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Device frame color - color picker
    document.getElementById('deviceFrameColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.deviceFrameColor = e.target.value;
            document.getElementById('deviceFrameColorHex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Device frame color - hex input
    document.getElementById('deviceFrameColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.deviceFrameColor = hex;
                document.getElementById('deviceFrameColor').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Shadow toggle
    document.getElementById('addShadow').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.addShadow = e.target.checked;
            App.renderAndSave();
        }
    });

    // Device frame toggle
    document.getElementById('addDeviceFrame').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.addDeviceFrame = e.target.checked;
            document.getElementById('deviceFrameColorRow').style.display = e.target.checked ? 'flex' : 'none';
            App.renderAndSave();
        }
    });

    // Position presets (text buttons)
    document.querySelectorAll('.position-text-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var settings = App.getActiveSettings();
            if (settings) {
                document.querySelectorAll('.position-text-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                settings.preset = btn.dataset.preset;
                App.updateTextFieldsState();
                App.renderAndSave();
            }
        });
    });

    // Spacing slider
    var spacingSlider = document.getElementById('spacingSlider');
    if (spacingSlider) {
        spacingSlider.addEventListener('input', function() {
            var settings = App.getActiveSettings();
            if (!settings) return;
            settings.textSpacing = parseInt(this.value, 10);
            var spacingValueEl = document.getElementById('spacingValue');
            if (spacingValueEl) spacingValueEl.textContent = this.value;
            App.renderActivePreview();
        });

        spacingSlider.addEventListener('change', function() {
            App.Storage.scheduleSave();
        });
    }

    // Text alignment
    document.querySelectorAll('.align-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var settings = App.getActiveSettings();
            if (settings) {
                document.querySelectorAll('.align-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                settings.textAlign = btn.dataset.align;
                App.renderAndSave();
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
            App.Storage.scheduleSave();
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

    // Apply section to All
    document.querySelectorAll('.btn-apply-section').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var section = this.getAttribute('data-section');
            App.applySectionToAll(section);
            this.blur();
        });
    });

    // Toggle panels (sidebar + settings) - desktop only
    document.getElementById('togglePanels').addEventListener('click', function() {
        document.body.classList.toggle('panels-hidden');
        var isHidden = document.body.classList.contains('panels-hidden');
        var newIcon = isHidden ? 'square' : 'columns-3';
        // Lucide replaces <i> with <svg>, so we need to replace the svg with a new <i>
        var svg = this.querySelector('svg');
        if (svg) {
            var newI = document.createElement('i');
            newI.setAttribute('data-lucide', newIcon);
            svg.replaceWith(newI);
            lucide.createIcons({ nodes: [newI] });
        }
    });

    // Language management (defined in localize.js)
    App.initLanguageEvents();
};
