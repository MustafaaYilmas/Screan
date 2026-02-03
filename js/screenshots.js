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
                App.scheduleRender();
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
    App.scheduleRender();
    App.updateExportButton();
    App.updateSidebarCounts();
};

App.selectScreenshot = function(index) {
    App.setActiveIndex(index);
    App.updateSettingsUI();
    App.scheduleRender();
};

App.updateSettingsUI = function() {
    var settings = App.getActiveSettings();
    var screenshots = App.getActiveScreenshots();
    var hasSelection = screenshots.length > 0;

    document.querySelectorAll('.settings-section input, .settings-section button, .settings-section select').forEach(function(el) {
        el.disabled = !hasSelection;
    });

    App.updateApplyToAllButton();

    if (!hasSelection) return;

    // Text content
    document.getElementById('headline').value = settings.headline;
    document.getElementById('subheadline').value = settings.subheadline;

    // Title settings
    document.getElementById('titleFont').value = settings.titleFont || 'sf-rounded';
    document.querySelectorAll('.size-btn[data-target="title"]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.size === (settings.titleSize || 'medium'));
    });
    document.getElementById('titleColor').value = settings.titleColor || '#ffffff';
    document.getElementById('titleColorHex').value = (settings.titleColor || '#ffffff').toUpperCase();
    document.getElementById('titleWeight').value = settings.titleWeight || 'bold';

    // Body settings
    document.getElementById('bodyFont').value = settings.bodyFont || 'sf-rounded';
    document.querySelectorAll('.size-btn[data-target="body"]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.size === (settings.bodySize || 'medium'));
    });
    document.getElementById('bodyColor').value = settings.bodyColor || '#ffffff';
    document.getElementById('bodyColorHex').value = (settings.bodyColor || '#ffffff').toUpperCase();
    document.getElementById('bodyWeight').value = settings.bodyWeight || 'medium';

    // Background settings
    document.getElementById('bgColor1').value = settings.bgColor;
    document.getElementById('bgColor1Hex').value = settings.bgColor.toUpperCase();
    document.getElementById('bgGradient').checked = settings.bgGradient || false;
    document.getElementById('gradientColorRow').style.display = settings.bgGradient ? 'flex' : 'none';
    document.getElementById('bgGradientColor').value = settings.bgGradientColor || '#4A90D9';
    document.getElementById('bgGradientColorHex').value = (settings.bgGradientColor || '#4A90D9').toUpperCase();

    // Device frame settings
    document.getElementById('addDeviceFrame').checked = settings.addDeviceFrame;
    document.getElementById('deviceFrameContent').style.display = settings.addDeviceFrame ? 'block' : 'none';
    document.getElementById('deviceFrameColor').value = settings.deviceFrameColor;
    document.getElementById('deviceFrameColorHex').value = settings.deviceFrameColor.toUpperCase();

    // Other settings
    document.getElementById('addShadow').checked = settings.addShadow;

    document.querySelectorAll('.position-btn-new').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.preset === settings.preset);
    });

    App.updateTextFieldsState();
};

App.updateTextFieldsState = function() {
    var settings = App.getActiveSettings();
    if (!settings) return;

    var preset = App.PRESETS[settings.preset];
    var hideText = preset.noText === true;

    document.getElementById('titleSection').style.display = hideText ? 'none' : 'block';
    document.getElementById('bodySection').style.display = hideText ? 'none' : 'block';
};

App.updateApplyToAllButton = function() {
    var screenshots = App.getActiveScreenshots();
    var settingsFooter = document.getElementById('settingsFooter');
    if (settingsFooter) {
        var showButton = screenshots.length >= 2 && !App.allSettingsMatch(screenshots);
        settingsFooter.style.display = showButton ? 'block' : 'none';
    }
};

App.allSettingsMatch = function(screenshots) {
    if (screenshots.length < 2) return true;

    var visualKeys = [
        // Title settings
        'titleFont', 'titleSize', 'titleColor', 'titleWeight',
        // Body settings
        'bodyFont', 'bodySize', 'bodyColor', 'bodyWeight',
        // Background settings
        'bgColor', 'bgGradient', 'bgGradientColor', 'bgGradientAngle',
        // Device frame settings
        'addDeviceFrame', 'deviceFrameColor',
        // Other settings
        'addShadow', 'preset'
    ];

    var first = screenshots[0].settings;
    for (var i = 1; i < screenshots.length; i++) {
        var current = screenshots[i].settings;
        for (var j = 0; j < visualKeys.length; j++) {
            var key = visualKeys[j];
            if (first[key] !== current[key]) {
                return false;
            }
        }
    }
    return true;
};

App.applySettingsToAll = function() {
    var screenshots = App.getActiveScreenshots();
    var currentSettings = App.getActiveSettings();
    if (!currentSettings || screenshots.length < 2) return;

    // Settings to apply (excluding text content: headline, subheadline)
    var settingsToApply = {
        // Title settings
        titleFont: currentSettings.titleFont,
        titleSize: currentSettings.titleSize,
        titleColor: currentSettings.titleColor,
        titleWeight: currentSettings.titleWeight,
        // Body settings
        bodyFont: currentSettings.bodyFont,
        bodySize: currentSettings.bodySize,
        bodyColor: currentSettings.bodyColor,
        bodyWeight: currentSettings.bodyWeight,
        // Background settings
        bgColor: currentSettings.bgColor,
        bgGradient: currentSettings.bgGradient,
        bgGradientColor: currentSettings.bgGradientColor,
        bgGradientAngle: currentSettings.bgGradientAngle,
        // Device frame settings
        addDeviceFrame: currentSettings.addDeviceFrame,
        deviceFrameColor: currentSettings.deviceFrameColor,
        // Other settings
        addShadow: currentSettings.addShadow,
        preset: currentSettings.preset
    };

    screenshots.forEach(function(screenshot) {
        Object.assign(screenshot.settings, settingsToApply);
    });

    App.scheduleRender();
    App.updateSettingsUI();
};
