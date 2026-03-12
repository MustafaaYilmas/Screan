// ============================================
// Device Mockup Rendering
// ============================================

var App = window.App || {};

// Device mockup specifications
App.DEVICE_MOCKUPS = {
    // ---- iPhone ----
    'iphone-16-pro': {
        name: 'iPhone 16 Pro',
        platforms: ['iphone'],
        bezel: 0.03,
        bodyRadius: 0.11,
        screenRadius: 0.085,
        dynamicIsland: true,
        sideButtons: true,
        buttonLayout: 'iphone'
    },
    'iphone-15': {
        name: 'iPhone 15',
        platforms: ['iphone'],
        bezel: 0.038,
        bodyRadius: 0.12,
        screenRadius: 0.09,
        dynamicIsland: true,
        sideButtons: true,
        buttonLayout: 'iphone'
    },
    'iphone-se': {
        name: 'iPhone SE',
        platforms: ['iphone'],
        bezelTop: 0.12,
        bezelBottom: 0.16,
        bezelSide: 0.045,
        bodyRadius: 0.075,
        screenRadius: 0.01,
        homeButton: true,
        sideButtons: true,
        buttonLayout: 'iphone-se'
    },
    // ---- iPad ----
    'ipad-pro': {
        name: 'iPad Pro',
        platforms: ['ipad'],
        bezel: 0.018,
        bodyRadius: 0.032,
        screenRadius: 0.022,
        sideButtons: false
    },
    'ipad-air': {
        name: 'iPad Air',
        platforms: ['ipad'],
        bezel: 0.028,
        bodyRadius: 0.04,
        screenRadius: 0.03,
        sideButtons: false
    },
    // ---- Mac ----
    'macbook-pro': {
        name: 'MacBook Pro',
        platforms: ['mac'],
        bezelTop: 0.025,
        bezelBottom: 0.035,
        bezelSide: 0.012,
        bezelRefHeight: true,
        bodyRadius: 0.012,
        screenRadius: 0.006,
        macNotch: true,
        sideButtons: false
    },
    'macbook-air': {
        name: 'MacBook Air',
        platforms: ['mac'],
        bezelTop: 0.028,
        bezelBottom: 0.032,
        bezelSide: 0.013,
        bezelRefHeight: true,
        bodyRadius: 0.013,
        screenRadius: 0.006,
        macNotch: true,
        sideButtons: false
    },
    'imac': {
        name: 'iMac',
        platforms: ['mac'],
        bezelTop: 0.022,
        bezelBottom: 0.065,
        bezelSide: 0.015,
        bezelRefHeight: true,
        bodyRadius: 0.016,
        screenRadius: 0.005,
        frontCamera: true,
        sideButtons: false
    },
    // ---- Android Phone ----
    'pixel-9': {
        name: 'Pixel 9',
        platforms: ['android-phone'],
        bezel: 0.038,
        bodyRadius: 0.095,
        screenRadius: 0.07,
        punchHole: true,
        sideButtons: true,
        buttonLayout: 'android-right'
    },
    'galaxy-s24': {
        name: 'Galaxy S24',
        platforms: ['android-phone'],
        bezel: 0.03,
        bodyRadius: 0.065,
        screenRadius: 0.05,
        punchHole: true,
        sideButtons: true,
        buttonLayout: 'android-right'
    },
    // ---- Android Tablet ----
    'galaxy-tab': {
        name: 'Galaxy Tab S9',
        platforms: ['android-tablet'],
        bezel: 0.02,
        bodyRadius: 0.025,
        screenRadius: 0.018,
        sideButtons: false
    },
    'pixel-tablet': {
        name: 'Pixel Tablet',
        platforms: ['android-tablet'],
        bezel: 0.03,
        bodyRadius: 0.042,
        screenRadius: 0.032,
        sideButtons: false
    }
};

