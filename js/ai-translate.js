// ============================================
// AI Translation Management
// ============================================

var App = window.App || {};

// API Key storage key
App.AI_API_KEY_STORAGE = 'screan-claude-api-key';

// Get stored API key
App.getApiKey = function() {
    return localStorage.getItem(App.AI_API_KEY_STORAGE) || '';
};

// Save API key
App.saveApiKey = function(key) {
    if (key && key.trim()) {
        localStorage.setItem(App.AI_API_KEY_STORAGE, key.trim());
    } else {
        localStorage.removeItem(App.AI_API_KEY_STORAGE);
    }
    App.updateApiKeyRowVisibility();
    App.updateTranslateButtonState();
};

// Check if API key is configured
App.hasApiKey = function() {
    return !!App.getApiKey();
};

// Update API key row visibility
App.updateApiKeyRowVisibility = function() {
    var apiKeyRow = document.getElementById('apiKeyRow');
    if (!apiKeyRow) return;

    var activeLang = App.state.activeLanguage || 'en';
    var isNotEnglish = activeLang !== 'en';

    // Show API key row when we're not on English
    apiKeyRow.style.display = isNotEnglish ? 'flex' : 'none';

    // Refresh lucide icons if visible
    if (isNotEnglish) {
        lucide.createIcons();
    }
};

// Update translate button state based on API key and languages
App.updateTranslateButtonState = function() {
    var translateBtn = document.getElementById('translateAllBtn');
    var removeBtn = document.getElementById('removeLanguageBtn');

    var activeLang = App.state.activeLanguage || 'en';
    var isNotEnglish = activeLang !== 'en';
    var hasScreenshots = App.getActiveScreenshots().length > 0;
    var hasKey = App.hasApiKey();

    // Enable/disable translate button based on language and screenshots
    if (translateBtn) {
        translateBtn.disabled = !isNotEnglish || !hasScreenshots;

        // Update tooltip
        var targetLangName = App.LANGUAGES[activeLang] ? App.LANGUAGES[activeLang].name : activeLang;
        if (!isNotEnglish) {
            translateBtn.title = 'Select a language to translate';
        } else if (!hasScreenshots) {
            translateBtn.title = 'Add screenshots first';
        } else if (!hasKey) {
            translateBtn.title = 'Configure API key to translate';
        } else {
            translateBtn.title = 'Translate to ' + targetLangName;
        }
    }

    // Enable/disable remove button based on language
    if (removeBtn) {
        removeBtn.disabled = !isNotEnglish;
    }

    // Update API key row visibility
    App.updateApiKeyRowVisibility();
};

// Initialize AI translation events
App.initAITranslateEvents = function() {
    var translateBtn = document.getElementById('translateAllBtn');
    var apiKeyInput = document.getElementById('apiKeyInput');
    var apiKeyRow = document.getElementById('apiKeyRow');
    var apiKeyToggle = document.getElementById('apiKeyToggle');

    // Load saved API key and show row if exists
    if (apiKeyInput) {
        var savedKey = App.getApiKey();
        if (savedKey) {
            apiKeyInput.value = savedKey;
        }
    }

    // API key input change - auto-save
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', function() {
            var key = apiKeyInput.value.trim();
            App.saveApiKey(key);
        });

        // Also save on blur
        apiKeyInput.addEventListener('blur', function() {
            var key = apiKeyInput.value.trim();
            App.saveApiKey(key);
        });
    }

    // API key toggle visibility
    if (apiKeyToggle && apiKeyInput) {
        apiKeyToggle.addEventListener('click', function() {
            var isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            apiKeyToggle.classList.toggle('visible', isPassword);
        });
    }

    // Translate button click
    if (translateBtn) {
        translateBtn.addEventListener('click', function() {
            if (translateBtn.disabled) return;

            // If no API key, focus the input field
            if (!App.hasApiKey()) {
                if (apiKeyInput) {
                    apiKeyInput.focus();
                }
                return;
            }

            // Otherwise, translate
            App.translateAllScreenshots();
        });
    }

    // Initial state update
    App.updateApiKeyRowVisibility();
    App.updateTranslateButtonState();
};

