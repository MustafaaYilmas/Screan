// ============================================
// Gestionnaires d'événements
// ============================================

var App = window.App || {};

App.initEventListeners = function() {
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
            App.renderAllPreviews();
        }
    });

    document.getElementById('subheadline').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.subheadline = e.target.value;
            App.renderAllPreviews();
        }
    });

    // Colors
    document.getElementById('textColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.textColor = e.target.value;
            document.getElementById('textColorHex').textContent = e.target.value.toUpperCase();
            App.renderAllPreviews();
        }
    });

    document.getElementById('bgColor1').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bgColor = e.target.value;
            document.getElementById('bgColor1Hex').textContent = e.target.value.toUpperCase();
            App.renderAllPreviews();
        }
    });

    // Shadow toggle
    document.getElementById('addShadow').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.addShadow = e.target.checked;
            App.renderAllPreviews();
        }
    });

    // Device frame toggle
    document.getElementById('addDeviceFrame').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.addDeviceFrame = e.target.checked;
            document.getElementById('deviceFrameColorRow').style.display = e.target.checked ? 'flex' : 'none';
            App.renderAllPreviews();
        }
    });

    // Device frame color
    document.getElementById('deviceFrameColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.deviceFrameColor = e.target.value;
            document.getElementById('deviceFrameColorHex').textContent = e.target.value.toUpperCase();
            App.renderAllPreviews();
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
                App.renderAllPreviews();
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

    // Delete screenshot
    document.getElementById('deleteScreenshotBtn').addEventListener('click', function() {
        var screenshots = App.getActiveScreenshots();
        if (screenshots.length > 0) {
            App.removeScreenshot(App.getActiveIndex());
        }
    });
};
