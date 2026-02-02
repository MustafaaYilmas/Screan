// ============================================
// Rendering Functions
// ============================================

var App = window.App || {};

App.renderAllPreviews = function() {
    var container = document.getElementById('previewsContainer');
    var wrapper = document.querySelector('.previews-wrapper');
    var emptyState = document.getElementById('emptyState');

    // Save scroll position
    var scrollLeft = wrapper.scrollLeft;

    container.querySelectorAll('.preview-item').forEach(function(el) { el.remove(); });

    var screenshots = App.getActiveScreenshots();
    var activeIndex = App.getActiveIndex();

    if (screenshots.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    var format = App.FORMATS[App.currentFormat];
    var wrapperHeight = wrapper.clientHeight;
    var wrapperWidth = wrapper.clientWidth;
    var maxCanvasHeight = wrapperHeight - 80;
    var maxCanvasWidth = wrapperWidth - 100;

    // Calculate zoom based on both dimensions
    var zoomByHeight = maxCanvasHeight / format.height;
    var zoomByWidth = maxCanvasWidth / format.width;
    var zoom = Math.min(zoomByHeight, zoomByWidth, 0.8);

    screenshots.forEach(function(screenshot, index) {
        var item = document.createElement('div');
        item.className = 'preview-item' + (index === activeIndex ? ' active' : '');

        var canvas = document.createElement('canvas');
        canvas.width = format.width;
        canvas.height = format.height;
        canvas.style.width = (format.width * zoom) + 'px';
        canvas.style.height = (format.height * zoom) + 'px';

        // Delete button
        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'preview-delete-btn';
        deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
        deleteBtn.title = 'Delete';

        (function(idx) {
            item.addEventListener('click', function(e) {
                if (!e.target.closest('.preview-delete-btn')) {
                    App.selectScreenshot(idx);
                }
            });
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                App.removeScreenshot(idx);
            });
        })(index);

        item.appendChild(canvas);
        item.appendChild(deleteBtn);
        container.appendChild(item);

        App.renderCanvas(canvas, screenshot);
    });

    // Restore scroll position
    wrapper.scrollLeft = scrollLeft;
};

App.renderCanvas = function(canvas, screenshot) {
    var ctx = canvas.getContext('2d');
    var format = App.FORMATS[App.currentFormat];
    var settings = screenshot.settings;
    var preset = App.PRESETS[settings.preset];
    var w = format.width;
    var h = format.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = settings.bgColor;
    ctx.fillRect(0, 0, w, h);

    App.drawScreenshot(ctx, screenshot, w, h, preset, settings, format);

    if (!preset.noText && (settings.headline || settings.subheadline)) {
        App.drawText(ctx, w, h, preset, settings, format, App.currentFormat);
    }
};

