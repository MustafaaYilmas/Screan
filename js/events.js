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

    // Export formats
    document.querySelectorAll('[data-format]').forEach(function(cb) {
        cb.addEventListener('change', function() {
            App.state.exportFormats = Array.from(document.querySelectorAll('[data-format]:checked')).map(function(c) { return c.dataset.format; });
            App.updateExportButton();
        });
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', App.exportAll);

    // Delete screenshot
    document.getElementById('deleteScreenshotBtn').addEventListener('click', function() {
        if (App.state.screenshots.length > 0) {
            App.removeScreenshot(App.state.activeIndex);
        }
    });
};
