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

                // Create settings with content for all global languages
                var settings = Object.assign({}, App.DEFAULT_SETTINGS);
                App.initializeScreenshotContent(settings);

                platformData.screenshots.push({
                    src: e.target.result,
                    image: img,
                    width: img.width,
                    height: img.height,
                    settings: settings
                });
                if (isFirst) {
                    platformData.activeIndex = 0;
                }
                App.updateSettingsUI();
                App.renderAllPreviews();
                App.updateExportButton();
                App.updateSidebarCounts();
                App.Storage.scheduleSave();
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
    App.Storage.scheduleSave();
};

App.selectScreenshot = function(index) {
    // Save current content before switching
    var currentSettings = App.getActiveSettings();
    App.saveContentToActiveLanguage(currentSettings);

    App.setActiveIndex(index);

    // Load content for active language in new screenshot
    var newSettings = App.getActiveSettings();
    App.loadContentFromLanguage(newSettings, App.state.activeLanguage || 'en');

    App.updateSettingsUI();
    App.renderAllPreviews();
};

App.updateSettingsUI = function() {
    var settings = App.getActiveSettings() || App.DEFAULT_SETTINGS;
    var screenshots = App.getActiveScreenshots();

    App.updateApplyToAllButton();

    // Update language tabs
    if (typeof App.updateLanguageTabs === 'function') {
        App.updateLanguageTabs();
    }

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
    document.getElementById('bgGradientColor').value = settings.bgGradientColor || '#ffffff';
    document.getElementById('bgGradientColorHex').value = (settings.bgGradientColor || '#ffffff').toUpperCase();

    // Device frame settings
    document.getElementById('addDeviceFrame').checked = settings.addDeviceFrame;
    document.getElementById('deviceFrameContent').style.display = settings.addDeviceFrame ? 'block' : 'none';
    document.getElementById('deviceFrameColor').value = settings.deviceFrameColor;
    document.getElementById('deviceFrameColorHex').value = settings.deviceFrameColor.toUpperCase();

    // Other settings
    document.getElementById('addShadow').checked = settings.addShadow;

    document.querySelectorAll('.position-text-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.preset === settings.preset);
    });

    document.querySelectorAll('.align-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.align === (settings.textAlign || 'center'));
    });

    // Spacing buttons
    document.querySelectorAll('.spacing-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.spacing === (settings.textSpacing || 'medium'));
    });

    App.updateTextFieldsState();
};

App.updateTextFieldsState = function() {
    var settings = App.getActiveSettings();
    if (!settings) return;

    var preset = App.PRESETS[settings.preset];
    var hideText = preset.noText === true;

    document.getElementById('languageSection').style.display = hideText ? 'none' : 'block';
    document.getElementById('titleSection').style.display = hideText ? 'none' : 'block';
    document.getElementById('bodySection').style.display = hideText ? 'none' : 'block';
    document.getElementById('spacingRow').style.display = hideText ? 'none' : 'flex';
    document.getElementById('alignRow').style.display = hideText ? 'none' : 'flex';
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
        'addShadow', 'preset', 'textAlign', 'textSpacing'
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
        preset: currentSettings.preset,
        textAlign: currentSettings.textAlign,
        textSpacing: currentSettings.textSpacing
    };

    screenshots.forEach(function(screenshot) {
        Object.assign(screenshot.settings, settingsToApply);
    });

    App.renderAllPreviews();
    App.updateSettingsUI();
    App.Storage.scheduleSave();
};

App.moveScreenshot = function(fromIndex, toIndex) {
    var screenshots = App.getActiveScreenshots();
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= screenshots.length || toIndex >= screenshots.length) return;

    var activeIndex = App.getActiveIndex();
    var item = screenshots.splice(fromIndex, 1)[0];
    screenshots.splice(toIndex, 0, item);

    // Update active index to follow the moved item if it was active
    if (activeIndex === fromIndex) {
        App.setActiveIndex(toIndex);
    } else if (fromIndex < activeIndex && toIndex >= activeIndex) {
        App.setActiveIndex(activeIndex - 1);
    } else if (fromIndex > activeIndex && toIndex <= activeIndex) {
        App.setActiveIndex(activeIndex + 1);
    }

    App.renderAllPreviews();
    App.Storage.scheduleSave();
};