// Get the default (first) mockup key for a platform
App.getMockupForPlatform = function(platform) {
    var keys = Object.keys(App.DEVICE_MOCKUPS);
    for (var i = 0; i < keys.length; i++) {
        if (App.DEVICE_MOCKUPS[keys[i]].platforms.indexOf(platform) !== -1) {
            return keys[i];
        }
    }
    return 'iphone-16-pro';
};

// Resolve the actual mockup key from settings + platform
App.resolveMockupKey = function(settings, platformKey) {
    var model = settings.deviceModel;
    if (model && model !== 'auto' && App.DEVICE_MOCKUPS[model]) {
        return model;
    }
    return App.getMockupForPlatform(platformKey || App.state.activePlatform);
};

// Populate the device model <select> based on active platform
App.populateDeviceModelSelect = function() {
    var select = document.getElementById('deviceModel');
    if (!select) return;
    var platform = App.state.activePlatform;

    select.innerHTML = '';

    Object.keys(App.DEVICE_MOCKUPS).forEach(function(key) {
        var mockup = App.DEVICE_MOCKUPS[key];
        if (mockup.platforms.indexOf(platform) !== -1) {
            var opt = document.createElement('option');
            opt.value = key;
            opt.textContent = mockup.name;
            select.appendChild(opt);
        }
    });

    var settings = App.getActiveSettings();
    var currentModel = (settings && settings.deviceModel) || 'auto';
    // If model belongs to this platform, select it; otherwise select first
    if (currentModel !== 'auto' && select.querySelector('option[value="' + currentModel + '"]')) {
        select.value = currentModel;
    } else {
        select.selectedIndex = 0;
    }
};

// Color utility: lighten a hex color
App._lightenColor = function(hex, amount) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    r = Math.min(255, Math.round(r + (255 - r) * amount));
    g = Math.min(255, Math.round(g + (255 - g) * amount));
    b = Math.min(255, Math.round(b + (255 - b) * amount));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Color utility: darken a hex color
App._darkenColor = function(hex, amount) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    r = Math.max(0, Math.round(r * (1 - amount)));
    g = Math.max(0, Math.round(g * (1 - amount)));
    b = Math.max(0, Math.round(b * (1 - amount)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Get device body bounds from screen area
App.getDeviceBounds = function(screenX, screenY, screenW, screenH, mockupKey) {
    var m = App.DEVICE_MOCKUPS[mockupKey];
    var bT, bB, bL, bR;

    if (m.bezel !== undefined) {
        // Uniform bezel (ratio of screen width)
        var b = screenW * m.bezel;
        bT = b; bB = b; bL = b; bR = b;
    } else {
        // Non-uniform bezel
        var ref = m.bezelRefHeight ? screenH : screenW;
        bT = ref * m.bezelTop;
        bB = ref * m.bezelBottom;
        bL = screenW * m.bezelSide;
        bR = screenW * m.bezelSide;
    }

    var bodyW = screenW + bL + bR;

    return {
        x: screenX - bL,
        y: screenY - bT,
        w: bodyW,
        h: screenH + bT + bB,
        radius: bodyW * m.bodyRadius,
        screenRadius: screenW * m.screenRadius,
        bT: bT, bB: bB, bL: bL, bR: bR
    };
};

// Draw the complete device mockup frame (body + screen base + features)
App.drawDeviceMockupFrame = function(ctx, screenX, screenY, screenW, screenH, mockupKey, color) {
    var m = App.DEVICE_MOCKUPS[mockupKey];
    var b = App.getDeviceBounds(screenX, screenY, screenW, screenH, mockupKey);

    ctx.save();

    // Device body with metallic gradient
    var grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y);
    grad.addColorStop(0, App._lightenColor(color, 0.18));
    grad.addColorStop(0.06, App._lightenColor(color, 0.08));
    grad.addColorStop(0.5, color);
    grad.addColorStop(0.94, App._lightenColor(color, 0.08));
    grad.addColorStop(1, App._lightenColor(color, 0.18));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, b.radius);
    ctx.fill();

    // Subtle edge highlight (metallic rim)
    ctx.strokeStyle = App._lightenColor(color, 0.25);
    ctx.lineWidth = Math.max(1, screenW * 0.0025);
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, b.radius);
    ctx.stroke();

    // Inner edge between body and screen
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = Math.max(1, screenW * 0.0015);
    ctx.beginPath();
    ctx.roundRect(screenX - 1, screenY - 1, screenW + 2, screenH + 2, b.screenRadius + 1);
    ctx.stroke();

    // Screen base (black background for off-screen area)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenW, screenH, b.screenRadius);
    ctx.fill();

    ctx.restore();

    // Side buttons
    if (m.sideButtons) {
        App._drawMockupSideButtons(ctx, b, color, mockupKey);
    }

    // Home button (iPhone SE style)
    if (m.homeButton) {
        App._drawHomeButton(ctx, screenX, screenY, screenW, screenH, b, color);
    }

    // Front camera in bezel (iMac style)
    if (m.frontCamera) {
        App._drawFrontCamera(ctx, screenX, screenY, screenW, b);
    }
};