// Translate all screenshots from English to the currently selected language
App.translateAllScreenshots = function() {
    var apiKey = App.getApiKey();
    if (!apiKey) {
        return;
    }

    var targetLang = App.state.activeLanguage || 'en';
    var sourceLang = 'en'; // Always translate from English

    if (targetLang === 'en') {
        return;
    }

    // Collect all content to translate (from English source)
    var contentToTranslate = [];

    Object.keys(App.state.platforms).forEach(function(platformKey) {
        var screenshots = App.state.platforms[platformKey].screenshots;
        screenshots.forEach(function(screenshot, index) {
            var content = screenshot.settings.content[sourceLang];
            if (content && (content.headline || content.subheadline)) {
                contentToTranslate.push({
                    platform: platformKey,
                    index: index,
                    headline: content.headline || '',
                    subheadline: content.subheadline || ''
                });
            }
        });
    });

    if (contentToTranslate.length === 0) {
        alert('No English content to translate. Add text to your screenshots first.');
        return;
    }

    // Show loading state on button
    var translateBtn = document.getElementById('translateAllBtn');
    if (translateBtn) {
        translateBtn.classList.add('loading');
    }

    // Perform translation
    App.performBatchTranslation(contentToTranslate, sourceLang, [targetLang], apiKey)
        .then(function() {
            if (translateBtn) {
                translateBtn.classList.remove('loading');
            }
            // Load the translated content into all screenshots' active fields
            Object.keys(App.state.platforms).forEach(function(platformKey) {
                var screenshots = App.state.platforms[platformKey].screenshots;
                screenshots.forEach(function(screenshot) {
                    if (screenshot.settings.content && screenshot.settings.content[targetLang]) {
                        screenshot.settings.headline = screenshot.settings.content[targetLang].headline;
                        screenshot.settings.subheadline = screenshot.settings.content[targetLang].subheadline;
                    }
                });
            });
            App.updateSettingsUI();
            App.renderAllPreviews();
            App.Storage.scheduleSave();
        })
        .catch(function(error) {
            if (translateBtn) {
                translateBtn.classList.remove('loading');
            }
            console.error('Translation error:', error);
            alert('Translation failed: ' + (error.message || 'Unknown error'));
        });
};

// Perform batch translation via Claude API
App.performBatchTranslation = function(contentList, sourceLang, targetLangs, apiKey) {
    // Build the prompt for translation
    var targetLanguageNames = targetLangs.map(function(lang) {
        return App.LANGUAGES[lang] ? App.LANGUAGES[lang].name : lang;
    });

    // Prepare content for translation
    var textsToTranslate = contentList.map(function(item, idx) {
        return {
            id: idx,
            headline: item.headline,
            subheadline: item.subheadline
        };
    });

    var prompt = 'Translate the following app store screenshot texts to ' + targetLanguageNames.join(', ') + '.\n\n' +
        'Auto-detect the source language. These are marketing texts for an app store listing.\n\n' +
        'IMPORTANT: Keep translations approximately the same length as the source text (similar character count). This is critical for layout consistency.\n\n' +
        'Keep them concise, catchy, and appropriate for app store screenshots.\n\n' +
        'Input (JSON):\n' + JSON.stringify(textsToTranslate, null, 2) + '\n\n' +
        'Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):\n' +
        '{\n' +
        '  "translations": {\n' +
        '    "' + targetLangs[0] + '": [\n' +
        '      { "id": 0, "headline": "translated headline", "subheadline": "translated subheadline" },\n' +
        '      ...\n' +
        '    ],\n' +
        '    ...\n' +
        '  }\n' +
        '}';

    return fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            messages: [{
                role: 'user',
                content: prompt
            }]
        })
    })
    .then(function(response) {
        if (!response.ok) {
            return response.json().then(function(err) {
                throw new Error(err.error ? err.error.message : 'API request failed');
            });
        }
        return response.json();
    })
    .then(function(data) {
        // Extract text from Claude's response
        var responseText = data.content[0].text;

        // Parse JSON response (handle potential markdown code blocks)
        var jsonStr = responseText;
        if (responseText.indexOf('```') !== -1) {
            var match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) {
                jsonStr = match[1];
            }
        }

        var translations = JSON.parse(jsonStr.trim());

        // Apply translations to screenshots
        targetLangs.forEach(function(targetLang) {
            var langTranslations = translations.translations[targetLang];
            if (!langTranslations) return;

            langTranslations.forEach(function(trans) {
                var original = contentList[trans.id];
                if (!original) return;

                var screenshot = App.state.platforms[original.platform].screenshots[original.index];
                if (!screenshot) return;

                // Initialize content object if needed
                if (!screenshot.settings.content) {
                    screenshot.settings.content = {};
                }

                // Save translation
                screenshot.settings.content[targetLang] = {
                    headline: trans.headline,
                    subheadline: trans.subheadline
                };
            });
        });

        return true;
    });
};

// Show progress modal
App.showProgressModal = function(message) {
    var modal = document.getElementById('progressModal');
    var text = document.getElementById('progressText');
    if (modal && text) {
        text.textContent = message || 'Processing...';
        modal.classList.add('visible');
    }
};

// Hide progress modal
App.hideProgressModal = function() {
    var modal = document.getElementById('progressModal');
    if (modal) {
        modal.classList.remove('visible');
    }
};
