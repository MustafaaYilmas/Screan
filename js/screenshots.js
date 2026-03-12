// ============================================
// Screenshot Management
// ============================================

var App = window.App || {};

App.syncSlider = function(id, value) {
    var slider = document.getElementById(id + 'Slider');
    var valueEl = document.getElementById(id + 'Value');
    if (slider) slider.value = value;
    if (valueEl) valueEl.textContent = value;
};

App.handleScreenshots = function(files) {
    var platformData = App.getActivePlatformData();

    Array.from(files).forEach(function(file) {
        if (!file.type.startsWith('image/')) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var isFirst = platformData.screenshots.length === 0;

                // Create settings: inherit from last existing screenshot, or use defaults
                var existingScreenshots = platformData.screenshots;
                var baseSettings;
                if (existingScreenshots.length > 0) {
                    var lastSettings = existingScreenshots[existingScreenshots.length - 1].settings;
                    baseSettings = Object.assign({}, lastSettings);
                    // Reset text content - will be initialized below
                    delete baseSettings.content;
                    delete baseSettings.headline;
                    delete baseSettings.subheadline;
                } else {
                    baseSettings = Object.assign({}, App.DEFAULT_SETTINGS);
                }
                var settings = baseSettings;
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
                App.updatePlatformSelect();
                App.Storage.scheduleSave();
                App.Undo.scheduleCapture();

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
    App.updatePlatformSelect();
    App.Storage.scheduleSave();
    App.Undo.scheduleCapture();
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

    // Switch to Content tab when selecting a screenshot
    var contentTab = document.querySelector('.settings-tab[data-tab="content"]');
    if (contentTab && !contentTab.classList.contains('active')) {
        contentTab.click();
    }

    App.updateSettingsUI();
};

// Sync select dropdown to match a pixel value (or 'custom' if no match)
App.syncSizeSelect = function(selectId, px) {
    var select = document.getElementById(selectId);
    var matched = false;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value !== 'custom' && parseInt(select.options[i].value, 10) === px) {
            select.value = select.options[i].value;
            matched = true;
            break;
        }
    }
    if (!matched) {
        select.value = 'custom';
    }
};

