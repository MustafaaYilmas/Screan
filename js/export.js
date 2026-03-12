// ============================================
// Export
// ============================================

var App = window.App || {};

// --- RGB PNG encoder (no alpha channel, guaranteed App Store compatible) ---

App._crc32Table = null;

App._crc32 = function(buf) {
    if (!App._crc32Table) {
        var t = new Uint32Array(256);
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c;
        }
        App._crc32Table = t;
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) crc = App._crc32Table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
};

App._pngChunk = function(type, data) {
    var chunk = new Uint8Array(12 + data.length);
    new DataView(chunk.buffer).setUint32(0, data.length);
    for (var i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
    if (data.length) chunk.set(data, 8);
    new DataView(chunk.buffer).setUint32(8 + data.length, App._crc32(chunk.subarray(4, 8 + data.length)));
    return chunk;
};

App.canvasToRgbPngBlob = async function(canvas, ctx) {
    if (typeof CompressionStream === 'undefined') {
        return new Promise(function(resolve) { canvas.toBlob(resolve, 'image/png'); });
    }

    var w = canvas.width, h = canvas.height;
    var rgba = ctx.getImageData(0, 0, w, h).data;

    var raw = new Uint8Array(h * (1 + w * 3));
    var off = 0;
    for (var y = 0; y < h; y++) {
        raw[off++] = 1; // Sub filter for better compression
        var row = y * w * 4;
        raw[off++] = rgba[row];
        raw[off++] = rgba[row + 1];
        raw[off++] = rgba[row + 2];
        for (var x = 1; x < w; x++) {
            var i = row + x * 4, p = i - 4;
            raw[off++] = (rgba[i] - rgba[p]) & 0xFF;
            raw[off++] = (rgba[i + 1] - rgba[p + 1]) & 0xFF;
            raw[off++] = (rgba[i + 2] - rgba[p + 2]) & 0xFF;
        }
    }

    var cs = new CompressionStream('deflate');
    var writer = cs.writable.getWriter();
    writer.write(raw);
    writer.close();
    var chunks = [], reader = cs.readable.getReader();
    for (;;) {
        var r = await reader.read();
        if (r.done) break;
        chunks.push(r.value);
    }
    var len = 0;
    for (var i = 0; i < chunks.length; i++) len += chunks[i].length;
    var compressed = new Uint8Array(len);
    var pos = 0;
    for (var i = 0; i < chunks.length; i++) { compressed.set(chunks[i], pos); pos += chunks[i].length; }

    var ihdr = new Uint8Array(13);
    new DataView(ihdr.buffer).setUint32(0, w);
    new DataView(ihdr.buffer).setUint32(4, h);
    ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB, no alpha

    var sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    var ihdrC = App._pngChunk('IHDR', ihdr);
    var idatC = App._pngChunk('IDAT', compressed);
    var iendC = App._pngChunk('IEND', new Uint8Array(0));
    var png = new Uint8Array(sig.length + ihdrC.length + idatC.length + iendC.length);
    var o = 0;
    png.set(sig, o); o += sig.length;
    png.set(ihdrC, o); o += ihdrC.length;
    png.set(idatC, o); o += idatC.length;
    png.set(iendC, o);

    return new Blob([png], { type: 'image/png' });
};

// --- End RGB PNG encoder ---

App.exportAll = async function() {
    var modal = document.getElementById('progressModal');
    var progressText = document.getElementById('progressText');

    modal.classList.add('show');

    var files = [];
    var tempCanvas = document.createElement('canvas');
    var tempCtx = tempCanvas.getContext('2d', { alpha: false });

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

            // Skip platforms with no screenshots
            if (platform.screenshots.length === 0) {
                continue;
            }

            var format = App.FORMATS[platformKey];
            tempCanvas.width = format.width;
            tempCanvas.height = format.height;

            for (var j = 0; j < platform.screenshots.length; j++) {
                var langProgress = hasMultipleLanguages ? ' (' + langName + ')' : '';
                progressText.textContent = 'Exporting ' + format.name + ' - ' + (j + 1) + '/' + platform.screenshots.length + langProgress;

                // Render with language-specific content
                App.renderCanvasForExport(tempCanvas, tempCtx, platform.screenshots[j], format, platformKey, langCode);

                await new Promise(function(r) { setTimeout(r, 50); });

                var blob = await App.canvasToRgbPngBlob(tempCanvas, tempCtx);

                // Build file path based on number of languages
                var filename = platformKey + '_' + (j + 1) + '.png';
                var folderPath = hasMultipleLanguages ? langCode + '/' + platformKey : platformKey;

                files.push({ blob: blob, filename: filename, folder: folderPath });
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
        var angle = (exportSettings.bgGradientAngle != null ? exportSettings.bgGradientAngle : 180) * Math.PI / 180;
        var cx = w / 2, cy = h / 2;
        var len = Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle));
        var dx = Math.sin(angle) * len / 2;
        var dy = -Math.cos(angle) * len / 2;
        var gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        gradient.addColorStop(0, exportSettings.bgColor);
        gradient.addColorStop(1, exportSettings.bgGradientColor || '#ffffff');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = exportSettings.bgColor;
    }
    ctx.fillRect(0, 0, w, h);

    // Draw background image if present (superposed over color/gradient)
    if (exportSettings.bgImage && exportSettings.bgImageObj instanceof Image && exportSettings.bgImageObj.complete) {
        ctx.save();
        ctx.globalAlpha = (exportSettings.bgImageOpacity != null ? exportSettings.bgImageOpacity : 100) / 100;
        var bgImgRatio = exportSettings.bgImageObj.width / exportSettings.bgImageObj.height;
        var canvasRatio = w / h;
        var drawW, drawH, drawX, drawY;
        if (bgImgRatio > canvasRatio) {
            drawH = h;
            drawW = h * bgImgRatio;
            drawX = (w - drawW) / 2;
            drawY = 0;
        } else {
            drawW = w;
            drawH = w / bgImgRatio;
            drawX = 0;
            drawY = (h - drawH) / 2;
        }
        ctx.drawImage(exportSettings.bgImageObj, drawX, drawY, drawW, drawH);
        ctx.restore();
    }

    // Draw pattern overlay if enabled
    if (exportSettings.bgPattern && exportSettings.bgPattern !== 'none') {
        App.drawBgPattern(ctx, w, h, exportSettings);
    }

    // Pre-calculate text layout for dynamic screenshot positioning
    var textLayout = null;
    if (!preset.noText && (exportSettings.headline || exportSettings.subheadline)) {
        textLayout = App.calculateTextLayout(ctx, w, h, exportSettings, format, formatKey);
    }

    var screenshotInfo = App.drawScreenshot(ctx, screenshot, w, h, preset, exportSettings, format, textLayout, formatKey);

    if (textLayout) {
        App.drawText(ctx, w, h, preset, exportSettings, format, formatKey, screenshotInfo, textLayout);
    }
};
