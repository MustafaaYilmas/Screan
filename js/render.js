// ============================================
// Rendering Functions
// ============================================

var App = window.App || {};

// ============================================
// Canvas Image Drag
// ============================================

App._canvasDrag = { active: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0, zoom: 1 };

App.initCanvasDrag = function(canvas, idx, zoom) {
    // Prevent native drag so reorder doesn't fire when dragging on canvas
    canvas.addEventListener('dragstart', function(e) { e.preventDefault(); e.stopPropagation(); });

    canvas.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        App.selectScreenshot(idx);
        var settings = App.getActiveSettings();
        if (!settings) return;

        var d = App._canvasDrag;
        d.active = true;
        d.startX = e.clientX;
        d.startY = e.clientY;
        d.startOffsetX = settings.screenshotOffsetX || 0;
        d.startOffsetY = settings.screenshotOffsetY || 0;
        d.zoom = zoom;
        d.format = App.getActiveFormat();
        e.preventDefault();
        e.stopPropagation();
    });

    canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        App.selectScreenshot(idx);
        var settings = App.getActiveSettings();
        if (!settings) return;

        var d = App._canvasDrag;
        d.active = true;
        d.startX = e.touches[0].clientX;
        d.startY = e.touches[0].clientY;
        d.startOffsetX = settings.screenshotOffsetX || 0;
        d.startOffsetY = settings.screenshotOffsetY || 0;
        d.zoom = zoom;
        d.format = App.getActiveFormat();
    }, { passive: true });
};

App._onCanvasDragMove = function(clientX, clientY) {
    var d = App._canvasDrag;
    if (!d.active) return;

    var settings = App.getActiveSettings();
    if (!settings) return;

    var deltaX = clientX - d.startX;
    var deltaY = clientY - d.startY;

    // Convert screen pixels to canvas pixels, then to percentage offset
    var canvasW = d.format.width * d.zoom;
    var canvasH = d.format.height * d.zoom;

    settings.screenshotOffsetX = d.startOffsetX + (deltaX / canvasW) * 100;
    settings.screenshotOffsetY = d.startOffsetY + (deltaY / canvasH) * 100;

    // Clamp
    settings.screenshotOffsetX = Math.max(-50, Math.min(50, settings.screenshotOffsetX));
    settings.screenshotOffsetY = Math.max(-50, Math.min(50, settings.screenshotOffsetY));

    App.syncSlider('screenshotOffsetX', Math.round(settings.screenshotOffsetX));
    App.syncSlider('screenshotOffsetY', Math.round(settings.screenshotOffsetY));
    App.renderActivePreview();
};

App._onCanvasDragEnd = function() {
    var d = App._canvasDrag;
    if (!d.active) return;
    d.active = false;
    App.updateSectionApplyButtons();
    App.Storage.scheduleSave();
    App.Undo.scheduleCapture();
};

// Global mouse/touch move and up handlers
document.addEventListener('mousemove', function(e) { App._onCanvasDragMove(e.clientX, e.clientY); });
document.addEventListener('mouseup', function() { App._onCanvasDragEnd(); });
document.addEventListener('touchmove', function(e) {
    if (App._canvasDrag.active && e.touches.length === 1) {
        App._onCanvasDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
}, { passive: true });
document.addEventListener('touchend', function() { App._onCanvasDragEnd(); });

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

    var format = App.getActiveFormat();
    var wrapperHeight = wrapper.clientHeight;
    var wrapperWidth = wrapper.clientWidth;
    var maxCanvasHeight = wrapperHeight - 70;
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
        deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
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

        // Canvas image drag
        App.initCanvasDrag(canvas, index, zoom);

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
    var format = App.getActiveFormat();
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

    // Draw background image if present (superposed over color/gradient)
    if (settings.bgImage && settings.bgImageObj instanceof Image && settings.bgImageObj.complete) {
        ctx.save();
        ctx.globalAlpha = (settings.bgImageOpacity != null ? settings.bgImageOpacity : 100) / 100;
        var bgImgRatio = settings.bgImageObj.width / settings.bgImageObj.height;
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
        ctx.drawImage(settings.bgImageObj, drawX, drawY, drawW, drawH);
        ctx.restore();
    }

    // Draw pattern overlay if enabled
    if (settings.bgPattern && settings.bgPattern !== 'none') {
        App.drawBgPattern(ctx, w, h, settings);
    }

    // Pre-calculate text layout for dynamic screenshot positioning
    var textLayout = null;
    if (!preset.noText && (settings.headline || settings.subheadline)) {
        textLayout = App.calculateTextLayout(ctx, w, h, settings, format, App.state.activePlatform);
    }

    var screenshotInfo = App.drawScreenshot(ctx, screenshot, w, h, preset, settings, format, textLayout, App.state.activePlatform);

    if (textLayout) {
        App.drawText(ctx, w, h, preset, settings, format, App.state.activePlatform, screenshotInfo, textLayout);
    }
};