App.drawScreenshot = function(ctx, screenshot, canvasW, canvasH, preset, settings, format) {
    // Fixed horizontal margin (4% on each side = 92% width)
    var horizontalMargin = format.horizontalMargin || 0.87;
    var imgW = canvasW * horizontalMargin;

    // Calculate height based on screenshot ratio
    var imgRatio = screenshot.width / screenshot.height;
    var imgH = imgW / imgRatio;

    var imgX = (canvasW - imgW) / 2;
    var imgY;
    if (preset.centered) {
        imgY = (canvasH - imgH) / 2;
    } else {
        imgY = canvasH * preset.screenshotY;
    }

    var radius = imgW * (format.cornerRadius || 0.1);

    ctx.save();

    if (settings.addShadow) {
        ctx.save();
        var shadowIntensity = settings.addDeviceFrame ? 0.5 : 0.4;
        var shadowBlur = settings.addDeviceFrame ? 80 : 60;
        var shadowOffset = settings.addDeviceFrame ? 35 : 25;
        ctx.shadowColor = 'rgba(0, 0, 0, ' + shadowIntensity + ')';
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = shadowOffset;

        ctx.beginPath();
        if (preset.cropTop) {
            ctx.moveTo(imgX, 0);
            ctx.lineTo(imgX + imgW, 0);
            ctx.lineTo(imgX + imgW, imgY + imgH - radius);
            ctx.quadraticCurveTo(imgX + imgW, imgY + imgH, imgX + imgW - radius, imgY + imgH);
            ctx.lineTo(imgX + radius, imgY + imgH);
            ctx.quadraticCurveTo(imgX, imgY + imgH, imgX, imgY + imgH - radius);
            ctx.lineTo(imgX, 0);
        } else if (preset.cropBottom) {
            ctx.moveTo(imgX + radius, imgY);
            ctx.lineTo(imgX + imgW - radius, imgY);
            ctx.quadraticCurveTo(imgX + imgW, imgY, imgX + imgW, imgY + radius);
            ctx.lineTo(imgX + imgW, canvasH);
            ctx.lineTo(imgX, canvasH);
            ctx.lineTo(imgX, imgY + radius);
            ctx.quadraticCurveTo(imgX, imgY, imgX + radius, imgY);
        } else {
            ctx.roundRect(imgX, imgY, imgW, imgH, radius);
        }
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
    }

    ctx.beginPath();
    ctx.rect(0, 0, canvasW, canvasH);
    ctx.clip();

    ctx.beginPath();
    if (preset.cropTop) {
        var bottomRadius = Math.min(radius, imgH);
        ctx.moveTo(imgX, imgY);
        ctx.lineTo(imgX + imgW, imgY);
        ctx.lineTo(imgX + imgW, imgY + imgH - bottomRadius);
        ctx.quadraticCurveTo(imgX + imgW, imgY + imgH, imgX + imgW - bottomRadius, imgY + imgH);
        ctx.lineTo(imgX + bottomRadius, imgY + imgH);
        ctx.quadraticCurveTo(imgX, imgY + imgH, imgX, imgY + imgH - bottomRadius);
        ctx.lineTo(imgX, imgY);
    } else if (preset.cropBottom) {
        var topRadius = Math.min(radius, imgH);
        ctx.moveTo(imgX + topRadius, imgY);
        ctx.lineTo(imgX + imgW - topRadius, imgY);
        ctx.quadraticCurveTo(imgX + imgW, imgY, imgX + imgW, imgY + topRadius);
        ctx.lineTo(imgX + imgW, canvasH + 10);
        ctx.lineTo(imgX, canvasH + 10);
        ctx.lineTo(imgX, imgY + topRadius);
        ctx.quadraticCurveTo(imgX, imgY, imgX + topRadius, imgY);
    } else {
        ctx.roundRect(imgX, imgY, imgW, imgH, radius);
    }
    ctx.clip();
    ctx.drawImage(screenshot.image, imgX, imgY, imgW, imgH);

    ctx.restore();

    // Device frame (completely outside the image)
    if (settings.addDeviceFrame) {
        var frameWidth = Math.max(8, imgW * 0.02);
        var frameOffset = frameWidth / 2;
        var frameRadius = radius + frameOffset;

        ctx.save();
        ctx.strokeStyle = settings.deviceFrameColor;
        ctx.lineWidth = frameWidth;

        ctx.beginPath();
        if (preset.cropTop) {
            // Frame pour bottom preset (crop top)
            var bottomRadius = Math.min(radius, imgH);
            ctx.moveTo(imgX - frameOffset, imgY);
            ctx.lineTo(imgX - frameOffset, imgY + imgH - bottomRadius);
            ctx.quadraticCurveTo(imgX - frameOffset, imgY + imgH + frameOffset, imgX + bottomRadius, imgY + imgH + frameOffset);
            ctx.lineTo(imgX + imgW - bottomRadius, imgY + imgH + frameOffset);
            ctx.quadraticCurveTo(imgX + imgW + frameOffset, imgY + imgH + frameOffset, imgX + imgW + frameOffset, imgY + imgH - bottomRadius);
            ctx.lineTo(imgX + imgW + frameOffset, imgY);
        } else if (preset.cropBottom) {
            // Frame pour top preset (crop bottom)
            var topRadius = Math.min(radius, imgH);
            ctx.moveTo(imgX - frameOffset, canvasH);
            ctx.lineTo(imgX - frameOffset, imgY + topRadius);
            ctx.quadraticCurveTo(imgX - frameOffset, imgY - frameOffset, imgX + topRadius, imgY - frameOffset);
            ctx.lineTo(imgX + imgW - topRadius, imgY - frameOffset);
            ctx.quadraticCurveTo(imgX + imgW + frameOffset, imgY - frameOffset, imgX + imgW + frameOffset, imgY + topRadius);
            ctx.lineTo(imgX + imgW + frameOffset, canvasH);
        } else {
            // Frame complet pour center
            ctx.roundRect(imgX - frameOffset, imgY - frameOffset, imgW + frameWidth, imgH + frameWidth, frameRadius);
        }
        ctx.stroke();
        ctx.restore();
    }
};

