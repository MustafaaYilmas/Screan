// ============================================
// Application State
// ============================================

var App = window.App || {};

App.state = {
    activePlatform: 'iphone',
    // Global language settings (shared across all platforms)
    languages: ['en'],
    activeLanguage: 'en',
    platforms: {
        'iphone': {
            screenshots: [],
            activeIndex: 0,
            exportFormats: ['iphone-6.9', 'iphone-6.5']
        },
        'ipad': {
            screenshots: [],
            activeIndex: 0,
            exportFormats: ['ipad-13']
        },
        'mac': {
            screenshots: [],
            activeIndex: 0,
            exportFormats: ['mac-2880']
        },
        'android-phone': {
            screenshots: [],
            activeIndex: 0,
            exportFormats: ['android-phone-1080']
        },
        'android-tablet': {
            screenshots: [],
            activeIndex: 0,
            exportFormats: ['android-tablet-7']
        }
    }
};

App.currentFormat = 'iphone-6.9';

App.setCurrentFormat = function(format) {
    App.currentFormat = format;
};

App.getActivePlatformData = function() {
    return App.state.platforms[App.state.activePlatform];
};

App.getActiveScreenshots = function() {
    return App.getActivePlatformData().screenshots;
};

App.getActiveIndex = function() {
    return App.getActivePlatformData().activeIndex;
};

App.setActiveIndex = function(index) {
    App.getActivePlatformData().activeIndex = index;
};

App.getActiveSettings = function() {
    var screenshots = App.getActiveScreenshots();
    var index = App.getActiveIndex();
    var screenshot = screenshots[index];
    return screenshot ? screenshot.settings : App.DEFAULT_SETTINGS;
};

App.updateExportButton = function() {
    var hasAnyExportable = false;

    Object.keys(App.state.platforms).forEach(function(platformKey) {
        var platform = App.state.platforms[platformKey];
        if (platform.screenshots.length > 0 && platform.exportFormats.length > 0) {
            hasAnyExportable = true;
        }
    });

    document.getElementById('exportBtn').disabled = !hasAnyExportable;
};

App.updateSidebarCounts = function() {
    Object.keys(App.state.platforms).forEach(function(platformKey) {
        var count = App.state.platforms[platformKey].screenshots.length;
        var badge = document.querySelector('[data-platform="' + platformKey + '"] .screenshot-count');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    });
};

App.selectPlatform = function(platformKey) {
    App.state.activePlatform = platformKey;

    // Update UI active states
    document.querySelectorAll('.platform-item').forEach(function(item) {
        item.classList.toggle('active', item.dataset.platform === platformKey);
    });

    // Update format dropdown for active platform
    App.updateFormatDropdown();

    // Update empty state text
    App.updateEmptyStateText();

    // Update settings UI and render
    App.updateSettingsUI();
    App.renderAllPreviews();
    App.Storage.scheduleSave();
};

App.updateEmptyStateText = function() {
    var family = App.PLATFORM_FAMILIES[App.state.activePlatform];
    var text = document.getElementById('emptyStateText');
    if (text) {
        text.textContent = 'Drag & drop ' + family.name + ' screenshots here';
    }
};

// Generate sidebar platforms from PLATFORM_FAMILIES config
App.initSidebarPlatforms = function() {
    var appStoreSection = document.getElementById('appStoreSection');
    var googlePlaySection = document.getElementById('googlePlaySection');

    Object.keys(App.PLATFORM_FAMILIES).forEach(function(platformKey) {
        var family = App.PLATFORM_FAMILIES[platformKey];
        var section = family.section === 'appStore' ? appStoreSection : googlePlaySection;
        var isFirst = platformKey === 'iphone';

        // Create platform item
        var platformItem = document.createElement('div');
        platformItem.className = 'platform-item' + (isFirst ? ' active' : '');
        platformItem.setAttribute('data-platform', platformKey);

        // Create header
        var header = document.createElement('div');
        header.className = 'platform-header';
        header.innerHTML = '<span class="platform-name">' + family.name + '</span>' +
            '<span class="screenshot-count" style="display: none;">0</span>';

        // Create sizes container
        var sizesContainer = document.createElement('div');
        sizesContainer.className = 'platform-sizes';

        // Create checkboxes for each format
        family.formats.forEach(function(formatKey) {
            var format = App.FORMATS[formatKey];
            var isDefault = family.defaultExport.indexOf(formatKey) !== -1;

            // Extract display name (remove prefix like "iPhone ", "iPad ", etc.)
            var displayName = format.name.replace(/^(iPhone|iPad|Mac|Phone|Tablet)\s*/i, '');

            var label = document.createElement('label');
            label.className = 'size-item';

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.setAttribute('data-platform', platformKey);
            checkbox.setAttribute('data-format', formatKey);
            if (isDefault) checkbox.checked = true;

            var span = document.createElement('span');
            span.textContent = displayName;

            label.appendChild(checkbox);
            label.appendChild(span);
            sizesContainer.appendChild(label);
        });

        platformItem.appendChild(header);
        platformItem.appendChild(sizesContainer);
        section.appendChild(platformItem);
    });
};

App.updateFormatDropdown = function() {
    var select = document.getElementById('formatSelect');
    var family = App.PLATFORM_FAMILIES[App.state.activePlatform];

    select.innerHTML = '';
    family.formats.forEach(function(formatKey) {
        var format = App.FORMATS[formatKey];
        var option = document.createElement('option');
        option.value = formatKey;
        option.textContent = format.name;
        select.appendChild(option);
    });

    // Set current format to first of this platform
    App.setCurrentFormat(family.formats[0]);
    select.value = family.formats[0];
};
