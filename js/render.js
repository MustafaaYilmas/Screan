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
                    // Show panels if hidden
                    if (document.body.classList.contains('panels-hidden')) {
                        document.getElementById('togglePanels').click();
                    }
                }
            });
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                App.removeScreenshot(idx);
            });

            // Setup drag & drop reordering
            App.setupReorderItem(item, idx, container);
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

    // Draw background (solid or gradient)
    if (settings.bgGradient) {
        // Gradient from top (bgColor) to bottom (bgGradientColor)
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
        App.drawText(ctx, w, h, preset, settings, format, App.currentFormat, screenshotInfo);
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
    var radius = imgW * (format.cornerRadius || 0.1);
    if (preset.centered) {
        imgY = (canvasH - imgH) / 2;
    } else {
        var spacing = settings.textSpacing || 'medium';
        var screenshotY = typeof preset.screenshotY === 'object' ? preset.screenshotY[spacing] : preset.screenshotY;
        imgY = canvasH * screenshotY;
    }

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
        var clipTopY = Math.max(0, imgY);
        ctx.moveTo(imgX, clipTopY);
        ctx.lineTo(imgX + imgW, clipTopY);
        ctx.lineTo(imgX + imgW, imgY + imgH - bottomRadius);
        ctx.quadraticCurveTo(imgX + imgW, imgY + imgH, imgX + imgW - bottomRadius, imgY + imgH);
        ctx.lineTo(imgX + bottomRadius, imgY + imgH);
        ctx.quadraticCurveTo(imgX, imgY + imgH, imgX, imgY + imgH - bottomRadius);
        ctx.lineTo(imgX, clipTopY);
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
            var frameTopY = Math.max(0, imgY);
            var bottomRadius = Math.min(radius, imgH);
            ctx.moveTo(imgX - frameOffset, frameTopY);
            ctx.lineTo(imgX - frameOffset, imgY + imgH - bottomRadius);
            ctx.quadraticCurveTo(imgX - frameOffset, imgY + imgH + frameOffset, imgX + bottomRadius, imgY + imgH + frameOffset);
            ctx.lineTo(imgX + imgW - bottomRadius, imgY + imgH + frameOffset);
            ctx.quadraticCurveTo(imgX + imgW + frameOffset, imgY + imgH + frameOffset, imgX + imgW + frameOffset, imgY + imgH - bottomRadius);
            ctx.lineTo(imgX + imgW + frameOffset, frameTopY);
        } else if (preset.cropBottom) {
            // Frame pour top preset (crop bottom)
            var frameBottomY = Math.min(canvasH, imgY + imgH);
            var topRadius = Math.min(radius, imgH);
            ctx.moveTo(imgX - frameOffset, frameBottomY);
            ctx.lineTo(imgX - frameOffset, imgY + topRadius);
            ctx.quadraticCurveTo(imgX - frameOffset, imgY - frameOffset, imgX + topRadius, imgY - frameOffset);
            ctx.lineTo(imgX + imgW - topRadius, imgY - frameOffset);
            ctx.quadraticCurveTo(imgX + imgW + frameOffset, imgY - frameOffset, imgX + imgW + frameOffset, imgY + topRadius);
            ctx.lineTo(imgX + imgW + frameOffset, frameBottomY);
        } else {
            // Frame complet pour center
            ctx.roundRect(imgX - frameOffset, imgY - frameOffset, imgW + frameWidth, imgH + frameWidth, frameRadius);
        }
        ctx.stroke();
        ctx.restore();
    }

    return { imgY: imgY, imgH: imgH };
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

// Word wrap helper function
App.wrapText = function(ctx, text, maxWidth) {
    var lines = [];
    var paragraphs = text.split('\n');

    for (var p = 0; p < paragraphs.length; p++) {
        var paragraph = paragraphs[p];
        if (paragraph === '') {
            lines.push('');
            continue;
        }

        var words = paragraph.split(' ');
        var currentLine = '';

        for (var i = 0; i < words.length; i++) {
            var testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
            var metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
    }

    return lines;
};

App.drawText = function(ctx, canvasW, canvasH, preset, settings, format, formatKey, screenshotInfo) {
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

    // Calculate max width for text wrapping
    var horizontalPadding = canvasW * 0.065;
    var maxTextWidth = canvasW - (horizontalPadding * 2);

    // Get font weights
    var titleWeightKey = settings.titleWeight || 'bold';
    var bodyWeightKey = settings.bodyWeight || 'medium';
    var titleWeightValue = App.FONT_WEIGHTS[titleWeightKey] ? App.FONT_WEIGHTS[titleWeightKey].value : 700;
    var bodyWeightValue = App.FONT_WEIGHTS[bodyWeightKey] ? App.FONT_WEIGHTS[bodyWeightKey].value : 500;

    // Wrap subheadline text
    ctx.font = bodyWeightValue + ' ' + subheadlineFontSize + 'px ' + bodyFontFamily;
    var subheadlineLines = settings.subheadline ? App.wrapText(ctx, settings.subheadline, maxTextWidth) : [];
    var bodyLineSpacing = subheadlineFontSize * 0.3;

    // Calculate total text block height
    var totalTextHeight = 0;
    if (settings.headline) {
        totalTextHeight += headlineFontSize;
    }
    if (settings.headline && subheadlineLines.length > 0) {
        totalTextHeight += lineSpacing;
    }
    if (subheadlineLines.length > 0) {
        totalTextHeight += subheadlineFontSize * subheadlineLines.length;
        totalTextHeight += bodyLineSpacing * (subheadlineLines.length - 1);
    }

    // Determine text start position (centered in available space)
    var startY;
    var textZoneHeight;
    if (preset.cropBottom) {
        // Preset "top": text zone is from 0 to screenshot top
        textZoneHeight = screenshotInfo.imgY;
        startY = (textZoneHeight - totalTextHeight) / 2;
    } else if (preset.cropTop) {
        // Preset "bottom": text zone is from screenshot bottom to canvas bottom
        var screenshotEndY = screenshotInfo.imgY + screenshotInfo.imgH;
        textZoneHeight = canvasH - screenshotEndY;
        startY = screenshotEndY + (textZoneHeight - totalTextHeight) / 2;
    } else {
        // Fallback (center preset)
        startY = canvasH * preset.textY;
    }

    // Text alignment
    var textAlign = settings.textAlign || 'center';
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'top';

    // Calculate X position based on alignment
    var textX;
    if (textAlign === 'left') {
        textX = horizontalPadding;
    } else if (textAlign === 'right') {
        textX = canvasW - horizontalPadding;
    } else {
        textX = canvasW / 2;
    }

    if (settings.headline) {
        ctx.fillStyle = settings.titleColor || '#ffffff';
        ctx.font = titleWeightValue + ' ' + headlineFontSize + 'px ' + titleFontFamily;
        ctx.fillText(settings.headline, textX, startY);
        startY += headlineFontSize + lineSpacing;
    }

    if (subheadlineLines.length > 0) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = settings.bodyColor || '#ffffff';
        ctx.font = bodyWeightValue + ' ' + subheadlineFontSize + 'px ' + bodyFontFamily;
        for (var i = 0; i < subheadlineLines.length; i++) {
            ctx.fillText(subheadlineLines[i], textX, startY);
            startY += subheadlineFontSize + bodyLineSpacing;
        }
        ctx.globalAlpha = 1;
    }
};