App.drawScreenshot = function(ctx, screenshot, canvasW, canvasH, preset, settings, format, textLayout, platformKey) {
    // Hide screenshot if toggled or image removed
    if (settings.hideScreenshot || !screenshot.image) {
        return { imgY: 0, imgH: 0 };
    }

    var zoom = (settings.screenshotZoom != null ? settings.screenshotZoom : 87) / 100;
    var imgW = canvasW * zoom;

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
        // No text: base position from preset (medium spacing)
        var baseScreenshotY = App.getSpacingScreenshotY(preset.screenshotY, 33);
        imgY = canvasH * baseScreenshotY;
    }

    // Save base position for text layout (before user offsets)
    var baseImgY = imgY;

    // Apply direct offsets (drag / sliders)
    if (settings.screenshotOffsetX) {
        // Already applied above for X
    }
    var directOffsetY = settings.screenshotOffsetY != null ? settings.screenshotOffsetY : 0;
    imgY += canvasH * (directOffsetY / 100);

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

    // Determine frame style (backward compat with addDeviceFrame boolean)
    var frameStyle = settings.deviceFrameStyle;
    if (!frameStyle) {
        frameStyle = settings.addDeviceFrame === false ? 'none' : 'border';
    }

    if (frameStyle === 'mockup') {
        var mockupKey = App.resolveMockupKey(settings, platformKey || App.state.activePlatform);
        var deviceBounds = App.getDeviceBounds(imgX, imgY, imgW, imgH, mockupKey);

        // Shadow on device body
        if (settings.addShadow) {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 80;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 35;
            ctx.beginPath();
            ctx.roundRect(deviceBounds.x, deviceBounds.y, deviceBounds.w, deviceBounds.h, deviceBounds.radius);
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.restore();
        }

        // Draw device mockup frame
        App.drawDeviceMockupFrame(ctx, imgX, imgY, imgW, imgH, mockupKey, settings.deviceFrameColor || '#000000');

        // Draw screenshot clipped to screen area
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, deviceBounds.screenRadius);
        ctx.clip();
        ctx.drawImage(screenshot.image, imgX, imgY, imgW, imgH);
        ctx.restore();

        // Draw device overlays (Dynamic Island, punch hole, etc.)
        App.drawDeviceOverlays(ctx, imgX, imgY, imgW, imgH, mockupKey);

    } else {
        // 'none' or 'border' mode
        if (settings.addShadow) {
            ctx.save();
            var shadowIntensity = frameStyle === 'border' ? 0.5 : 0.4;
            var shadowBlur = frameStyle === 'border' ? 80 : 60;
            var shadowOffset = frameStyle === 'border' ? 35 : 25;
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

        // Device frame border
        if (frameStyle === 'border') {
            var frameWidth = Math.max(8, imgW * 0.02);
            var frameOffset = frameWidth / 2;
            var frameRadius = radius + frameOffset;

            ctx.strokeStyle = settings.deviceFrameColor;
            ctx.lineWidth = frameWidth;

            ctx.beginPath();
            ctx.roundRect(imgX - frameOffset, imgY - frameOffset, imgW + frameWidth, imgH + frameWidth, frameRadius);
            ctx.stroke();
        }
    }

    ctx.restore();

    return { imgY: baseImgY, imgH: imgH };
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

    // Fixed text margin (medium spacing)
    var marginRatio = App.getSpacingMargin(33);
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
    var startY;
    if (settings.hideScreenshot) {
        startY = (canvasH - tl.totalTextHeight) / 2;
    } else if (preset.cropBottom) {
        var zoneHeight = screenshotInfo.imgY;
        startY = tl.margin + (zoneHeight - 2 * tl.margin - tl.totalTextHeight) / 2;
    } else if (preset.cropTop) {
        var screenshotEndY = screenshotInfo.imgY + screenshotInfo.imgH;
        var zoneHeight = canvasH - screenshotEndY;
        startY = screenshotEndY + tl.margin + (zoneHeight - 2 * tl.margin - tl.totalTextHeight) / 2;
    } else {
        startY = canvasH * preset.textY;
    }

    var textAlign = settings.textAlign || 'center';
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'top';

    var textX;
    if (textAlign === 'left') {
        textX = tl.horizontalPadding;
    } else if (textAlign === 'right') {
        textX = canvasW - tl.horizontalPadding;
    } else {
        textX = canvasW / 2;
    }

    // Pre-calculate all line positions for multi-pass rendering (effects)
    var allLines = [];
    var y = startY;

    if (tl.headlineLines.length > 0) {
        var titleFont = tl.titleWeightValue + ' ' + tl.headlineFontSize + 'px ' + tl.titleFontFamily;
        var titleLS = (settings.titleUppercase ? tl.headlineFontSize * 0.05 : 0) + 'px';
        for (var i = 0; i < tl.headlineLines.length; i++) {
            allLines.push({
                text: tl.headlineLines[i], x: textX, y: y,
                fontSize: tl.headlineFontSize, color: settings.titleColor || '#ffffff',
                font: titleFont, letterSpacing: titleLS, alpha: 1
            });
            y += tl.headlineFontSize + (i < tl.headlineLines.length - 1 ? tl.titleLineSpacing : 0);
        }
        if (tl.subheadlineLines.length > 0) y += tl.lineSpacing;
    }

    if (tl.subheadlineLines.length > 0) {
        var bodyFont = tl.bodyWeightValue + ' ' + tl.subheadlineFontSize + 'px ' + tl.bodyFontFamily;
        var bodyLS = (settings.bodyUppercase ? tl.subheadlineFontSize * 0.05 : 0) + 'px';
        for (var i = 0; i < tl.subheadlineLines.length; i++) {
            allLines.push({
                text: tl.subheadlineLines[i], x: textX, y: y,
                fontSize: tl.subheadlineFontSize, color: settings.bodyColor || '#ffffff',
                font: bodyFont, letterSpacing: bodyLS, alpha: 0.9
            });
            y += tl.subheadlineFontSize + tl.bodyLineSpacing;
        }
    }

    // Pass 1: Draw highlight backgrounds
    if (settings.textHighlight && allLines.length > 0) {
        var hlHex = settings.textHighlightColor || '#000000';
        var hlOpacity = (settings.textHighlightOpacity != null ? settings.textHighlightOpacity : 30) / 100;
        var r = parseInt(hlHex.slice(1, 3), 16);
        var g = parseInt(hlHex.slice(3, 5), 16);
        var b = parseInt(hlHex.slice(5, 7), 16);

        for (var i = 0; i < allLines.length; i++) {
            var line = allLines[i];
            if (!line.text) continue;
            ctx.font = line.font;
            ctx.letterSpacing = line.letterSpacing;
            ctx.globalAlpha = line.alpha;
            var tw = ctx.measureText(line.text).width;
            var hPad = line.fontSize * 0.25;
            var vPad = line.fontSize * 0.12;
            var hlW = tw + hPad * 2;
            var hlH = line.fontSize + vPad * 2;
            var hlR = line.fontSize * 0.12;
            var hlX;
            if (textAlign === 'center') {
                hlX = line.x - tw / 2 - hPad;
            } else if (textAlign === 'right') {
                hlX = line.x - tw - hPad;
            } else {
                hlX = line.x - hPad;
            }
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + hlOpacity + ')';
            ctx.beginPath();
            ctx.roundRect(hlX, line.y - vPad, hlW, hlH, hlR);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Pass 2: Draw text with shadow and outline effects
    var hasShadow = settings.textShadow;
    var hasOutline = settings.textOutline;
    var shadowColor, shadowBlur, shadowOffsetY, outlineColor, outlineWidth;

    if (hasShadow) {
        shadowColor = settings.textShadowColor || '#000000';
        shadowBlur = settings.textShadowBlur != null ? settings.textShadowBlur : 10;
        shadowOffsetY = settings.textShadowOffsetY != null ? settings.textShadowOffsetY : 5;
    }
    if (hasOutline) {
        outlineColor = settings.textOutlineColor || '#000000';
        outlineWidth = settings.textOutlineWidth != null ? settings.textOutlineWidth : 3;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
    }

    for (var i = 0; i < allLines.length; i++) {
        var line = allLines[i];
        ctx.font = line.font;
        ctx.letterSpacing = line.letterSpacing;
        ctx.globalAlpha = line.alpha;

        if (hasOutline) {
            if (hasShadow) {
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = shadowBlur;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = shadowOffsetY;
            }
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = outlineWidth;
            ctx.strokeText(line.text, line.x, line.y);
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = line.color;
            ctx.fillText(line.text, line.x, line.y);
        } else {
            if (hasShadow) {
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = shadowBlur;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = shadowOffsetY;
            }
            ctx.fillStyle = line.color;
            ctx.fillText(line.text, line.x, line.y);
            if (hasShadow) ctx.shadowColor = 'transparent';
        }
    }

    ctx.globalAlpha = 1;
    ctx.letterSpacing = '0px';
    ctx.shadowColor = 'transparent';
};

// ============================================
// Background Pattern Drawing
// ============================================

App.drawBgPattern = function(ctx, w, h, settings) {
    var pattern = settings.bgPattern;
    var color = settings.bgPatternColor || '#000000';
    var size = settings.bgPatternSize != null ? settings.bgPatternSize : 30;
    var opacity = (settings.bgPatternOpacity != null ? settings.bgPatternOpacity : 20) / 100;

    // Scale size relative to canvas (base: 1242px width)
    var scale = w / 1242;
    var s = size * scale;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    switch (pattern) {
        case 'dots':
            App._drawPatternDots(ctx, w, h, s);
            break;
        case 'lines-h':
            App._drawPatternLinesH(ctx, w, h, s);
            break;
        case 'lines-v':
            App._drawPatternLinesV(ctx, w, h, s);
            break;
        case 'lines-d':
            App._drawPatternLinesD(ctx, w, h, s);
            break;
        case 'grid':
            App._drawPatternGrid(ctx, w, h, s);
            break;
        case 'cross-hatch':
            App._drawPatternCrossHatch(ctx, w, h, s);
            break;
        case 'diamonds':
            App._drawPatternDiamonds(ctx, w, h, s);
            break;
        case 'triangles':
            App._drawPatternTriangles(ctx, w, h, s);
            break;
        case 'hexagons':
            App._drawPatternHexagons(ctx, w, h, s);
            break;
        case 'waves':
            App._drawPatternWaves(ctx, w, h, s);
            break;
        case 'circles':
            App._drawPatternCircles(ctx, w, h, s);
            break;
        case 'chevron':
            App._drawPatternChevron(ctx, w, h, s);
            break;
    }

    ctx.restore();
};

// --- Pattern implementations ---

App._drawPatternDots = function(ctx, w, h, s) {
    var spacing = s * 1.5;
    var radius = Math.max(1, s * 0.12);
    for (var y = spacing / 2; y < h; y += spacing) {
        for (var x = spacing / 2; x < w; x += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

App._drawPatternLinesH = function(ctx, w, h, s) {
    var spacing = s * 1.2;
    var lw = Math.max(1, s * 0.06);
    ctx.lineWidth = lw;
    for (var y = spacing / 2; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
};

App._drawPatternLinesV = function(ctx, w, h, s) {
    var spacing = s * 1.2;
    var lw = Math.max(1, s * 0.06);
    ctx.lineWidth = lw;
    for (var x = spacing / 2; x < w; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
};

App._drawPatternLinesD = function(ctx, w, h, s) {
    var spacing = s * 1.5;
    var lw = Math.max(1, s * 0.06);
    ctx.lineWidth = lw;
    var diag = w + h;
    for (var d = -diag; d < diag; d += spacing) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + h, h);
        ctx.stroke();
    }
};

App._drawPatternGrid = function(ctx, w, h, s) {
    var spacing = s * 1.5;
    var lw = Math.max(1, s * 0.04);
    ctx.lineWidth = lw;
    for (var y = spacing / 2; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    for (var x = spacing / 2; x < w; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
};

App._drawPatternCrossHatch = function(ctx, w, h, s) {
    var spacing = s * 1.5;
    var lw = Math.max(1, s * 0.04);
    ctx.lineWidth = lw;
    var diag = w + h;
    // 45° lines
    for (var d = -diag; d < diag; d += spacing) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + h, h);
        ctx.stroke();
    }
    // -45° lines
    for (d = -diag; d < diag; d += spacing) {
        ctx.beginPath();
        ctx.moveTo(d, h);
        ctx.lineTo(d + h, 0);
        ctx.stroke();
    }
};

App._drawPatternDiamonds = function(ctx, w, h, s) {
    var spacing = s * 2;
    var half = spacing / 2;
    var lw = Math.max(1, s * 0.05);
    ctx.lineWidth = lw;
    for (var row = 0; row * half < h + spacing; row++) {
        for (var col = 0; col * spacing < w + spacing; col++) {
            var cx = col * spacing + (row % 2 ? half : 0);
            var cy = row * half;
            ctx.beginPath();
            ctx.moveTo(cx, cy - half);
            ctx.lineTo(cx + half, cy);
            ctx.lineTo(cx, cy + half);
            ctx.lineTo(cx - half, cy);
            ctx.closePath();
            ctx.stroke();
        }
    }
};

App._drawPatternTriangles = function(ctx, w, h, s) {
    var spacing = s * 2;
    var triH = spacing * 0.866; // sqrt(3)/2
    var lw = Math.max(1, s * 0.05);
    ctx.lineWidth = lw;
    for (var row = 0; row * triH < h + triH; row++) {
        var offsetX = (row % 2) ? spacing / 2 : 0;
        for (var col = -1; col * spacing < w + spacing; col++) {
            var x = col * spacing + offsetX;
            var y = row * triH;
            // Upward triangle
            ctx.beginPath();
            ctx.moveTo(x, y + triH);
            ctx.lineTo(x + spacing / 2, y);
            ctx.lineTo(x + spacing, y + triH);
            ctx.closePath();
            ctx.stroke();
        }
    }
};

App._drawPatternHexagons = function(ctx, w, h, s) {
    var r = s * 0.8;
    var hexW = r * 2;
    var hexH = r * Math.sqrt(3);
    var lw = Math.max(1, s * 0.05);
    ctx.lineWidth = lw;
    for (var row = -1; row * hexH * 0.75 < h + hexH; row++) {
        var offsetX = (row % 2) ? r * 1.5 : 0;
        for (var col = -1; col * (r * 3) < w + hexW; col++) {
            var cx = col * (r * 3) + offsetX;
            var cy = row * hexH * 0.75;
            ctx.beginPath();
            for (var i = 0; i < 6; i++) {
                var angle = Math.PI / 3 * i - Math.PI / 6;
                var px = cx + r * Math.cos(angle);
                var py = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
};

App._drawPatternWaves = function(ctx, w, h, s) {
    var spacing = s * 1.5;
    var amplitude = s * 0.4;
    var wavelength = s * 3;
    var lw = Math.max(1, s * 0.06);
    ctx.lineWidth = lw;
    for (var y = spacing / 2; y < h + amplitude; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (var x = 0; x <= w; x += 2) {
            ctx.lineTo(x, y + Math.sin((x / wavelength) * Math.PI * 2) * amplitude);
        }
        ctx.stroke();
    }
};

App._drawPatternCircles = function(ctx, w, h, s) {
    var spacing = s * 2.5;
    var maxRadius = spacing * 0.45;
    var lw = Math.max(1, s * 0.05);
    ctx.lineWidth = lw;
    for (var y = spacing / 2; y < h; y += spacing) {
        for (var x = spacing / 2; x < w; x += spacing) {
            var rings = 3;
            for (var r = 1; r <= rings; r++) {
                ctx.beginPath();
                ctx.arc(x, y, maxRadius * (r / rings), 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
};

App._drawPatternChevron = function(ctx, w, h, s) {
    var spacing = s * 1.5;
    var chevH = s * 0.8;
    var lw = Math.max(1, s * 0.06);
    ctx.lineWidth = lw;
    for (var row = 0; row * chevH < h + chevH; row++) {
        var y = row * chevH;
        for (var x = -spacing; x < w + spacing; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, y + chevH / 2);
            ctx.lineTo(x + spacing / 2, y);
            ctx.lineTo(x + spacing, y + chevH / 2);
            ctx.stroke();
        }
    }
};