// Draw device overlay elements on top of the screenshot
App.drawDeviceOverlays = function(ctx, screenX, screenY, screenW, screenH, mockupKey) {
    var m = App.DEVICE_MOCKUPS[mockupKey];

    if (m.dynamicIsland) {
        App._drawDynamicIsland(ctx, screenX, screenY, screenW);
    }
    if (m.punchHole) {
        App._drawPunchHole(ctx, screenX, screenY, screenW);
    }
    if (m.macNotch) {
        App._drawMacNotch(ctx, screenX, screenY, screenW, screenH);
    }
};

// --- Feature Drawing Functions ---

// iPhone Dynamic Island (based on iPhone 16 Pro: ~126pt × 37pt on 393pt screen)
App._drawDynamicIsland = function(ctx, sx, sy, sw) {
    var pw = sw * 0.31;        // width: 31% of screen width
    var ph = sw * 0.085;       // height: 8.5% of screen width
    var px = sx + (sw - pw) / 2;
    var py = sy + sw * 0.025;  // offset from screen top
    var pr = ph / 2;           // fully rounded pill

    ctx.save();

    // Black pill shape
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, pr);
    ctx.fill();

    // Front camera lens (right side of pill)
    var camR = ph * 0.20;
    var camX = px + pw - ph * 0.52;
    var camY = py + ph / 2;

    // Camera outer ring
    ctx.fillStyle = '#0a0a1a';
    ctx.beginPath();
    ctx.arc(camX, camY, camR, 0, Math.PI * 2);
    ctx.fill();

    // Camera lens highlight
    ctx.fillStyle = '#151530';
    ctx.beginPath();
    ctx.arc(camX - camR * 0.15, camY - camR * 0.15, camR * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};

