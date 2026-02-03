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
                progressText.textContent = 'Exporting ' + format.name + ' - ' + (j + 1) + '/' + platform.screenshots.length;

                App.renderCanvasForExport(tempCanvas, tempCtx, platform.screenshots[j], format, formatKey);

                await new Promise(function(r) { setTimeout(r, 50); });

                var blob = await new Promise(function(resolve) { tempCanvas.toBlob(resolve, 'image/png'); });
                files.push({ blob: blob, filename: formatKey + '_' + (j + 1) + '.png' });
            }
        }
    }

    progressText.textContent = 'Creating ZIP...';

    var zip = new JSZip();
    files.forEach(function(item) {
        var folder = item.filename.split('_')[0];
        zip.file(folder + '/' + item.filename, item.blob);
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

App.renderCanvasForExport = function(canvas, ctx, screenshot, format, formatKey) {
    var settings = screenshot.settings;
    var preset = App.PRESETS[settings.preset];
    var w = format.width;
    var h = format.height;

    ctx.clearRect(0, 0, w, h);

    // Draw background (solid or gradient)
    if (settings.bgGradient) {
        var gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, settings.bgColor);
        gradient.addColorStop(1, settings.bgGradientColor || '#ffffff');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = settings.bgColor;
    }
    ctx.fillRect(0, 0, w, h);

    var screenshotInfo = App.drawScreenshot(ctx, screenshot, w, h, preset, settings, format);

    if (!preset.noText && (settings.headline || settings.subheadline)) {
        App.drawText(ctx, w, h, preset, settings, format, formatKey, screenshotInfo);
    }
};
