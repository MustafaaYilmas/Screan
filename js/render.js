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

    if (emptyState) {
        emptyState.style.display = 'none';
        emptyState.classList.remove('loading');
    }

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

// Render only the active screenshot's canvas without rebuilding DOM
App.renderActivePreview = function() {
    var container = document.getElementById('previewsContainer');
    var screenshots = App.getActiveScreenshots();
    var activeIndex = App.getActiveIndex();

    if (screenshots.length === 0 || activeIndex < 0) return;

    var items = container.querySelectorAll('.preview-item');
    if (activeIndex >= items.length) {
        // DOM out of sync, fall back to full render
        App.renderAllPreviews();
        return;
    }

    var canvas = items[activeIndex].querySelector('canvas');
    if (!canvas) return;

    App.renderCanvas(canvas, screenshots[activeIndex]);
};

// Re-render all canvases without rebuilding the DOM structure
App.renderAllCanvases = function() {
    var container = document.getElementById('previewsContainer');
    var screenshots = App.getActiveScreenshots();
    var items = container.querySelectorAll('.preview-item');

    if (screenshots.length !== items.length) {
        // DOM out of sync, fall back to full render
        App.renderAllPreviews();
        return;
    }

    for (var i = 0; i < screenshots.length; i++) {
        var canvas = items[i].querySelector('canvas');
        if (canvas) {
            App.renderCanvas(canvas, screenshots[i]);
        }
    }
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
        var angle = (settings.bgGradientAngle != null ? settings.bgGradientAngle : 180) * Math.PI / 180;
        var cx = w / 2, cy = h / 2;
        var len = Math.abs(w * Math.sin(angle)) + Math.abs(h * Math.cos(angle));
        var dx = Math.sin(angle) * len / 2;
        var dy = -Math.cos(angle) * len / 2;
        var gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        gradient.addColorStop(0, settings.bgColor);
        gradient.addColorStop(1, settings.bgGradientColor || '#ffffff');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = settings.bgColor;
    }
    ctx.fillRect(0, 0, w, h);

    // Pre-calculate text layout for dynamic screenshot positioning
    var textLayout = null;
    if (!preset.noText && (settings.headline || settings.subheadline)) {
        textLayout = App.calculateTextLayout(ctx, w, h, settings, format, App.currentFormat);
    }

    var screenshotInfo = App.drawScreenshot(ctx, screenshot, w, h, preset, settings, format, textLayout);

    if (textLayout) {
        App.drawText(ctx, w, h, preset, settings, format, App.currentFormat, screenshotInfo, textLayout);
    }
};

App.drawScreenshot = function(ctx, screenshot, canvasW, canvasH, preset, settings, format, textLayout) {
    // Hide screenshot if toggled
    if (settings.hideScreenshot) {
        return { imgY: 0, imgH: 0 };
    }

    var imgW = canvasW * 0.87;

    // Calculate height based on screenshot ratio
    var imgRatio = screenshot.width / screenshot.height;
    var imgH = imgW / imgRatio;

    var imgX = (canvasW - imgW) / 2;
    // Apply horizontal offset (-50 to +50 mapped to canvas width)
    if (settings.screenshotOffsetX) {
        imgX += canvasW * (settings.screenshotOffsetX / 100);
    }
    var imgY;
    var radius = imgW * (format.cornerRadius || 0.1);
    if (preset.centered) {
        imgY = (canvasH - imgH) / 2;
    } else if (textLayout) {
        // Dynamic positioning: screenshot placed after text zone
        if (preset.cropBottom) {
            // Preset "top": text at top, screenshot below
            imgY = textLayout.totalZoneHeight;
        } else if (preset.cropTop) {
            // Preset "bottom": screenshot at top, text below
            imgY = canvasH - textLayout.totalZoneHeight - imgH;
        }
    } else {
        var offsetY = settings.screenshotOffsetY != null ? settings.screenshotOffsetY : (settings.textSpacing != null ? settings.textSpacing : 33);
        var spacingValue = App.spacingToSliderValue(offsetY);
        var screenshotY = App.getSpacingScreenshotY(preset.screenshotY, spacingValue);
        imgY = canvasH * screenshotY;
    }

    // Apply rotation around screenshot center
    var rotation = settings.screenshotRotation || 0;
    var hasRotation = rotation !== 0;
    var centerX = imgX + imgW / 2;
    var centerY = imgY + imgH / 2;

    ctx.save();

    // Clip to canvas bounds BEFORE rotation
    ctx.beginPath();
    ctx.rect(0, 0, canvasW, canvasH);
    ctx.clip();

    // Apply rotation after canvas clip
    if (hasRotation) {
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.translate(-centerX, -centerY);
    }

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
        ctx.roundRect(imgX, imgY, imgW, imgH, radius);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();
    }

    // Clip and draw screenshot image
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, radius);
    ctx.clip();
    ctx.drawImage(screenshot.image, imgX, imgY, imgW, imgH);
    ctx.restore();

    // Device frame (completely outside the image)
    if (settings.addDeviceFrame) {
        var frameWidth = Math.max(8, imgW * 0.02);
        var frameOffset = frameWidth / 2;
        var frameRadius = radius + frameOffset;

        ctx.strokeStyle = settings.deviceFrameColor;
        ctx.lineWidth = frameWidth;

        ctx.beginPath();
        ctx.roundRect(imgX - frameOffset, imgY - frameOffset, imgW + frameWidth, imgH + frameWidth, frameRadius);
        ctx.stroke();
    }

    ctx.restore();

    return { imgY: imgY, imgH: imgH };
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

