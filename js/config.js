// ============================================
// Configuration & Constantes
// ============================================

var App = window.App || {};

App.FORMATS = {
    'iphone-6.7': { width: 1290, height: 2796, name: 'iPhone 6.7"' },
    'iphone-6.5': { width: 1284, height: 2778, name: 'iPhone 6.5"' },
    'iphone-5.5': { width: 1242, height: 2208, name: 'iPhone 5.5"' },
    'ipad-12.9': { width: 2048, height: 2732, name: 'iPad 12.9"' },
    'ipad-11': { width: 1668, height: 2388, name: 'iPad 11"' },
    'mac': { width: 1280, height: 800, name: 'Mac' }
};

App.CORNER_RADIUS_RATIO = 0.1; // 8% de la largeur de l'image

App.PRESETS = {
    'top': {
        screenshotY: 0.24,
        textY: 0.04,
        screenshotScale: 0.88,
        cropBottom: true
    },
    'center': {
        centered: true,
        screenshotScale: 0.85,
        noText: true
    },
    'bottom': {
        screenshotY: -0.12,
        textY: 0.82,
        screenshotScale: 0.88,
        cropTop: true
    }
};

App.DEFAULT_SETTINGS = {
    headline: 'Your Amazing App',
    subheadline: 'The best way to do things',
    textColor: '#ffffff',
    bgColor: '#75B7E7',
    addShadow: false,
    addDeviceFrame: false,
    deviceFrameColor: '#000000',
    preset: 'top'
};
