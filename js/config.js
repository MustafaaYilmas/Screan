// ============================================
// Configuration & Constants
// ============================================

var App = window.App || {};

App.FORMATS = {
    // iOS - App Store
    'iphone-6.9': { width: 1260, height: 2736, name: 'iPhone 6.9"', cornerRadius: 0.10 },
    'iphone-6.7': { width: 1290, height: 2796, name: 'iPhone 6.7"', cornerRadius: 0.10 },
    'iphone-6.5': { width: 1284, height: 2778, name: 'iPhone 6.5"', cornerRadius: 0.10 },
    'iphone-5.5': { width: 1242, height: 2208, name: 'iPhone 5.5"', cornerRadius: 0.08 },
    'ipad-13': { width: 2064, height: 2752, name: 'iPad 13"', cornerRadius: 0.04 },
    'ipad-12.9': { width: 2048, height: 2732, name: 'iPad 12.9"', cornerRadius: 0.04 },
    'ipad-11': { width: 1668, height: 2388, name: 'iPad 11"', cornerRadius: 0.04 },
    'mac-1280': { width: 1280, height: 800, name: 'Mac 1280', cornerRadius: 0.02 },
    'mac-2880': { width: 2880, height: 1800, name: 'Mac 2880', cornerRadius: 0.02 },
    // Android - Google Play Store
    'android-phone-1080': { width: 1080, height: 1920, name: 'Phone FHD', cornerRadius: 0.06 },
    'android-phone-1440': { width: 1440, height: 2560, name: 'Phone QHD', cornerRadius: 0.06 },
    'android-tablet-7': { width: 1200, height: 1920, name: 'Tablet 7"', cornerRadius: 0.04 },
    'android-tablet-10': { width: 1600, height: 2560, name: 'Tablet 10"', cornerRadius: 0.04 }
};

// Font sizes: [title, body] for each size variant
App.FONT_SIZES = {
    'iphone': {
        small:  [90, 60],
        medium: [120, 72],
        large:  [132, 80]
    },
    'ipad': {
        small:  [112, 64],
        medium: [140, 80],
        large:  [168, 96]
    },
    'ipad-11': {
        small:  [88, 52],
        medium: [110, 64],
        large:  [132, 76]
    },
    'mac': {
        small:  [38, 22],
        medium: [48, 28],
        large:  [58, 34]
    },
    'mac-2880': {
        small:  [86, 50],
        medium: [108, 63],
        large:  [130, 76]
    },
    'android-phone': {
        small:  [72, 48],
        medium: [96, 58],
        large:  [108, 66]
    },
    'android-tablet': {
        small:  [100, 56],
        medium: [124, 70],
        large:  [148, 84]
    },
    'android-tablet-7': {
        small:  [80, 46],
        medium: [100, 58],
        large:  [120, 70]
    }
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
        screenshotScale: 0.88,
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
    // Title settings
    titleFont: 'sf-rounded',
    titleSize: 'medium',
    titleColor: '#ffffff',
    titleWeight: 'bold',
    // Body settings
    bodyFont: 'sf-rounded',
    bodySize: 'medium',
    bodyColor: '#ffffff',
    bodyWeight: 'medium',
    // Background settings
    bgColor: '#75B7E7',
    bgGradient: false,
    bgGradientColor: '#ffffff',
    bgGradientAngle: 180,
    // Device frame settings
    addDeviceFrame: true,
    deviceFrameColor: '#000000',
    // Other settings
    addShadow: true,
    preset: 'top',
    textAlign: 'center'
};

App.FONT_WEIGHTS = {
    'thin': { name: 'Thin', value: 100 },
    'regular': { name: 'Regular', value: 400 },
    'medium': { name: 'Medium', value: 500 },
    'semibold': { name: 'Semi-bold', value: 600 },
    'bold': { name: 'Bold', value: 700 }
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
        formats: ['mac-2880', 'mac-1280'],
        defaultExport: ['mac-2880']
    },
    'android-phone': {
        name: 'Phone',
        formats: ['android-phone-1080', 'android-phone-1440'],
        defaultExport: ['android-phone-1080']
    },
    'android-tablet': {
        name: 'Tablet',
        formats: ['android-tablet-7', 'android-tablet-10'],
        defaultExport: ['android-tablet-7']
    }
};
