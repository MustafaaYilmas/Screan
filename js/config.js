// ============================================
// Configuration & Constants
// ============================================

var App = window.App || {};

App.FORMATS = {
    'iphone-6.9': { width: 1260, height: 2736, name: 'iPhone 6.9"', cornerRadius: 0.10 },
    'iphone-6.7': { width: 1290, height: 2796, name: 'iPhone 6.7"', cornerRadius: 0.10 },
    'iphone-6.5': { width: 1284, height: 2778, name: 'iPhone 6.5"', cornerRadius: 0.10 },
    'iphone-5.5': { width: 1242, height: 2208, name: 'iPhone 5.5"', cornerRadius: 0.08 },
    'ipad-13': { width: 2064, height: 2752, name: 'iPad 13"', cornerRadius: 0.04, textZoneTop: [0.02, 0.18], textZoneBottom: [0.80, 0.96] },
    'ipad-12.9': { width: 2048, height: 2732, name: 'iPad 12.9"', cornerRadius: 0.04, textZoneTop: [0.02, 0.18], textZoneBottom: [0.80, 0.96] },
    'ipad-11': { width: 1668, height: 2388, name: 'iPad 11"', cornerRadius: 0.04, textZoneTop: [0.02, 0.18], textZoneBottom: [0.80, 0.96] },
    'mac': { width: 1280, height: 800, name: 'Mac', cornerRadius: 0.02, fontSize: [48, 28] }
};

App.FONTS = {
    'sf-pro': { name: 'SF Pro', family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' },
    'sf-rounded': { name: 'SF Rounded', family: 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, sans-serif' },
    'sf-mono': { name: 'SF Mono', family: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, monospace' },
    'new-york': { name: 'New York', family: 'ui-serif, "New York", Georgia, serif' },
    'inter': { name: 'Inter', family: 'Inter, -apple-system, sans-serif' }
};

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
    addDeviceFrame: true,
    deviceFrameColor: '#000000',
    preset: 'top',
    titleFont: 'sf-pro',
    titleSize: 'medium',
    bodyFont: 'sf-pro',
    bodySize: 'medium'
};

App.SIZE_MULTIPLIERS = {
    small: 0.8,
    medium: 1.0,
    large: 1.2
};

App.PLATFORM_FAMILIES = {
    'iphone': {
        name: 'iPhone',
        formats: ['iphone-6.9', 'iphone-6.7', 'iphone-6.5', 'iphone-5.5'],
        defaultExport: ['iphone-6.9', 'iphone-6.7']
    },
    'ipad': {
        name: 'iPad',
        formats: ['ipad-13', 'ipad-12.9', 'ipad-11'],
        defaultExport: ['ipad-13']
    },
    'mac': {
        name: 'Mac',
        formats: ['mac'],
        defaultExport: ['mac']
    }
};
