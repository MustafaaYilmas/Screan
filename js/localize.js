// ============================================
// Localization Management
// ============================================

var App = window.App || {};

// Initialize language-related events
App.initLanguageEvents = function() {
    var removeBtn = document.getElementById('removeLanguageBtn');
    var languageSelect = document.getElementById('languageSelect');
    var previewLanguageSelect = document.getElementById('previewLanguageSelect');

    // Language select change - switch or add language
    languageSelect.addEventListener('change', function(e) {
        var value = e.target.value;

        // Check if it's a new language to add (prefixed with "add:")
        if (value.indexOf('add:') === 0) {
            var langCode = value.substring(4);
            App.addLanguage(langCode);
        } else {
            App.switchLanguage(value);
        }
    });

    // Preview language select change - switch language (synced)
    previewLanguageSelect.addEventListener('change', function(e) {
        App.switchLanguage(e.target.value);
    });

    // Remove language button
    removeBtn.addEventListener('click', function() {
        if (App.state.activeLanguage) {
            App.removeLanguage(App.state.activeLanguage);
        }
    });
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

    // Auto-translate if API key is configured
    if (App.hasApiKey && App.hasApiKey()) {
        App.autoTranslateNewLanguage(langCode);
    }
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
    var previousLang = App.state.activeLanguage || 'en';

    // Save current content for ALL screenshots before switching
    Object.keys(App.state.platforms).forEach(function(platformKey) {
        var screenshots = App.state.platforms[platformKey].screenshots;
        screenshots.forEach(function(screenshot) {
            if (screenshot.settings && previousLang) {
                if (!screenshot.settings.content) {
                    screenshot.settings.content = {};
                }
                screenshot.settings.content[previousLang] = {
                    headline: screenshot.settings.headline,
                    subheadline: screenshot.settings.subheadline
                };
            }
        });
    });

    // Switch language globally
    App.state.activeLanguage = langCode;

    // Load content for this language in ALL screenshots
    Object.keys(App.state.platforms).forEach(function(platformKey) {
        var screenshots = App.state.platforms[platformKey].screenshots;
        screenshots.forEach(function(screenshot) {
            if (screenshot.settings && screenshot.settings.content && screenshot.settings.content[langCode]) {
                screenshot.settings.headline = screenshot.settings.content[langCode].headline;
                screenshot.settings.subheadline = screenshot.settings.content[langCode].subheadline;
            }
        });
    });

    // Update UI
    App.updateLanguageSelect();
    App.updateSettingsUI();
    App.renderAllPreviews();
    App.Storage.scheduleSave();
};

// Update the language select dropdown
App.updateLanguageSelect = function() {
    var select = document.getElementById('languageSelect');
    var previewSelect = document.getElementById('previewLanguageSelect');
    var removeBtn = document.getElementById('removeLanguageBtn');
    if (!select) return;

    var languages = App.state.languages || ['en'];
    var activeLang = App.state.activeLanguage || 'en';

    // Clear and rebuild options for both selects
    select.innerHTML = '';
    if (previewSelect) previewSelect.innerHTML = '';

    // Add active languages
    languages.forEach(function(langCode) {
        var lang = App.LANGUAGES[langCode];
        if (!lang) return;

        var option = document.createElement('option');
        option.value = langCode;
        option.textContent = lang.name;
        select.appendChild(option);

        // Clone for preview select
        if (previewSelect) {
            var previewOption = document.createElement('option');
            previewOption.value = langCode;
            previewOption.textContent = lang.name;
            previewSelect.appendChild(previewOption);
        }
    });

    // Get available languages to add
    var availableLanguages = Object.keys(App.LANGUAGES).filter(function(langCode) {
        return languages.indexOf(langCode) === -1;
    });

    // Add separator and available languages if there are any
    if (availableLanguages.length > 0) {
        var separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '── Add language ──';
        select.appendChild(separator);

        availableLanguages.forEach(function(langCode) {
            var lang = App.LANGUAGES[langCode];
            var option = document.createElement('option');
            option.value = 'add:' + langCode;
            option.textContent = '+ ' + lang.name;
            select.appendChild(option);
        });
    }

    // Set the selected value on both selects
    select.value = activeLang;
    if (previewSelect) {
        previewSelect.value = activeLang;
    }

    // Update remove button state (can't remove English or if only one language)
    if (removeBtn) {
        removeBtn.disabled = activeLang === 'en' || languages.length <= 1;
    }

    // Update translate button state (delegated to AI module)
    if (typeof App.updateTranslateButtonState === 'function') {
        App.updateTranslateButtonState();
    }

    // Show/hide preview language select based on number of languages
    if (previewSelect) {
        if (languages.length <= 1) {
            previewSelect.classList.add('single-language');
        } else {
            previewSelect.classList.remove('single-language');
        }
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
