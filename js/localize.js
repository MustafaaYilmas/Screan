// ============================================
// Localization Management
// ============================================

var App = window.App || {};

// Initialize language-related events
App.initLanguageEvents = function() {
    var addBtn = document.getElementById('addLanguageBtn');
    var removeBtn = document.getElementById('removeLanguageBtn');
    var dropdown = document.getElementById('languageDropdown');
    var languageSelect = document.getElementById('languageSelect');

    // Language select change - switch language
    languageSelect.addEventListener('change', function(e) {
        App.switchLanguage(e.target.value);
    });

    // Add language button - toggle dropdown
    addBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        App.populateLanguageDropdown();
        dropdown.classList.toggle('open');
    });

    // Remove language button
    removeBtn.addEventListener('click', function() {
        if (App.state.activeLanguage) {
            App.removeLanguage(App.state.activeLanguage);
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target) && !addBtn.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
};

// Populate the language dropdown with available languages (for adding)
App.populateLanguageDropdown = function() {
    var dropdownContent = document.querySelector('.language-dropdown-content');
    dropdownContent.innerHTML = '';

    var currentLangs = App.state.languages || ['en'];

    Object.keys(App.LANGUAGES).forEach(function(langCode) {
        var lang = App.LANGUAGES[langCode];
        var isAdded = currentLangs.indexOf(langCode) !== -1;

        var option = document.createElement('button');
        option.className = 'language-option' + (isAdded ? ' added' : '');
        option.dataset.lang = langCode;
        option.innerHTML = '<span class="lang-name">' + lang.name + '</span>' +
            (isAdded ? '<span class="lang-check"><i data-lucide="check"></i></span>' : '');

        if (!isAdded) {
            option.addEventListener('click', function() {
                App.addLanguage(langCode);
                document.getElementById('languageDropdown').classList.remove('open');
            });
        }

        dropdownContent.appendChild(option);
    });

    // Refresh lucide icons
    lucide.createIcons();
};

// Add a new language (global, affects all screenshots across all platforms)
App.addLanguage = function(langCode) {
    // Initialize language arrays if needed
    if (!App.state.languages) {
        App.state.languages = ['en'];
    }

    // Add the language if not already present
    if (App.state.languages.indexOf(langCode) === -1) {
        App.state.languages.push(langCode);

        // Initialize content for this language in ALL screenshots across ALL platforms
        var activeLang = App.state.activeLanguage || 'en';

        Object.keys(App.state.platforms).forEach(function(platformKey) {
            var screenshots = App.state.platforms[platformKey].screenshots;
            screenshots.forEach(function(screenshot) {
                if (!screenshot.settings.content) {
                    screenshot.settings.content = {
                        'en': {
                            headline: screenshot.settings.headline || App.DEFAULT_SETTINGS.content.en.headline,
                            subheadline: screenshot.settings.subheadline || App.DEFAULT_SETTINGS.content.en.subheadline
                        }
                    };
                }

                // Copy content from current language
                var sourceContent = screenshot.settings.content[activeLang] || screenshot.settings.content['en'] || {
                    headline: screenshot.settings.headline,
                    subheadline: screenshot.settings.subheadline
                };

                screenshot.settings.content[langCode] = {
                    headline: sourceContent.headline,
                    subheadline: sourceContent.subheadline
                };
            });
        });
    }

    // Switch to the new language
    App.switchLanguage(langCode);
    App.updateLanguageSelect();
    App.Storage.scheduleSave();
};

// Remove a language (global, affects all screenshots across all platforms)
App.removeLanguage = function(langCode) {
    if (!App.state.languages) return;

    // Can't remove the last language
    if (App.state.languages.length <= 1) return;

    // Can't remove English (base language)
    if (langCode === 'en') return;

    var index = App.state.languages.indexOf(langCode);
    if (index !== -1) {
        App.state.languages.splice(index, 1);

        // Remove content for this language from ALL screenshots across ALL platforms
        Object.keys(App.state.platforms).forEach(function(platformKey) {
            App.state.platforms[platformKey].screenshots.forEach(function(screenshot) {
                if (screenshot.settings.content && screenshot.settings.content[langCode]) {
                    delete screenshot.settings.content[langCode];
                }
            });
        });

        // If we removed the active language, switch to first available
        if (App.state.activeLanguage === langCode) {
            App.switchLanguage(App.state.languages[0]);
        }
    }

    App.updateLanguageSelect();
    App.Storage.scheduleSave();
};

// Switch to a different language (global)
App.switchLanguage = function(langCode) {
    // Save current content for current screenshot before switching
    var currentSettings = App.getActiveSettings();
    if (currentSettings && App.state.activeLanguage && currentSettings.content) {
        currentSettings.content[App.state.activeLanguage] = {
            headline: currentSettings.headline,
            subheadline: currentSettings.subheadline
        };
    }

    // Switch language globally
    App.state.activeLanguage = langCode;

    // Load content for this language in current screenshot
    if (currentSettings && currentSettings.content && currentSettings.content[langCode]) {
        currentSettings.headline = currentSettings.content[langCode].headline;
        currentSettings.subheadline = currentSettings.content[langCode].subheadline;
    }

    // Update UI
    App.updateLanguageSelect();
    App.updateSettingsUI();
    App.scheduleRender();
    App.Storage.scheduleSave();
};

// Update the language select dropdown
App.updateLanguageSelect = function() {
    var select = document.getElementById('languageSelect');
    var removeBtn = document.getElementById('removeLanguageBtn');
    if (!select) return;

    var languages = App.state.languages || ['en'];
    var activeLang = App.state.activeLanguage || 'en';

    // Clear and rebuild options
    select.innerHTML = '';

    languages.forEach(function(langCode) {
        var lang = App.LANGUAGES[langCode];
        if (!lang) return;

        var option = document.createElement('option');
        option.value = langCode;
        option.textContent = lang.name;
        if (langCode === activeLang) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    // Update remove button state (can't remove English or if only one language)
    if (removeBtn) {
        removeBtn.disabled = activeLang === 'en' || languages.length <= 1;
    }

    // Update translate button state
    var translateBtn = document.getElementById('translateAllBtn');
    if (translateBtn) {
        // Enable if there are multiple languages (will be fully functional later with AI)
        translateBtn.disabled = true; // Always disabled for now
    }
};

// Alias for backwards compatibility
App.updateLanguageTabs = App.updateLanguageSelect;

// Get content for a specific language from screenshot settings
App.getLocalizedContent = function(settings, langCode) {
    var headline = settings.headline;
    var subheadline = settings.subheadline;

    if (langCode && settings.content && settings.content[langCode]) {
        headline = settings.content[langCode].headline;
        subheadline = settings.content[langCode].subheadline;
    }

    return { headline: headline, subheadline: subheadline };
};

// Save current content to the active language
App.saveContentToActiveLanguage = function(settings) {
    var activeLang = App.state.activeLanguage || 'en';
    if (settings && settings.content) {
        if (!settings.content[activeLang]) {
            settings.content[activeLang] = {};
        }
        settings.content[activeLang].headline = settings.headline;
        settings.content[activeLang].subheadline = settings.subheadline;
    }
};

// Load content from a specific language
App.loadContentFromLanguage = function(settings, langCode) {
    if (settings && settings.content && settings.content[langCode]) {
        settings.headline = settings.content[langCode].headline;
        settings.subheadline = settings.content[langCode].subheadline;
    }
};

// Initialize content for all languages when adding a new screenshot
App.initializeScreenshotContent = function(settings) {
    settings.content = {};

    var languages = App.state.languages || ['en'];
    languages.forEach(function(langCode) {
        settings.content[langCode] = {
            headline: App.DEFAULT_SETTINGS.content.en.headline,
            subheadline: App.DEFAULT_SETTINGS.content.en.subheadline
        };
    });

    // Set active content from active language
    var activeLang = App.state.activeLanguage || 'en';
    if (settings.content[activeLang]) {
        settings.headline = settings.content[activeLang].headline;
        settings.subheadline = settings.content[activeLang].subheadline;
    }
};