App.calculateTextLayout = function(ctx, canvasW, canvasH, settings, format, formatKey) {
    var headlineFontSize = App.migrateFontSize(settings.titleSize, 'title');
    var subheadlineFontSize = App.migrateFontSize(settings.bodySize, 'body');

    var textGap = settings.textGap != null ? settings.textGap : 35;
    var lineSpacing = headlineFontSize * (0.1 + (textGap / 100) * 1.4);

    // Get font families and weights
    var titleFontKey = settings.titleFont || 'sf-pro';
    var bodyFontKey = settings.bodyFont || 'sf-pro';
    var titleFontConfig = App.FONTS[titleFontKey] || App.FONTS['sf-pro'];
    var bodyFontConfig = App.FONTS[bodyFontKey] || App.FONTS['sf-pro'];
    var titleWeightKey = settings.titleWeight || 'bold';
    var bodyWeightKey = settings.bodyWeight || 'medium';
    var titleWeightValue = App.FONT_WEIGHTS[titleWeightKey] ? App.FONT_WEIGHTS[titleWeightKey].value : 700;
    var bodyWeightValue = App.FONT_WEIGHTS[bodyWeightKey] ? App.FONT_WEIGHTS[bodyWeightKey].value : 500;

    var horizontalPadding = canvasW * 0.065;
    var maxTextWidth = canvasW - (horizontalPadding * 2);

    // Prepare text (uppercase transform if enabled)
    var headlineText = settings.headline || '';
    var subheadlineText = settings.subheadline || '';
    var titleLetterSpacing = 0;
    var bodyLetterSpacing = 0;

    if (settings.titleUppercase) {
        headlineText = headlineText.toUpperCase();
        titleLetterSpacing = headlineFontSize * 0.05;
    }
    if (settings.bodyUppercase) {
        subheadlineText = subheadlineText.toUpperCase();
        bodyLetterSpacing = subheadlineFontSize * 0.05;
    }

    // Wrap headline text (multiline support)
    ctx.font = titleWeightValue + ' ' + headlineFontSize + 'px ' + titleFontConfig.family;
    ctx.letterSpacing = titleLetterSpacing + 'px';
    var headlineLines = headlineText ? App.wrapText(ctx, headlineText, maxTextWidth) : [];
    var titleLineSpacing = headlineFontSize * 0.15;

    // Wrap subheadline text
    ctx.font = bodyWeightValue + ' ' + subheadlineFontSize + 'px ' + bodyFontConfig.family;
    ctx.letterSpacing = bodyLetterSpacing + 'px';
    var subheadlineLines = subheadlineText ? App.wrapText(ctx, subheadlineText, maxTextWidth) : [];
    var bodyLineSpacing = subheadlineFontSize * 0.3;

    ctx.letterSpacing = '0px';

    // Calculate total text block height
    var totalTextHeight = 0;
    if (headlineLines.length > 0) {
        totalTextHeight += headlineFontSize * headlineLines.length;
        totalTextHeight += titleLineSpacing * (headlineLines.length - 1);
    }
    if (headlineLines.length > 0 && subheadlineLines.length > 0) {
        totalTextHeight += lineSpacing;
    }
    if (subheadlineLines.length > 0) {
        totalTextHeight += subheadlineFontSize * subheadlineLines.length;
        totalTextHeight += bodyLineSpacing * (subheadlineLines.length - 1);
    }

    // Spacing margin (uses screenshotOffsetY, migrated from textSpacing)
    var offsetY = settings.screenshotOffsetY != null ? settings.screenshotOffsetY : (settings.textSpacing != null ? settings.textSpacing : 33);
    var spacingValue = App.spacingToSliderValue(offsetY);
    var marginRatio = App.getSpacingMargin(spacingValue);
    var margin = canvasH * marginRatio;

    return {
        headlineLines: headlineLines,
        subheadlineLines: subheadlineLines,
        headlineFontSize: headlineFontSize,
        subheadlineFontSize: subheadlineFontSize,
        lineSpacing: lineSpacing,
        titleLineSpacing: titleLineSpacing,
        bodyLineSpacing: bodyLineSpacing,
        totalTextHeight: totalTextHeight,
        margin: margin,
        horizontalPadding: horizontalPadding,
        maxTextWidth: maxTextWidth,
        titleFontFamily: titleFontConfig.family,
        bodyFontFamily: bodyFontConfig.family,
        titleWeightValue: titleWeightValue,
        bodyWeightValue: bodyWeightValue,
        // Total zone = margin above + text + margin below
        totalZoneHeight: margin + totalTextHeight + margin
    };
};

