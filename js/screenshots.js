// ============================================
// Screenshot Management
// ============================================

var App = window.App || {};

App.handleScreenshots = function(files) {
    var platformData = App.getActivePlatformData();

    Array.from(files).forEach(function(file) {
        if (!file.type.startsWith('image/')) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var isFirst = platformData.screenshots.length === 0;
                platformData.screenshots.push({
                    src: e.target.result,
                    image: img,
                    width: img.width,
                    height: img.height,
                    settings: Object.assign({}, App.DEFAULT_SETTINGS)
                });
                if (isFirst) {
                    platformData.activeIndex = 0;
                }
                App.updateSettingsUI();
                App.renderAllPreviews();
                App.updateExportButton();
                App.updateSidebarCounts();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

App.removeScreenshot = function(index) {
    var platformData = App.getActivePlatformData();
    platformData.screenshots.splice(index, 1);
    if (platformData.activeIndex >= platformData.screenshots.length) {
        platformData.activeIndex = Math.max(0, platformData.screenshots.length - 1);
    }
    App.updateSettingsUI();
    App.renderAllPreviews();
    App.updateExportButton();
    App.updateSidebarCounts();
};

App.selectScreenshot = function(index) {
    App.setActiveIndex(index);
    App.updateSettingsUI();
    App.renderAllPreviews();
};

App.updateSettingsUI = function() {
    var settings = App.getActiveSettings();
    var screenshots = App.getActiveScreenshots();
    var hasSelection = screenshots.length > 0;

    document.querySelectorAll('.settings-section input, .settings-section button, .settings-section select').forEach(function(el) {
        el.disabled = !hasSelection;
    });

    // Update delete button state
    var deleteBtn = document.getElementById('deleteScreenshotBtn');
    if (deleteBtn) {
        deleteBtn.disabled = !hasSelection;
    }

    if (!hasSelection) return;

    document.getElementById('headline').value = settings.headline;
    document.getElementById('subheadline').value = settings.subheadline;
    document.getElementById('textColor').value = settings.textColor;
    document.getElementById('textColorHex').textContent = settings.textColor.toUpperCase();
    document.getElementById('bgColor1').value = settings.bgColor;
    document.getElementById('bgColor1Hex').textContent = settings.bgColor.toUpperCase();
    document.getElementById('addShadow').checked = settings.addShadow;
    document.getElementById('addDeviceFrame').checked = settings.addDeviceFrame;
    document.getElementById('deviceFrameColor').value = settings.deviceFrameColor;
    document.getElementById('deviceFrameColorHex').textContent = settings.deviceFrameColor.toUpperCase();
    document.getElementById('deviceFrameColorRow').style.display = settings.addDeviceFrame ? 'flex' : 'none';

    // Title font and size
    document.getElementById('titleFont').value = settings.titleFont || 'sf-pro';
    document.querySelectorAll('.size-btn[data-target="title"]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.size === (settings.titleSize || 'medium'));
    });

    // Body font and size
    document.getElementById('bodyFont').value = settings.bodyFont || 'sf-pro';
    document.querySelectorAll('.size-btn[data-target="body"]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.size === (settings.bodySize || 'medium'));
    });

    document.querySelectorAll('.position-btn-new').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.preset === settings.preset);
    });

    App.updateTextFieldsState();
};

App.updateTextFieldsState = function() {
    var settings = App.getActiveSettings();
    if (!settings) return;

    var preset = App.PRESETS[settings.preset];
    var isDisabled = preset.noText === true;

    document.getElementById('headline').disabled = isDisabled;
    document.getElementById('subheadline').disabled = isDisabled;
    document.getElementById('textColor').disabled = isDisabled;
    document.getElementById('titleFont').disabled = isDisabled;
    document.getElementById('bodyFont').disabled = isDisabled;

    document.querySelectorAll('.size-btn').forEach(function(btn) {
        btn.disabled = isDisabled;
    });
};