// Pixel / Galaxy punch-hole camera
App._drawPunchHole = function(ctx, sx, sy, sw) {
    var r = sw * 0.013;
    var cx = sx + sw / 2;
    var cy = sy + sw * 0.026;

    ctx.save();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#080818';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};

// MacBook notch
App._drawMacNotch = function(ctx, sx, sy, sw, sh) {
    var nw = sw * 0.13;
    var nh = sh * 0.02;
    var nx = sx + (sw - nw) / 2;
    var ny = sy;
    var nr = nh * 0.4;

    ctx.save();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, [0, 0, nr, nr]);
    ctx.fill();

    // Camera dot
    var camR = nh * 0.16;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(nx + nw / 2, ny + nh * 0.5, camR, 0, Math.PI * 2);
    ctx.fill();

    // Green indicator
    ctx.fillStyle = '#2ecc40';
    ctx.beginPath();
    ctx.arc(nx + nw / 2 + camR * 3, ny + nh * 0.5, camR * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};

// iPhone SE Home Button (drawn in bottom bezel)
App._drawHomeButton = function(ctx, screenX, screenY, screenW, screenH, bounds, color) {
    var btnDiameter = bounds.bB * 0.52;
    var btnR = btnDiameter / 2;
    var cx = screenX + screenW / 2;
    var cy = screenY + screenH + bounds.bB / 2;

    ctx.save();

    // Outer ring
    ctx.strokeStyle = App._lightenColor(color, 0.18);
    ctx.lineWidth = Math.max(2, btnR * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, btnR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner button
    ctx.fillStyle = App._darkenColor(color, 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, btnR * 0.88, 0, Math.PI * 2);
    ctx.fill();

    // Rounded square (Touch ID indicator)
    var sq = btnR * 0.45;
    ctx.strokeStyle = App._lightenColor(color, 0.22);
    ctx.lineWidth = Math.max(1, sq * 0.1);
    ctx.beginPath();
    ctx.roundRect(cx - sq / 2, cy - sq / 2, sq, sq, sq * 0.22);
    ctx.stroke();

    ctx.restore();
};

// Front camera dot in bezel (iMac)
App._drawFrontCamera = function(ctx, screenX, screenY, screenW, bounds) {
    var camR = bounds.bT * 0.14;
    var cx = screenX + screenW / 2;
    var cy = screenY - bounds.bT / 2;

    ctx.save();

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, camR, 0, Math.PI * 2);
    ctx.fill();

    // Green indicator LED
    ctx.fillStyle = '#2ecc40';
    ctx.beginPath();
    ctx.arc(cx + camR * 2.5, cy, camR * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};

// Side buttons (layout-driven)
App._drawMockupSideButtons = function(ctx, bounds, color, mockupKey) {
    var m = App.DEVICE_MOCKUPS[mockupKey];
    var layout = m.buttonLayout;
    if (!layout) return;

    var btnColor = App._lightenColor(color, 0.06);
    var btnW = Math.max(2, bounds.w * 0.006);

    ctx.save();

    if (layout === 'iphone') {
        // Power (right), Action + Volume up/down (left)
        App._drawButton(ctx, bounds.x + bounds.w, bounds.y + bounds.h * 0.28, btnW, bounds.h * 0.07, btnColor, 'right');
        App._drawButton(ctx, bounds.x, bounds.y + bounds.h * 0.195, btnW, bounds.h * 0.025, btnColor, 'left');
        App._drawButton(ctx, bounds.x, bounds.y + bounds.h * 0.255, btnW, bounds.h * 0.048, btnColor, 'left');
        App._drawButton(ctx, bounds.x, bounds.y + bounds.h * 0.32, btnW, bounds.h * 0.048, btnColor, 'left');
    } else if (layout === 'iphone-se') {
        // Power (right), Volume up/down (left)
        App._drawButton(ctx, bounds.x + bounds.w, bounds.y + bounds.h * 0.18, btnW, bounds.h * 0.055, btnColor, 'right');
        App._drawButton(ctx, bounds.x, bounds.y + bounds.h * 0.22, btnW, bounds.h * 0.045, btnColor, 'left');
        App._drawButton(ctx, bounds.x, bounds.y + bounds.h * 0.28, btnW, bounds.h * 0.045, btnColor, 'left');
    } else if (layout === 'android-right') {
        // Power + Volume (right side)
        App._drawButton(ctx, bounds.x + bounds.w, bounds.y + bounds.h * 0.28, btnW, bounds.h * 0.035, btnColor, 'right');
        App._drawButton(ctx, bounds.x + bounds.w, bounds.y + bounds.h * 0.34, btnW, bounds.h * 0.065, btnColor, 'right');
    }

    ctx.restore();
};

// Draw a single side button
App._drawButton = function(ctx, x, y, w, h, color, side) {
    var r = Math.min(w * 0.4, h * 0.15);

    ctx.fillStyle = color;
    if (side === 'right') {
        ctx.beginPath();
        ctx.roundRect(x - 1, y, w + 1, h, [0, r, r, 0]);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.roundRect(x - w, y, w + 1, h, [r, 0, 0, r]);
        ctx.fill();
    }
};
