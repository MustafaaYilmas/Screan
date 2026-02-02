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

    for (var i = 0; i < App.state.exportFormats.length; i++) {
        var formatKey = App.state.exportFormats[i];
        var format = App.FORMATS[formatKey];
        tempCanvas.width = format.width;
        tempCanvas.height = format.height;

        for (var j = 0; j < App.state.screenshots.length; j++) {
            progressText.textContent = 'Exporting ' + format.name + ' - ' + (j + 1) + '/' + App.state.screenshots.length;

            var origFormat = App.currentFormat;
            App.setCurrentFormat(formatKey);

            App.renderCanvasForExport(tempCanvas, tempCtx, App.state.screenshots[j], format);

            App.setCurrentFormat(origFormat);

            await new Promise(function(r) { setTimeout(r, 50); });

            var blob = await new Promise(function(resolve) { tempCanvas.toBlob(resolve, 'image/png'); });
            files.push({ blob: blob, filename: formatKey + '_' + (j + 1) + '.png' });
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

App.renderCanvasForExport = function(canvas, ctx, screenshot, format) {
    var settings = screenshot.settings;
    var preset = App.PRESETS[settings.preset];
    var w = format.width;
    var h = format.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = settings.bgColor;
    ctx.fillRect(0, 0, w, h);

    App.drawScreenshot(ctx, screenshot, w, h, preset, settings, format);

    if (!preset.noText && (settings.headline || settings.subheadline)) {
        App.drawText(ctx, w, h, preset, settings, format);
    }
};