App.drawText = function(ctx, canvasW, canvasH, preset, settings, format, formatKey, screenshotInfo, textLayout) {
    var tl = textLayout;

    // Determine text start position using margin-based layout
    // Text is vertically centered within the text zone, respecting min margins
    var startY;
    if (settings.hideScreenshot) {
        // No screenshot: center text vertically on entire canvas
        startY = (canvasH - tl.totalTextHeight) / 2;
    } else if (preset.cropBottom) {
        // Preset "top": text zone is [0, imgY], center text with margins
        var zoneHeight = screenshotInfo.imgY;
        startY = tl.margin + (zoneHeight - 2 * tl.margin - tl.totalTextHeight) / 2;
    } else if (preset.cropTop) {
        // Preset "bottom": text zone is [screenshotEnd, canvasH], center text with margins
        var screenshotEndY = screenshotInfo.imgY + screenshotInfo.imgH;
        var zoneHeight = canvasH - screenshotEndY;
        startY = screenshotEndY + tl.margin + (zoneHeight - 2 * tl.margin - tl.totalTextHeight) / 2;
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
        textX = tl.horizontalPadding;
    } else if (textAlign === 'right') {
        textX = canvasW - tl.horizontalPadding;
    } else {
        textX = canvasW / 2;
    }

    // Draw headline (multiline)
    if (tl.headlineLines.length > 0) {
        ctx.fillStyle = settings.titleColor || '#ffffff';
        ctx.font = tl.titleWeightValue + ' ' + tl.headlineFontSize + 'px ' + tl.titleFontFamily;
        ctx.letterSpacing = (settings.titleUppercase ? tl.headlineFontSize * 0.05 : 0) + 'px';
        for (var i = 0; i < tl.headlineLines.length; i++) {
            ctx.fillText(tl.headlineLines[i], textX, startY);
            startY += tl.headlineFontSize + (i < tl.headlineLines.length - 1 ? tl.titleLineSpacing : 0);
        }
        if (tl.subheadlineLines.length > 0) {
            startY += tl.lineSpacing;
        }
    }

    // Draw subheadline (multiline)
    if (tl.subheadlineLines.length > 0) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = settings.bodyColor || '#ffffff';
        ctx.font = tl.bodyWeightValue + ' ' + tl.subheadlineFontSize + 'px ' + tl.bodyFontFamily;
        ctx.letterSpacing = (settings.bodyUppercase ? tl.subheadlineFontSize * 0.05 : 0) + 'px';
        for (var i = 0; i < tl.subheadlineLines.length; i++) {
            ctx.fillText(tl.subheadlineLines[i], textX, startY);
            startY += tl.subheadlineFontSize + tl.bodyLineSpacing;
        }
        ctx.globalAlpha = 1;
        ctx.letterSpacing = '0px';
    }
};
