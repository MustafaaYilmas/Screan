// ============================================
// Configuration & Constants
// ============================================

var App = window.App || {};

App.FORMATS = {
    'iphone': { width: 1242, height: 2688, name: 'iPhone 6.5"', cornerRadius: 0.10 },
    'ipad': { width: 2064, height: 2752, name: 'iPad 13"', cornerRadius: 0.04 },
    'mac': { width: 2880, height: 1800, name: 'Mac', cornerRadius: 0.02 },
    'android-phone': { width: 1080, height: 1920, name: 'Phone', cornerRadius: 0.06 },
    'android-tablet': { width: 1200, height: 1920, name: 'Tablet', cornerRadius: 0.04 }
};

// Legacy size name to pixel conversion (for migrating old data)
App.LEGACY_FONT_SIZES = {
    title: { small: 90, medium: 120, large: 132, xlarge: 160 },
    body:  { small: 60, medium: 72,  large: 80,  xlarge: 96 }
};

// Convert legacy named size to pixel value
App.migrateFontSize = function(size, target) {
    if (typeof size === 'number') return size;
    var map = App.LEGACY_FONT_SIZES[target];
    return (map && map[size]) || (target === 'title' ? 120 : 72);
};

App.FONTS = {
    // macOS system fonts
    'sf-pro': { name: 'SF Pro', family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif', os: 'mac' },
    'sf-rounded': { name: 'SF Rounded', family: 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, sans-serif', os: 'mac' },
    'sf-mono': { name: 'SF Mono', family: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, monospace', os: 'mac' },
    'new-york': { name: 'New York', family: 'ui-serif, "New York", Georgia, serif', os: 'mac' },
    // Windows system fonts
    'segoe-ui': { name: 'Segoe UI', family: '"Segoe UI", Tahoma, Geneva, sans-serif', os: 'windows' },
    'segoe-ui-semibold': { name: 'Segoe UI Semibold', family: '"Segoe UI Semibold", "Segoe UI", sans-serif', os: 'windows' },
    'consolas': { name: 'Consolas', family: 'Consolas, "Courier New", monospace', os: 'windows' },
    'cambria': { name: 'Cambria', family: 'Cambria, Georgia, serif', os: 'windows' },
    'calibri': { name: 'Calibri', family: 'Calibri, "Gill Sans", sans-serif', os: 'windows' },
    // Google Fonts — Sans-serif
    'inter': { name: 'Inter', family: 'Inter, sans-serif' },
    'roboto': { name: 'Roboto', family: 'Roboto, sans-serif' },
    'poppins': { name: 'Poppins', family: 'Poppins, sans-serif' },
    'montserrat': { name: 'Montserrat', family: 'Montserrat, sans-serif' },
    'dm-sans': { name: 'DM Sans', family: '"DM Sans", sans-serif' },
    'outfit': { name: 'Outfit', family: 'Outfit, sans-serif' },
    'raleway': { name: 'Raleway', family: 'Raleway, sans-serif' },
    'work-sans': { name: 'Work Sans', family: '"Work Sans", sans-serif' },
    'nunito-sans': { name: 'Nunito Sans', family: '"Nunito Sans", sans-serif' },
    // Google Fonts — Serif
    'ibm-plex-serif': { name: 'IBM Plex Serif', family: '"IBM Plex Serif", serif' },
    'bitter': { name: 'Bitter', family: 'Bitter, serif' }
};

// Detect user OS
App.IS_MAC = navigator.platform ? /Mac/.test(navigator.platform) : /Mac/.test(navigator.userAgent);
App.IS_WINDOWS = navigator.platform ? /Win/.test(navigator.platform) : /Win/.test(navigator.userAgent);

// Populate font <select> elements dynamically, filtering system fonts by OS
App.populateFontSelects = function() {
    var selects = [document.getElementById('titleFont'), document.getElementById('bodyFont')];
    var systemLabel = App.IS_WINDOWS ? 'Windows' : (App.IS_MAC ? 'macOS' : 'System');
    var osFilter = App.IS_WINDOWS ? 'windows' : 'mac';

    // Build groups
    var systemFonts = [];
    var sansFonts = [];
    var serifFonts = [];

    Object.keys(App.FONTS).forEach(function(key) {
        var font = App.FONTS[key];
        if (font.os) {
            if (font.os === osFilter) systemFonts.push({ key: key, name: font.name });
        } else if (font.family.indexOf('serif') !== -1 && font.family.indexOf('sans-serif') === -1) {
            serifFonts.push({ key: key, name: font.name });
        } else {
            sansFonts.push({ key: key, name: font.name });
        }
    });

    selects.forEach(function(select) {
        select.innerHTML = '';

        var systemGroup = document.createElement('optgroup');
        systemGroup.label = systemLabel;
        systemFonts.forEach(function(f) {
            var opt = document.createElement('option');
            opt.value = f.key;
            opt.textContent = f.name;
            systemGroup.appendChild(opt);
        });
        select.appendChild(systemGroup);

        var sansGroup = document.createElement('optgroup');
        sansGroup.label = 'Sans-serif';
        sansFonts.forEach(function(f) {
            var opt = document.createElement('option');
            opt.value = f.key;
            opt.textContent = f.name;
            sansGroup.appendChild(opt);
        });
        select.appendChild(sansGroup);

        var serifGroup = document.createElement('optgroup');
        serifGroup.label = 'Serif';
        serifFonts.forEach(function(f) {
            var opt = document.createElement('option');
            opt.value = f.key;
            opt.textContent = f.name;
            serifGroup.appendChild(opt);
        });
        select.appendChild(serifGroup);
    });
};

App.PRESETS = {
    'top': {
        screenshotY: { small: 0.18, medium: 0.24, large: 0.30, xlarge: 0.50 },
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
        screenshotY: { small: -0.06, medium: -0.12, large: -0.18, xlarge: -0.38 },
        textY: 0.82,
        screenshotScale: 0.88,
        cropTop: true
    }
};

// Available languages for content translation
App.LANGUAGES = {
    'ar': { name: 'العربية', flag: '🇸🇦' },
    'bg': { name: 'Български', flag: '🇧🇬' },
    'ca': { name: 'Català', flag: '🇪🇸' },
    'cs': { name: 'Čeština', flag: '🇨🇿' },
    'da': { name: 'Dansk', flag: '🇩🇰' },
    'de': { name: 'Deutsch', flag: '🇩🇪' },
    'el': { name: 'Ελληνικά', flag: '🇬🇷' },
    'en': { name: 'English', flag: '🇺🇸' },
    'es': { name: 'Español', flag: '🇪🇸' },
    'fi': { name: 'Suomi', flag: '🇫🇮' },
    'fr': { name: 'Français', flag: '🇫🇷' },
    'he': { name: 'עברית', flag: '🇮🇱' },
    'hi': { name: 'हिन्दी', flag: '🇮🇳' },
    'hr': { name: 'Hrvatski', flag: '🇭🇷' },
    'hu': { name: 'Magyar', flag: '🇭🇺' },
    'id': { name: 'Bahasa Indonesia', flag: '🇮🇩' },
    'it': { name: 'Italiano', flag: '🇮🇹' },
    'ja': { name: '日本語', flag: '🇯🇵' },
    'ko': { name: '한국어', flag: '🇰🇷' },
    'ms': { name: 'Bahasa Melayu', flag: '🇲🇾' },
    'nl': { name: 'Nederlands', flag: '🇳🇱' },
    'no': { name: 'Norsk', flag: '🇳🇴' },
    'pl': { name: 'Polski', flag: '🇵🇱' },
    'pt-BR': { name: 'Português (Brasil)', flag: '🇧🇷' },
    'ro': { name: 'Română', flag: '🇷🇴' },
    'ru': { name: 'Русский', flag: '🇷🇺' },
    'sk': { name: 'Slovenčina', flag: '🇸🇰' },
    'sv': { name: 'Svenska', flag: '🇸🇪' },
    'th': { name: 'ไทย', flag: '🇹🇭' },
    'tr': { name: 'Türkçe', flag: '🇹🇷' },
    'uk': { name: 'Українська', flag: '🇺🇦' },
    'vi': { name: 'Tiếng Việt', flag: '🇻🇳' },
    'zh-Hans': { name: '中文 (简体)', flag: '🇨🇳' },
    'zh-Hant': { name: '中文 (繁體)', flag: '🇹🇼' }
};

App.DEFAULT_SETTINGS = {
    // Content per language (languages list is stored at platform level)
    content: {
        'en': {
            headline: 'Keep it',
            subheadline: 'Simple'
        }
    },
    // Active content fields (synced with active language)
    headline: 'Keep it',
    subheadline: 'Simple',
    // Title settings
    titleFont: 'sf-rounded',
    titleSize: 65,
    titleColor: '#FF4013',
    titleWeight: 'semibold',
    titleUppercase: true,
    // Body settings
    bodyFont: 'sf-rounded',
    bodySize: 200,
    bodyColor: '#000000',
    bodyWeight: 'semibold',
    bodyUppercase: false,
    // Background settings
    bgColor: '#FFFFFF',
    bgGradient: true,
    bgGradientColor: '#DEDEDE',
    bgGradientAngle: 180,
    bgImage: null,
    bgImageOpacity: 100,
    // Pattern settings
    bgPattern: 'none',
    bgPatternColor: '#000000',
    bgPatternSize: 30,
    bgPatternOpacity: 20,
    // Device frame settings
    deviceFrameStyle: 'mockup',
    deviceModel: 'auto',
    deviceFrameColor: '#000000',
    // Text effects
    textShadow: false,
    textShadowColor: '#000000',
    textShadowBlur: 10,
    textShadowOffsetY: 5,
    textOutline: false,
    textOutlineColor: '#000000',
    textOutlineWidth: 3,
    textHighlight: false,
    textHighlightColor: '#000000',
    textHighlightOpacity: 30,
    // Other settings
    addShadow: true,
    hideScreenshot: false,
    preset: 'top',
    textAlign: 'center',
    textGap: 0,
    screenshotOffsetY: 0,
    screenshotZoom: 87
};

App.FONT_WEIGHTS = {
    'thin': { name: 'Thin', value: 100 },
    'regular': { name: 'Regular', value: 400 },
    'medium': { name: 'Medium', value: 500 },
    'semibold': { name: 'Semi-bold', value: 600 },
    'bold': { name: 'Bold', value: 700 }
};

// Spacing margins (percentage of canvas height) applied above and below the text block
App.SPACING_MARGINS = {
    small: 0.03,
    medium: 0.05,
    large: 0.08,
    xlarge: 0.25
};

// Spacing slider: maps 0-100 to interpolated values
// Snap points define the key positions on the slider
App.SPACING_SNAP_POINTS = [
    { value: 0,   key: 'small' },
    { value: 33,  key: 'medium' },
    { value: 67,  key: 'large' },
    { value: 100, key: 'xlarge' }
];

// Convert legacy named spacing to slider value
App.spacingToSliderValue = function(spacing) {
    if (typeof spacing === 'number') return spacing;
    var map = { small: 0, medium: 33, large: 67, xlarge: 100 };
    return map[spacing] !== undefined ? map[spacing] : 33;
};

// Interpolate a spacing value (0-100) into a margin ratio
App.getSpacingMargin = function(sliderValue) {
    var points = App.SPACING_SNAP_POINTS;
    var margins = App.SPACING_MARGINS;

    if (sliderValue <= points[0].value) return margins[points[0].key];
    if (sliderValue >= points[points.length - 1].value) return margins[points[points.length - 1].key];

    for (var i = 0; i < points.length - 1; i++) {
        if (sliderValue >= points[i].value && sliderValue <= points[i + 1].value) {
            var t = (sliderValue - points[i].value) / (points[i + 1].value - points[i].value);
            var a = margins[points[i].key];
            var b = margins[points[i + 1].key];
            return a + t * (b - a);
        }
    }
    return margins.medium;
};

// Interpolate screenshotY from a spacing slider value (0-100)
App.getSpacingScreenshotY = function(screenshotYObj, sliderValue) {
    if (typeof screenshotYObj !== 'object') return screenshotYObj;

    var points = App.SPACING_SNAP_POINTS;
    if (sliderValue <= points[0].value) return screenshotYObj[points[0].key];
    if (sliderValue >= points[points.length - 1].value) return screenshotYObj[points[points.length - 1].key];

    for (var i = 0; i < points.length - 1; i++) {
        if (sliderValue >= points[i].value && sliderValue <= points[i + 1].value) {
            var t = (sliderValue - points[i].value) / (points[i + 1].value - points[i].value);
            var a = screenshotYObj[points[i].key];
            var b = screenshotYObj[points[i + 1].key];
            return a + t * (b - a);
        }
    }
    return screenshotYObj.medium;
};

App.PLATFORM_FAMILIES = {
    'iphone': { name: 'iPhone', section: 'appStore' },
    'ipad': { name: 'iPad', section: 'appStore' },
    'mac': { name: 'Mac', section: 'appStore' },
    'android-phone': { name: 'Phone', section: 'googlePlay' },
    'android-tablet': { name: 'Tablet', section: 'googlePlay' }
};
