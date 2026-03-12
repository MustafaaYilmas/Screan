// ============================================
// Localization Management
// ============================================

var App = window.App || {};

// Initialize language-related events
App.initLanguageEvents = function() {
    var previewLanguageSelect = document.getElementById('previewLanguageSelect');
    var activeContainer = document.getElementById('activeLanguages');

    // Delegation on active language items
    if (activeContainer) {
        activeContainer.addEventListener('click', function(e) {
            // Check if remove button was clicked
            var removeBtn = e.target.closest('.remove-lang');
            if (removeBtn) {
                App.removeLanguage(removeBtn.dataset.lang);
                return;
            }

            // Check if a language item was clicked
            var item = e.target.closest('.language-item');
            if (!item) return;

            App.switchLanguage(item.dataset.lang);
        });
    }

    // Add language button
    var addLangBtn = document.getElementById('addLangBtn');
    var availableSelect = document.getElementById('availableLanguagesSelect');
    if (addLangBtn) {
        addLangBtn.addEventListener('click', function() {
            // Require API key before adding a language
            if (!App.hasApiKey()) {
                App.toggleApiKeySection(true);
                var apiKeyInput = document.getElementById('apiKeyInput');
                if (apiKeyInput) apiKeyInput.focus();
                return;
            }

            if (availableSelect && availableSelect.value) {
                App.addLanguage(availableSelect.value);
            }
        });
    }

    // Add all languages button
    var addAllLangsBtn = document.getElementById('addAllLangsBtn');
    if (addAllLangsBtn) {
        addAllLangsBtn.addEventListener('click', function() {
            if (!App.hasApiKey()) {
                App.toggleApiKeySection(true);
                var apiKeyInput = document.getElementById('apiKeyInput');
                if (apiKeyInput) apiKeyInput.focus();
                return;
            }

            App.addAllLanguages();
        });
    }

    // Preview language select change - switch language (synced)
    if (previewLanguageSelect) {
        previewLanguageSelect.addEventListener('change', function(e) {
            App.switchLanguage(e.target.value);
        });
    }
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

// Add all remaining languages and translate them sequentially
App.addAllLanguages = function() {
    var languages = App.state.languages || ['en'];
    var allLangCodes = Object.keys(App.LANGUAGES);
    var remaining = allLangCodes.filter(function(code) {
        return languages.indexOf(code) === -1;
    });

    if (remaining.length === 0) return;

    // Add all languages to state first (without triggering auto-translate)
    var sourceLang = 'en';
    if (languages.indexOf('en') === -1) {
        sourceLang = languages[0];
    }
    var activeLang = App.state.activeLanguage || 'en';

    remaining.forEach(function(langCode) {
        if (App.state.languages.indexOf(langCode) !== -1) return;
        App.state.languages.push(langCode);

        // Initialize content for this language in all screenshots
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
    });

    App.updateLanguageSelect();
    App.Storage.scheduleSave();

    // Now translate sequentially if API key exists
    if (!App.hasApiKey()) return;

    // Collect content to translate (once)
    var contentToTranslate = [];
    Object.keys(App.state.platforms).forEach(function(platformKey) {
        var screenshots = App.state.platforms[platformKey].screenshots;
        screenshots.forEach(function(screenshot, index) {
            var content = screenshot.settings.content && screenshot.settings.content[sourceLang];
            var headline = content ? content.headline : screenshot.settings.headline;
            var subheadline = content ? content.subheadline : screenshot.settings.subheadline;
            if (headline || subheadline) {
                contentToTranslate.push({
                    platform: platformKey,
                    index: index,
                    headline: headline || '',
                    subheadline: subheadline || ''
                });
            }
        });
    });

    if (contentToTranslate.length === 0) return;

    var translateBtn = document.getElementById('translateAllBtn');
    var addAllBtn = document.getElementById('addAllLangsBtn');
    if (translateBtn) translateBtn.classList.add('loading');
    if (addAllBtn) addAllBtn.disabled = true;

    // Translate all remaining languages in one batch call
    var apiKey = App.getApiKey();
    App.performBatchTranslation(contentToTranslate, sourceLang, remaining, apiKey)
        .then(function() {
            if (translateBtn) translateBtn.classList.remove('loading');
            if (addAllBtn) addAllBtn.disabled = false;
            App.state._translationDirty = false;
            App.updateSettingsUI();
            App.renderAllCanvases();
            App.Storage.scheduleSave();
            App.updateTranslateFooterVisibility();
            App.updateLanguageSelect();
        })
        .catch(function(error) {
            if (translateBtn) translateBtn.classList.remove('loading');
            if (addAllBtn) addAllBtn.disabled = false;
            console.error('Batch translation error:', error);
            alert('Translation failed: ' + (error.message || 'Unknown error'));
        });
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
    App.renderAllCanvases();
    App.Storage.scheduleSave();
};

// Update the language chips UI and preview select
App.updateLanguageSelect = function() {
    var activeContainer = document.getElementById('activeLanguages');
    var previewSelect = document.getElementById('previewLanguageSelect');
    var hiddenSelect = document.getElementById('languageSelect');

    var languages = App.state.languages || ['en'];
    var activeLang = App.state.activeLanguage || 'en';

    // Build active language list
    if (activeContainer) {
        activeContainer.innerHTML = '';
        languages.forEach(function(langCode) {
            var lang = App.LANGUAGES[langCode];
            if (!lang) return;

            var canRemove = langCode !== 'en' && languages.length > 1;

            var row = document.createElement('div');
            row.className = 'setting-row';

            var item = document.createElement('div');
            item.className = 'language-item' + (langCode === activeLang ? ' active' : '');
            item.dataset.lang = langCode;
            item.innerHTML = '<span class="chip-name">' + lang.name + '</span>';
            row.appendChild(item);

            if (canRemove) {
                var removeBtn = document.createElement('button');
                removeBtn.className = 'remove-lang icon-btn';
                removeBtn.title = 'Remove';
                removeBtn.dataset.lang = langCode;
                removeBtn.innerHTML = '<i data-lucide="trash-2"></i>';
                row.appendChild(removeBtn);
            }

            activeContainer.appendChild(row);
        });
    }

    // Build available language select
    var availableSelect = document.getElementById('availableLanguagesSelect');
    var addLangBtn = document.getElementById('addLangBtn');
    var addLanguageSection = document.getElementById('addLanguageSection');
    if (availableSelect) {
        availableSelect.innerHTML = '';
        var availableLanguages = Object.keys(App.LANGUAGES).filter(function(langCode) {
            return languages.indexOf(langCode) === -1;
        });
        var hasKey = App.hasApiKey && App.hasApiKey();

        if (availableLanguages.length === 0) {
            // Hide the entire section when all languages are added
            if (addLanguageSection) addLanguageSection.style.display = 'none';
        } else {
            if (addLanguageSection) addLanguageSection.style.display = '';
            availableLanguages.forEach(function(langCode) {
                var lang = App.LANGUAGES[langCode];
                var option = document.createElement('option');
                option.value = langCode;
                option.textContent = lang.name;
                availableSelect.appendChild(option);
            });

            // Disable if no API key
            availableSelect.disabled = !hasKey;
            if (addLangBtn) {
                addLangBtn.disabled = !hasKey;
            }
        }
    }

    // Re-initialize Lucide icons for dynamically added elements
    if (typeof lucide !== 'undefined') {
        var iconElements = activeContainer ? Array.from(activeContainer.querySelectorAll('i[data-lucide]')) : [];
        if (iconElements.length > 0) {
            lucide.createIcons({ nodes: iconElements });
        }
    }

    // Sync preview select (toolbar)
    if (previewSelect) {
        previewSelect.innerHTML = '';
        languages.forEach(function(langCode) {
            var lang = App.LANGUAGES[langCode];
            if (!lang) return;
            var option = document.createElement('option');
            option.value = langCode;
            option.textContent = lang.name;
            previewSelect.appendChild(option);
        });
        previewSelect.value = activeLang;

        if (languages.length <= 1) {
            previewSelect.classList.add('single-language');
        } else {
            previewSelect.classList.remove('single-language');
        }
    }

    // Sync hidden select (for backwards compatibility)
    if (hiddenSelect) {
        hiddenSelect.innerHTML = '';
        languages.forEach(function(langCode) {
            var lang = App.LANGUAGES[langCode];
            if (!lang) return;
            var option = document.createElement('option');
            option.value = langCode;
            option.textContent = lang.name;
            hiddenSelect.appendChild(option);
        });
        hiddenSelect.value = activeLang;
    }

    // Update translate button state (delegated to AI module)
    if (typeof App.updateTranslateButtonState === 'function') {
        App.updateTranslateButtonState();
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
// If another platform already has content at the same index, copy it
App.initializeScreenshotContent = function(settings) {
    settings.content = {};

    // Chercher du contenu existant sur une autre plateforme au même index
    var activePlatform = App.state.activePlatform;
    var activeScreenshots = App.getActiveScreenshots();
    var newIndex = activeScreenshots.length; // index que le nouveau screenshot aura
    var existingContent = null;

    Object.keys(App.state.platforms).forEach(function(platformKey) {
        if (existingContent) return;
        if (platformKey === activePlatform) return;
        var screenshots = App.state.platforms[platformKey].screenshots;
        if (newIndex < screenshots.length && screenshots[newIndex].settings.content) {
            existingContent = screenshots[newIndex].settings.content;
        }
    });

    var languages = App.state.languages || ['en'];
    if (existingContent) {
        // Copier le contenu de l'autre plateforme
        languages.forEach(function(langCode) {
            var src = existingContent[langCode];
            settings.content[langCode] = {
                headline: src ? (src.headline || '') : '',
                subheadline: src ? (src.subheadline || '') : ''
            };
        });
    } else {
        // Texte par défaut
        languages.forEach(function(langCode) {
            settings.content[langCode] = {
                headline: App.DEFAULT_SETTINGS.content.en.headline,
                subheadline: App.DEFAULT_SETTINGS.content.en.subheadline
            };
        });
    }

    // Set active content from active language
    var activeLang = App.state.activeLanguage || 'en';
    if (settings.content[activeLang]) {
        settings.headline = settings.content[activeLang].headline;
        settings.subheadline = settings.content[activeLang].subheadline;
    }
};