App.getFontSizeKey = function(formatKey) {
    if (formatKey.startsWith('iphone')) {
        return 'iphone';
    } else if (formatKey === 'ipad-11') {
        return 'ipad-11';
    } else if (formatKey.startsWith('ipad')) {
        return 'ipad';
    } else if (formatKey.startsWith('android-phone')) {
        return 'android-phone';
    } else if (formatKey === 'android-tablet-7') {
        return 'android-tablet-7';
    } else if (formatKey.startsWith('android-tablet')) {
        return 'android-tablet';
    } else if (formatKey === 'mac-2880') {
        return 'mac-2880';
    } else {
        return 'mac';
    }
};

App.drawText = function(ctx, canvasW, canvasH, preset, settings, format, formatKey) {
    // Determine font size category based on format
    var fontSizeKey = App.getFontSizeKey(formatKey || App.currentFormat);

    var titleSize = settings.titleSize || 'medium';
    var bodySize = settings.bodySize || 'medium';

    var headlineFontSize = App.FONT_SIZES[fontSizeKey][titleSize][0];
    var subheadlineFontSize = App.FONT_SIZES[fontSizeKey][bodySize][1];

    var lineSpacing = headlineFontSize * 0.35;

    // Get font families
    var titleFontKey = settings.titleFont || 'sf-pro';
    var bodyFontKey = settings.bodyFont || 'sf-pro';
    var titleFontConfig = App.FONTS[titleFontKey] || App.FONTS['sf-pro'];
    var bodyFontConfig = App.FONTS[bodyFontKey] || App.FONTS['sf-pro'];
    var titleFontFamily = titleFontConfig.family;
    var bodyFontFamily = bodyFontConfig.family;

    // Calculate total text block height
    var totalTextHeight = 0;
    if (settings.headline) {
        totalTextHeight += headlineFontSize;
    }
    if (settings.headline && settings.subheadline) {
        totalTextHeight += lineSpacing;
    }
    if (settings.subheadline) {
        totalTextHeight += subheadlineFontSize;
    }

    // Determine available text zone and center vertically
    var textZoneStart, textZoneEnd;
    if (preset.cropBottom) {
        // Preset "top": text at top
        var topZone = format.textZoneTop || [0.03, 0.22];
        textZoneStart = canvasH * topZone[0];
        textZoneEnd = canvasH * topZone[1];
    } else if (preset.cropTop) {
        // Preset "bottom": text at bottom
        var bottomZone = format.textZoneBottom || [0.78, 0.97];
        textZoneStart = canvasH * bottomZone[0];
        textZoneEnd = canvasH * bottomZone[1];
    } else {
        // Fallback
        textZoneStart = canvasH * preset.textY;
        textZoneEnd = textZoneStart + totalTextHeight + 50;
    }

    var textZoneHeight = textZoneEnd - textZoneStart;
    var startY = textZoneStart + (textZoneHeight - totalTextHeight) / 2;

    ctx.fillStyle = settings.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (settings.headline) {
        ctx.font = '700 ' + headlineFontSize + 'px ' + titleFontFamily;
        ctx.fillText(settings.headline, canvasW / 2, startY);
        startY += headlineFontSize + lineSpacing;
    }

    if (settings.subheadline) {
        ctx.globalAlpha = 0.9;
        ctx.font = '500 ' + subheadlineFontSize + 'px ' + bodyFontFamily;
        ctx.fillText(settings.subheadline, canvasW / 2, startY);
        ctx.globalAlpha = 1;
    }
};