// Sync both select and input for a given target (title or body)
App.syncSizeUI = function(target, sizeValue) {
    var px = App.migrateFontSize(sizeValue, target);
    document.getElementById(target + 'SizeInput').value = px;
    App.syncSizeSelect(target + 'SizeSelect', px);
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
    App.syncSizeUI('title', settings.titleSize);
    document.getElementById('titleColor').value = settings.titleColor || '#ffffff';
    document.getElementById('titleColorHex').value = (settings.titleColor || '#ffffff').toUpperCase();
    document.getElementById('titleWeight').value = settings.titleWeight || 'bold';
    document.getElementById('titleUppercase').classList.toggle('active', !!settings.titleUppercase);

    // Body settings
    document.getElementById('bodyFont').value = settings.bodyFont || 'sf-rounded';
    App.syncSizeUI('body', settings.bodySize);
    document.getElementById('bodyColor').value = settings.bodyColor || '#ffffff';
    document.getElementById('bodyColorHex').value = (settings.bodyColor || '#ffffff').toUpperCase();
    document.getElementById('bodyWeight').value = settings.bodyWeight || 'medium';
    document.getElementById('bodyUppercase').classList.toggle('active', !!settings.bodyUppercase);

    // Background settings
    document.getElementById('bgColor1').value = settings.bgColor;
    document.getElementById('bgColor1Hex').value = settings.bgColor.toUpperCase();
    document.getElementById('bgGradient').checked = settings.bgGradient || false;
    document.getElementById('gradientColorRow').style.display = settings.bgGradient ? 'flex' : 'none';
    document.getElementById('gradientAngleRow').style.display = settings.bgGradient ? 'flex' : 'none';
    document.getElementById('bgColorLabel').textContent = settings.bgGradient ? 'Start' : 'Color';
    document.getElementById('bgGradientColor').value = settings.bgGradientColor || '#ffffff';
    document.getElementById('bgGradientColorHex').value = (settings.bgGradientColor || '#ffffff').toUpperCase();
    App.syncSlider('bgGradientAngle', settings.bgGradientAngle != null ? settings.bgGradientAngle : 180);
    App.updateBgImageUI(settings);
    App.syncSlider('bgImageOpacity', settings.bgImageOpacity != null ? settings.bgImageOpacity : 100);

    // Pattern settings
    document.getElementById('bgPattern').value = settings.bgPattern || 'none';
    App.updateBgPatternUI(settings);
    document.getElementById('bgPatternColor').value = settings.bgPatternColor || '#000000';
    document.getElementById('bgPatternColorHex').value = (settings.bgPatternColor || '#000000').toUpperCase();
    App.syncSlider('bgPatternSize', settings.bgPatternSize != null ? settings.bgPatternSize : 30);
    App.syncSlider('bgPatternOpacity', settings.bgPatternOpacity != null ? settings.bgPatternOpacity : 20);

    // Text effects
    document.getElementById('textShadow').checked = settings.textShadow || false;
    document.getElementById('textShadowColorRow').style.display = settings.textShadow ? 'flex' : 'none';
    document.getElementById('textShadowBlurRow').style.display = settings.textShadow ? 'flex' : 'none';
    document.getElementById('textShadowOffsetYRow').style.display = settings.textShadow ? 'flex' : 'none';
    document.getElementById('textShadowColor').value = settings.textShadowColor || '#000000';
    document.getElementById('textShadowColorHex').value = (settings.textShadowColor || '#000000').toUpperCase();
    App.syncSlider('textShadowBlur', settings.textShadowBlur != null ? settings.textShadowBlur : 10);
    App.syncSlider('textShadowOffsetY', settings.textShadowOffsetY != null ? settings.textShadowOffsetY : 5);

    document.getElementById('textOutline').checked = settings.textOutline || false;
    document.getElementById('textOutlineColorRow').style.display = settings.textOutline ? 'flex' : 'none';
    document.getElementById('textOutlineWidthRow').style.display = settings.textOutline ? 'flex' : 'none';
    document.getElementById('textOutlineColor').value = settings.textOutlineColor || '#000000';
    document.getElementById('textOutlineColorHex').value = (settings.textOutlineColor || '#000000').toUpperCase();
    App.syncSlider('textOutlineWidth', settings.textOutlineWidth != null ? settings.textOutlineWidth : 3);

    document.getElementById('textHighlight').checked = settings.textHighlight || false;
    document.getElementById('textHighlightColorRow').style.display = settings.textHighlight ? 'flex' : 'none';
    document.getElementById('textHighlightOpacityRow').style.display = settings.textHighlight ? 'flex' : 'none';
    document.getElementById('textHighlightColor').value = settings.textHighlightColor || '#000000';
    document.getElementById('textHighlightColorHex').value = (settings.textHighlightColor || '#000000').toUpperCase();
    App.syncSlider('textHighlightOpacity', settings.textHighlightOpacity != null ? settings.textHighlightOpacity : 30);

    // Show reset button if any effect is active
    var hasEffects = settings.textShadow || settings.textOutline || settings.textHighlight;
    document.getElementById('resetEffectsBtn').classList.toggle('visible', !!hasEffects);

    // Device frame settings
    var frameStyle = settings.deviceFrameStyle || (settings.addDeviceFrame === false ? 'none' : 'border');
    document.getElementById('deviceFrameStyle').value = frameStyle;
    document.getElementById('deviceFrameColorRow').style.display = frameStyle !== 'none' ? 'flex' : 'none';
    document.getElementById('deviceFrameColor').value = settings.deviceFrameColor || '#000000';
    document.getElementById('deviceFrameColorHex').value = (settings.deviceFrameColor || '#000000').toUpperCase();

    // Other settings
    document.getElementById('addShadow').checked = settings.addShadow;
    document.getElementById('hideScreenshot').checked = !(settings.hideScreenshot || false);

    App.updateScreenshotOptionsVisibility(settings.hideScreenshot || false);

    document.querySelectorAll('.position-text-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.preset === settings.preset);
    });

    document.querySelectorAll('.align-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.align === (settings.textAlign || 'center'));
    });

    // Sliders
    App.syncSlider('textGap', settings.textGap != null ? settings.textGap : 35);
    App.syncSlider('screenshotOffsetX', settings.screenshotOffsetX || 0);
    App.syncSlider('screenshotOffsetY', settings.screenshotOffsetY != null ? settings.screenshotOffsetY : (settings.textSpacing != null ? App.spacingToSliderValue(settings.textSpacing) : 33));
    App.syncSlider('screenshotRotation', settings.screenshotRotation || 0);
    App.syncSlider('screenshotZoom', settings.screenshotZoom != null ? settings.screenshotZoom : 87);

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
    document.getElementById('textEffectsSection').style.display = hideText ? 'none' : 'block';
    document.getElementById('textGapRow').style.display = hideText ? 'none' : 'flex';
    document.getElementById('alignRow').style.display = hideText ? 'none' : 'flex';
};


App.updateScreenshotOptionsVisibility = function(hidden) {
    var display = hidden ? 'none' : 'flex';
    document.getElementById('positionRow').style.display = display;
    document.getElementById('deviceFrameStyleRow').style.display = display;
    var frameStyle = document.getElementById('deviceFrameStyle').value;
    document.getElementById('deviceFrameColorRow').style.display = hidden ? 'none' : (frameStyle !== 'none' ? 'flex' : 'none');
    document.getElementById('displayShadowRow').style.display = display;
    document.getElementById('screenshotOffsetXRow').style.display = display;
    document.getElementById('screenshotOffsetYRow').style.display = display;
    document.getElementById('screenshotRotationRow').style.display = display;
    document.getElementById('screenshotZoomRow').style.display = display;
};

