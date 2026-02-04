// ============================================
// Export
// ============================================

var App = window.App || {};

App.exportAll = async function() {
    var modal = document.getElementById('progressModal');
    var progressText = document.getElementById('progressText');

    modal.classList.add('show');

    var files = [];
    var tempCanvas = document.createElement('canvas');
    var tempCtx = tempCanvas.getContext('2d');

    // Get languages to export
    var languages = App.state.languages || ['en'];
    var hasMultipleLanguages = languages.length > 1;

    // Loop through all languages
    for (var l = 0; l < languages.length; l++) {
        var langCode = languages[l];
        var langName = App.LANGUAGES[langCode] ? App.LANGUAGES[langCode].name : langCode;

        // Loop through all platforms
        var platformKeys = Object.keys(App.state.platforms);

        for (var p = 0; p < platformKeys.length; p++) {
            var platformKey = platformKeys[p];
            var platform = App.state.platforms[platformKey];

            // Skip platforms with no screenshots or no export formats
            if (platform.screenshots.length === 0 || platform.exportFormats.length === 0) {
                continue;
            }

            // Export each format for this platform
            for (var i = 0; i < platform.exportFormats.length; i++) {
                var formatKey = platform.exportFormats[i];
                var format = App.FORMATS[formatKey];
                tempCanvas.width = format.width;
                tempCanvas.height = format.height;

                for (var j = 0; j < platform.screenshots.length; j++) {
                    var langProgress = hasMultipleLanguages ? ' (' + langName + ')' : '';
                    progressText.textContent = 'Exporting ' + format.name + ' - ' + (j + 1) + '/' + platform.screenshots.length + langProgress;

                    // Render with language-specific content
                    App.renderCanvasForExport(tempCanvas, tempCtx, platform.screenshots[j], format, formatKey, langCode);

                    await new Promise(function(r) { setTimeout(r, 50); });

                    var blob = await new Promise(function(resolve) { tempCanvas.toBlob(resolve, 'image/png'); });

                    // Build file path based on number of languages
                    var filename = formatKey + '_' + (j + 1) + '.png';
                    var folderPath = hasMultipleLanguages ? langCode + '/' + formatKey : formatKey;

                    files.push({ blob: blob, filename: filename, folder: folderPath });
                }
            }
        }
    }

    progressText.textContent = 'Creating ZIP...';

    var zip = new JSZip();
    files.forEach(function(item) {
        zip.file(item.folder + '/' + item.filename, item.blob);
    });

    var zipBlob = await zip.generateAsync({ type: 'blob' });

    var url = URL.createObjectURL(zipBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'screenshots.zip';
    a.click();
    URL.revokeObjectURL(url);

    modal.classList.remove('show');
};

App.renderCanvasForExport = function(canvas, ctx, screenshot, format, formatKey, langCode) {
    var settings = screenshot.settings;
    var preset = App.PRESETS[settings.preset];
    var w = format.width;
    var h = format.height;

    // Get content for the specified language
    var localizedContent = App.getLocalizedContent(settings, langCode);

    // Create a temporary settings object with the language-specific content
    var exportSettings = Object.assign({}, settings, localizedContent);

    ctx.clearRect(0, 0, w, h);

    // Draw background (solid or gradient)
    if (exportSettings.bgGradient) {
        var gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, exportSettings.bgColor);
        gradient.addColorStop(1, exportSettings.bgGradientColor || '#ffffff');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = exportSettings.bgColor;
    }
    ctx.fillRect(0, 0, w, h);

    var screenshotInfo = App.drawScreenshot(ctx, screenshot, w, h, preset, exportSettings, format);

    if (!preset.noText && (exportSettings.headline || exportSettings.subheadline)) {
        App.drawText(ctx, w, h, preset, exportSettings, format, formatKey, screenshotInfo);
    }
};
