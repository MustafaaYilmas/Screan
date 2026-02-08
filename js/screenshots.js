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
                // Select the newly added screenshot
                platformData.activeIndex = platformData.screenshots.length - 1;
                App.updateSettingsUI();
                App.renderAllPreviews();
                App.updateExportButton();
                App.updateSidebarCounts();
                App.Storage.scheduleSave();

                // Scroll to center the new preview
                var container = document.getElementById('previewsContainer');
                var items = container.querySelectorAll('.preview-item');
                var lastItem = items[items.length - 1];
                if (lastItem) {
                    lastItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
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

    // Update active class without rebuilding DOM or re-rendering canvases
    var container = document.getElementById('previewsContainer');
    var items = container.querySelectorAll('.preview-item');
    items.forEach(function(item, i) {
        item.classList.toggle('active', i === index);
    });

    // Scroll to center the selected preview
    if (items[index]) {
        items[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // Switch to Style tab when selecting a screenshot
    var styleTab = document.querySelector('.settings-tab[data-tab="style"]');
    if (styleTab && !styleTab.classList.contains('active')) {
        styleTab.click();
    }

    App.updateSettingsUI();
};

App.updateSettingsUI = function() {
    var settings = App.getActiveSettings() || App.DEFAULT_SETTINGS;
    var screenshots = App.getActiveScreenshots();

    App.updateSectionApplyButtons();

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
    document.getElementById('deviceFrameColorRow').style.display = settings.addDeviceFrame ? 'flex' : 'none';
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

    // Spacing slider
    var spacingSlider = document.getElementById('spacingSlider');
    if (spacingSlider) {
        spacingSlider.value = App.spacingToSliderValue(settings.textSpacing != null ? settings.textSpacing : 33);
        var spacingValueEl = document.getElementById('spacingValue');
        if (spacingValueEl) spacingValueEl.textContent = spacingSlider.value;
    }

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


// Keys for each section
App.SECTION_KEYS = {
    layout: ['preset', 'textSpacing', 'textAlign'],
    title: ['titleFont', 'titleSize', 'titleColor', 'titleWeight'],
    body: ['bodyFont', 'bodySize', 'bodyColor', 'bodyWeight'],
    background: ['bgColor', 'bgGradient', 'bgGradientColor', 'bgGradientAngle'],
    device: ['addDeviceFrame', 'deviceFrameColor', 'addShadow']
};

// Check if a section's settings match across all screenshots
App.sectionSettingsMatch = function(section, screenshots) {
    if (screenshots.length < 2) return true;
    var keys = App.SECTION_KEYS[section];
    if (!keys) return true;

    var first = screenshots[0].settings;
    for (var i = 1; i < screenshots.length; i++) {
        var current = screenshots[i].settings;
        for (var j = 0; j < keys.length; j++) {
            if (first[keys[j]] !== current[keys[j]]) return false;
        }
    }
    return true;
};

// Show/hide per-section apply buttons based on whether settings differ
App.updateSectionApplyButtons = function() {
    var screenshots = App.getActiveScreenshots();
    document.querySelectorAll('.btn-apply-section').forEach(function(btn) {
        var section = btn.getAttribute('data-section');
        var show = screenshots.length >= 2 && !App.sectionSettingsMatch(section, screenshots);
        btn.style.opacity = show ? '1' : '0';
        btn.style.pointerEvents = show ? 'auto' : 'none';
    });
};

App.applySectionToAll = function(section) {
    var screenshots = App.getActiveScreenshots();
    var currentSettings = App.getActiveSettings();
    if (!currentSettings || screenshots.length < 2) return;

    var settingsToApply = {};

    if (section === 'device') {
        settingsToApply = {
            addDeviceFrame: currentSettings.addDeviceFrame,
            deviceFrameColor: currentSettings.deviceFrameColor,
            addShadow: currentSettings.addShadow
        };
    } else if (section === 'background') {
        settingsToApply = {
            bgColor: currentSettings.bgColor,
            bgGradient: currentSettings.bgGradient,
            bgGradientColor: currentSettings.bgGradientColor,
            bgGradientAngle: currentSettings.bgGradientAngle
        };
    } else if (section === 'layout') {
        settingsToApply = {
            preset: currentSettings.preset,
            textSpacing: currentSettings.textSpacing,
            textAlign: currentSettings.textAlign
        };
    } else if (section === 'title') {
        settingsToApply = {
            titleFont: currentSettings.titleFont,
            titleSize: currentSettings.titleSize,
            titleColor: currentSettings.titleColor,
            titleWeight: currentSettings.titleWeight
        };
    } else if (section === 'body') {
        settingsToApply = {
            bodyFont: currentSettings.bodyFont,
            bodySize: currentSettings.bodySize,
            bodyColor: currentSettings.bodyColor,
            bodyWeight: currentSettings.bodyWeight
        };
    }

    screenshots.forEach(function(screenshot) {
        Object.assign(screenshot.settings, settingsToApply);
    });

    App.renderAllCanvases();
    App.updateSettingsUI();
    App.Storage.scheduleSave();
    // Re-render after fonts finish loading (Google Fonts may load weight on demand)
    document.fonts.ready.then(function() {
        App.renderAllCanvases();
    });
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