// Update background image UI (upload button label, remove button, opacity row)
App.updateBgImageUI = function(settings) {
    var hasImage = !!(settings && settings.bgImage);
    var uploadBtn = document.getElementById('bgImageUploadBtn');
    var removeBtn = document.getElementById('bgImageRemoveBtn');
    var label = document.getElementById('bgImageLabel');
    var opacityRow = document.getElementById('bgImageOpacityRow');

    if (hasImage) {
        uploadBtn.classList.add('has-image');
        label.textContent = 'Change';
        removeBtn.style.display = 'flex';
        opacityRow.style.display = 'flex';
    } else {
        uploadBtn.classList.remove('has-image');
        label.textContent = 'Add';
        removeBtn.style.display = 'none';
        opacityRow.style.display = 'none';
    }
};

// Update pattern controls visibility
App.updateBgPatternUI = function(settings) {
    var hasPattern = settings && settings.bgPattern && settings.bgPattern !== 'none';
    document.getElementById('bgPatternColorRow').style.display = hasPattern ? 'flex' : 'none';
    document.getElementById('bgPatternSizeRow').style.display = hasPattern ? 'flex' : 'none';
    document.getElementById('bgPatternOpacityRow').style.display = hasPattern ? 'flex' : 'none';
};

// Keys for each section
App.SECTION_KEYS = {
    layout: ['textGap', 'textAlign'],
    title: ['titleFont', 'titleSize', 'titleColor', 'titleWeight', 'titleUppercase'],
    body: ['bodyFont', 'bodySize', 'bodyColor', 'bodyWeight', 'bodyUppercase'],
    effects: ['textShadow', 'textShadowColor', 'textShadowBlur', 'textShadowOffsetY', 'textOutline', 'textOutlineColor', 'textOutlineWidth', 'textHighlight', 'textHighlightColor', 'textHighlightOpacity'],
    background: ['bgColor', 'bgGradient', 'bgGradientColor', 'bgGradientAngle', 'bgImage', 'bgImageOpacity', 'bgPattern', 'bgPatternColor', 'bgPatternSize', 'bgPatternOpacity'],
    device: ['preset', 'hideScreenshot', 'deviceFrameStyle', 'deviceFrameColor', 'addShadow', 'screenshotOffsetX', 'screenshotOffsetY', 'screenshotRotation', 'screenshotZoom']
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
            preset: currentSettings.preset,
            hideScreenshot: currentSettings.hideScreenshot,
            deviceFrameStyle: currentSettings.deviceFrameStyle,
            deviceFrameColor: currentSettings.deviceFrameColor,
            addShadow: currentSettings.addShadow,
            screenshotOffsetX: currentSettings.screenshotOffsetX,
            screenshotOffsetY: currentSettings.screenshotOffsetY,
            screenshotRotation: currentSettings.screenshotRotation,
            screenshotZoom: currentSettings.screenshotZoom
        };
    } else if (section === 'background') {
        settingsToApply = {
            bgColor: currentSettings.bgColor,
            bgGradient: currentSettings.bgGradient,
            bgGradientColor: currentSettings.bgGradientColor,
            bgGradientAngle: currentSettings.bgGradientAngle,
            bgImage: currentSettings.bgImage,
            bgImageObj: currentSettings.bgImageObj,
            bgImageOpacity: currentSettings.bgImageOpacity,
            bgPattern: currentSettings.bgPattern,
            bgPatternColor: currentSettings.bgPatternColor,
            bgPatternSize: currentSettings.bgPatternSize,
            bgPatternOpacity: currentSettings.bgPatternOpacity
        };
    } else if (section === 'layout') {
        settingsToApply = {
            textGap: currentSettings.textGap,
            textAlign: currentSettings.textAlign
        };
    } else if (section === 'title') {
        settingsToApply = {
            titleFont: currentSettings.titleFont,
            titleSize: currentSettings.titleSize,
            titleColor: currentSettings.titleColor,
            titleWeight: currentSettings.titleWeight,
            titleUppercase: currentSettings.titleUppercase
        };
    } else if (section === 'effects') {
        settingsToApply = {
            textShadow: currentSettings.textShadow,
            textShadowColor: currentSettings.textShadowColor,
            textShadowBlur: currentSettings.textShadowBlur,
            textShadowOffsetY: currentSettings.textShadowOffsetY,
            textOutline: currentSettings.textOutline,
            textOutlineColor: currentSettings.textOutlineColor,
            textOutlineWidth: currentSettings.textOutlineWidth,
            textHighlight: currentSettings.textHighlight,
            textHighlightColor: currentSettings.textHighlightColor,
            textHighlightOpacity: currentSettings.textHighlightOpacity
        };
    } else if (section === 'body') {
        settingsToApply = {
            bodyFont: currentSettings.bodyFont,
            bodySize: currentSettings.bodySize,
            bodyColor: currentSettings.bodyColor,
            bodyWeight: currentSettings.bodyWeight,
            bodyUppercase: currentSettings.bodyUppercase
        };
    }

    screenshots.forEach(function(screenshot) {
        Object.assign(screenshot.settings, settingsToApply);
    });

    App.renderAllCanvases();
    App.updateSettingsUI();
    App.Storage.scheduleSave();
    App.Undo.scheduleCapture();
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
    App.Undo.scheduleCapture();
};
