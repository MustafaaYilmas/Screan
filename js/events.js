// ============================================
// Event Handlers
// ============================================

var App = window.App || {};

// Reusable slider component: binds range input + editable value label
App.initSlider = function(config) {
    var slider = document.getElementById(config.id + 'Slider');
    var valueEl = document.getElementById(config.id + 'Value');
    if (!slider || !valueEl) return;

    slider.addEventListener('input', function() {
        var settings = App.getActiveSettings();
        if (!settings) return;
        settings[config.settingsKey] = parseInt(this.value, 10);
        valueEl.textContent = this.value;
        App.renderActivePreview();
    });
    slider.addEventListener('change', function() {
        App.Storage.scheduleSave();
        App.Undo.scheduleCapture();
    });

    valueEl.addEventListener('click', function() {
        var input = document.createElement('input');
        input.type = 'number';
        input.className = 'slider-value-input';
        input.value = slider.value;
        input.min = slider.min;
        input.max = slider.max;
        input.step = slider.step;
        valueEl.replaceWith(input);
        input.focus();
        input.select();

        var commit = function() {
            var val = parseInt(input.value, 10);
            if (isNaN(val)) val = config.defaultValue;
            val = Math.max(parseInt(slider.min), Math.min(parseInt(slider.max), val));
            slider.value = val;
            var settings = App.getActiveSettings();
            if (settings) settings[config.settingsKey] = val;
            valueEl.textContent = val;
            input.replaceWith(valueEl);
            App.renderActivePreview();
            App.Storage.scheduleSave();
            App.Undo.scheduleCapture();
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { valueEl.textContent = slider.value; input.replaceWith(valueEl); }
        });
    });
};

// Helper to render and save after settings change (only active canvas)
App.renderAndSave = function() {
    App.renderActivePreview();
    App.updateSectionApplyButtons();
    App.Storage.scheduleSave();
    App.Undo.scheduleCapture();
    // Re-render after fonts finish loading (Google Fonts may load weight on demand)
    document.fonts.ready.then(function() {
        App.renderActivePreview();
    });
};

App.normalizeHex = function(value) {
    var hex = value.trim().toUpperCase();
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    // Validate hex format
    if (/^#[0-9A-F]{6}$/.test(hex)) {
        return hex.toLowerCase();
    }
    // Support 3-char hex
    if (/^#[0-9A-F]{3}$/.test(hex)) {
        return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return null;
};

App.updateUndoRedoButtons = function() {
    var undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.style.display = App.Undo.canUndo() ? '' : 'none';
};

App.initEventListeners = function() {
    // Settings tabs
    document.querySelectorAll('.settings-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            var targetTab = this.getAttribute('data-tab');

            // Update tab buttons
            document.querySelectorAll('.settings-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            this.classList.add('active');

            // Update tab content
            document.querySelectorAll('.settings-tab-content').forEach(function(content) {
                content.classList.remove('active');
            });
            document.getElementById(targetTab + 'Tab').classList.add('active');

            // Toggle footers based on active tab
            var translateFooter = document.getElementById('translateFooter');
            if (targetTab === 'localize') {
                App.updateTranslateFooterVisibility();
            } else {
                translateFooter.style.display = 'none';
            }
        });
    });

    // Add screenshot
    var addBtn = document.getElementById('addScreenshotBtn');
    var input = document.getElementById('screenshotInput');
    addBtn.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function(e) { App.handleScreenshots(e.target.files); });

    // Platform select (toolbar)
    document.getElementById('formatSelect').addEventListener('change', function(e) {
        App.selectPlatform(e.target.value);
    });

    // Text inputs
    document.getElementById('headline').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.headline = e.target.value;
            App.saveContentToActiveLanguage(settings);
            App.markTranslationDirty();
            App.renderAndSave();
        }
    });

    document.getElementById('subheadline').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.subheadline = e.target.value;
            App.saveContentToActiveLanguage(settings);
            App.markTranslationDirty();
            App.renderAndSave();
        }
    });

    // Title font
    document.getElementById('titleFont').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.titleFont = e.target.value;
            App.renderAndSave();
        }
    });

    // Body font
    document.getElementById('bodyFont').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bodyFont = e.target.value;
            App.renderAndSave();
        }
    });

    // Title size select — updates input + settings
    document.getElementById('titleSizeSelect').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (!settings) return;
        if (e.target.value !== 'custom') {
            var val = parseInt(e.target.value, 10);
            settings.titleSize = val;
            document.getElementById('titleSizeInput').value = val;
            App.renderAndSave();
        }
    });

    // Title size input — updates select (custom if no match) + settings
    document.getElementById('titleSizeInput').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (!settings) return;
        var val = parseInt(e.target.value, 10);
        if (val > 0) {
            settings.titleSize = val;
            App.syncSizeSelect('titleSizeSelect', val);
            App.renderAndSave();
        }
    });

    // Body size select — updates input + settings
    document.getElementById('bodySizeSelect').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (!settings) return;
        if (e.target.value !== 'custom') {
            var val = parseInt(e.target.value, 10);
            settings.bodySize = val;
            document.getElementById('bodySizeInput').value = val;
            App.renderAndSave();
        }
    });

    // Body size input — updates select (custom if no match) + settings
    document.getElementById('bodySizeInput').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (!settings) return;
        var val = parseInt(e.target.value, 10);
        if (val > 0) {
            settings.bodySize = val;
            App.syncSizeSelect('bodySizeSelect', val);
            App.renderAndSave();
        }
    });

    // Title uppercase toggle
    document.getElementById('titleUppercase').addEventListener('click', function() {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.titleUppercase = !settings.titleUppercase;
            this.classList.toggle('active', settings.titleUppercase);
            App.renderAndSave();
        }
    });

    // Body uppercase toggle
    document.getElementById('bodyUppercase').addEventListener('click', function() {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bodyUppercase = !settings.bodyUppercase;
            this.classList.toggle('active', settings.bodyUppercase);
            App.renderAndSave();
        }
    });

    // Title color - color picker
    document.getElementById('titleColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.titleColor = e.target.value;
            document.getElementById('titleColorHex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Title color - hex input
    document.getElementById('titleColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.titleColor = hex;
                document.getElementById('titleColor').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Title weight
    document.getElementById('titleWeight').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.titleWeight = e.target.value;
            App.renderAndSave();
        }
    });

    // Body color - color picker
    document.getElementById('bodyColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bodyColor = e.target.value;
            document.getElementById('bodyColorHex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Body color - hex input
    document.getElementById('bodyColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.bodyColor = hex;
                document.getElementById('bodyColor').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Body weight
    document.getElementById('bodyWeight').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bodyWeight = e.target.value;
            App.renderAndSave();
        }
    });

    // Background color - color picker
    document.getElementById('bgColor1').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bgColor = e.target.value;
            document.getElementById('bgColor1Hex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Background color - hex input
    document.getElementById('bgColor1Hex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.bgColor = hex;
                document.getElementById('bgColor1').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Background gradient toggle
    document.getElementById('bgGradient').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bgGradient = e.target.checked;
            document.getElementById('gradientColorRow').style.display = e.target.checked ? 'flex' : 'none';
            document.getElementById('gradientAngleRow').style.display = e.target.checked ? 'flex' : 'none';
            document.getElementById('bgColorLabel').textContent = e.target.checked ? 'Start' : 'Color';
            App.renderAndSave();
        }
    });

    // Gradient angle slider
    App.initSlider({ id: 'bgGradientAngle', settingsKey: 'bgGradientAngle', defaultValue: 180 });

    // Gradient end color - color picker
    document.getElementById('bgGradientColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.bgGradientColor = e.target.value;
            document.getElementById('bgGradientColorHex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Gradient end color - hex input
    document.getElementById('bgGradientColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.bgGradientColor = hex;
                document.getElementById('bgGradientColor').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Device frame color - color picker
    document.getElementById('deviceFrameColor').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.deviceFrameColor = e.target.value;
            document.getElementById('deviceFrameColorHex').value = e.target.value.toUpperCase();
            App.renderAndSave();
        }
    });

    // Device frame color - hex input
    document.getElementById('deviceFrameColorHex').addEventListener('input', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            var hex = App.normalizeHex(e.target.value);
            if (hex) {
                settings.deviceFrameColor = hex;
                document.getElementById('deviceFrameColor').value = hex;
                App.renderAndSave();
            }
        }
    });

    // Shadow toggle
    document.getElementById('addShadow').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.addShadow = e.target.checked;
            App.renderAndSave();
        }
    });

    // Device frame toggle
    document.getElementById('addDeviceFrame').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.addDeviceFrame = e.target.checked;
            document.getElementById('deviceFrameColorRow').style.display = e.target.checked ? 'flex' : 'none';
            App.renderAndSave();
        }
    });

    // Hide screenshot toggle
    document.getElementById('hideScreenshot').addEventListener('change', function(e) {
        var settings = App.getActiveSettings();
        if (settings) {
            settings.hideScreenshot = !e.target.checked;

            App.updateScreenshotOptionsVisibility(!e.target.checked);
            App.renderAndSave();
        }
    });

    // Position presets (text buttons)
    document.querySelectorAll('.position-text-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var settings = App.getActiveSettings();
            if (settings) {
                document.querySelectorAll('.position-text-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                settings.preset = btn.dataset.preset;
                App.updateTextFieldsState();
                App.renderAndSave();
            }
        });
    });

    // Text gap slider (spacing between title and body)
    App.initSlider({ id: 'textGap', settingsKey: 'textGap', defaultValue: 35 });

    // Screenshot horizontal offset slider
    App.initSlider({ id: 'screenshotOffsetX', settingsKey: 'screenshotOffsetX', defaultValue: 0 });

    // Screenshot vertical offset slider
    App.initSlider({ id: 'screenshotOffsetY', settingsKey: 'screenshotOffsetY', defaultValue: 33 });

    // Screenshot rotation slider
    App.initSlider({ id: 'screenshotRotation', settingsKey: 'screenshotRotation', defaultValue: 0 });

    // Screenshot zoom slider
    App.initSlider({ id: 'screenshotZoom', settingsKey: 'screenshotZoom', defaultValue: 87 });

    // Background image opacity slider
    App.initSlider({ id: 'bgImageOpacity', settingsKey: 'bgImageOpacity', defaultValue: 100 });

    // Background image upload
    document.getElementById('bgImageUploadBtn').addEventListener('click', function() {
        document.getElementById('bgImageInput').click();
    });

    document.getElementById('bgImageInput').addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        var settings = App.getActiveSettings();
        if (!settings) return;

        var reader = new FileReader();
        reader.onload = function(ev) {
            var img = new Image();
            img.onload = function() {
                settings.bgImage = ev.target.result;
                settings.bgImageObj = img;
                App.updateBgImageUI(settings);
                App.renderAndSave();
                App.Undo.scheduleCapture();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        // Reset input so the same file can be re-selected
        this.value = '';
    });

    document.getElementById('bgImageRemoveBtn').addEventListener('click', function() {
        var settings = App.getActiveSettings();
        if (!settings) return;
        settings.bgImage = null;
        settings.bgImageObj = null;
        App.updateBgImageUI(settings);
        App.renderAndSave();
        App.Undo.scheduleCapture();
    });

    // Text alignment
    document.querySelectorAll('.align-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var settings = App.getActiveSettings();
            if (settings) {
                document.querySelectorAll('.align-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                settings.textAlign = btn.dataset.align;
                App.renderAndSave();
            }
        });
    });

    // Platforms accordion toggle
    document.getElementById('platformsToggle').addEventListener('click', function() {
        this.classList.toggle('open');
        document.getElementById('platformsSection').classList.toggle('open');
    });

    // Clicking active platform preview opens the accordion
    document.getElementById('activePlatformPreview').addEventListener('click', function() {
        document.getElementById('platformsToggle').classList.add('open');
        document.getElementById('platformsSection').classList.add('open');
    });

    // Platform selection
    document.querySelectorAll('.platform-header').forEach(function(header) {
        header.addEventListener('click', function() {
            var platformItem = header.closest('.platform-item');
            var platformKey = platformItem.dataset.platform;
            App.selectPlatform(platformKey);
        });
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', App.exportAll);

    // Apply section to All
    document.querySelectorAll('.btn-apply-section').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var section = this.getAttribute('data-section');
            App.applySectionToAll(section);
            this.blur();
        });
    });

    // Toggle panels (sidebar + settings) - desktop only
    document.getElementById('togglePanels').addEventListener('click', function() {
        document.body.classList.toggle('panels-hidden');
        var isHidden = document.body.classList.contains('panels-hidden');
        var newIcon = isHidden ? 'square' : 'columns-3';
        // Lucide replaces <i> with <svg>, so we need to replace the svg with a new <i>
        var svg = this.querySelector('svg');
        if (svg) {
            var newI = document.createElement('i');
            newI.setAttribute('data-lucide', newIcon);
            svg.replaceWith(newI);
            lucide.createIcons({ nodes: [newI] });
        }
    });

    // Language management (defined in localize.js)
    App.initLanguageEvents();

    // Projects management
    App.initProjectEvents();

    // Undo/Redo keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                App.Undo.redo();
            } else {
                App.Undo.undo();
            }
        }
    });
};

// ============================================
// Project Event Handlers
// ============================================

App.initProjectEvents = function() {
    var projectMenu = document.getElementById('projectMenu');
    var projectsList = document.getElementById('projectsList');
    var menuTargetId = null;

    // Hover: hide active highlight when hovering a different project
    projectsList.addEventListener('mouseenter', function(e) {
        var item = e.target.closest('.project-item');
        if (item && !item.classList.contains('active')) {
            projectsList.classList.add('hovering-other');
        }
    }, true);

    projectsList.addEventListener('mouseover', function(e) {
        var item = e.target.closest('.project-item');
        if (item && !item.classList.contains('active')) {
            projectsList.classList.add('hovering-other');
        } else {
            projectsList.classList.remove('hovering-other');
        }
    });

    projectsList.addEventListener('mouseleave', function() {
        projectsList.classList.remove('hovering-other');
    });

    // Add new project
    document.getElementById('addProjectBtn').addEventListener('click', function() {
        App.createProject('New App');
    });

    // Click on project item (delegate from projectsList)
    document.getElementById('projectsList').addEventListener('click', function(e) {
        var menuBtn = e.target.closest('.project-menu-btn');
        var item = e.target.closest('.project-item');

        if (menuBtn && item) {
            // Show context menu
            e.stopPropagation();
            menuTargetId = item.getAttribute('data-project-id');
            var rect = menuBtn.getBoundingClientRect();
            projectMenu.style.display = 'block';
            projectMenu.style.left = rect.right + 'px';
            projectMenu.style.top = rect.top + 'px';

            // Adjust if menu goes off screen
            requestAnimationFrame(function() {
                var menuRect = projectMenu.getBoundingClientRect();
                if (menuRect.right > window.innerWidth) {
                    projectMenu.style.left = (rect.left - menuRect.width) + 'px';
                }
                if (menuRect.bottom > window.innerHeight) {
                    projectMenu.style.top = (window.innerHeight - menuRect.height - 8) + 'px';
                }
            });
            return;
        }

        if (item) {
            var projectId = item.getAttribute('data-project-id');
            App.switchProject(projectId);
        }
    });

    // Context menu actions
    projectMenu.addEventListener('click', function(e) {
        var action = e.target.getAttribute('data-action');
        if (!action || !menuTargetId) return;

        projectMenu.style.display = 'none';

        if (action === 'rename') {
            App._startProjectRename(menuTargetId);
        } else if (action === 'duplicate') {
            App.duplicateProject(menuTargetId);
        } else if (action === 'delete') {
            App.deleteProject(menuTargetId);
        }

        menuTargetId = null;
    });

    // Close context menu on click outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.project-menu') && !e.target.closest('.project-menu-btn')) {
            projectMenu.style.display = 'none';
            menuTargetId = null;
        }
    });
};

// Inline rename for a project
App._startProjectRename = function(projectId) {
    var item = document.querySelector('.project-item[data-project-id="' + projectId + '"]');
    if (!item) return;

    var nameSpan = item.querySelector('.project-name');
    if (!nameSpan) return;

    var currentName = nameSpan.textContent;
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-rename-input';
    input.value = currentName;

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    var committed = false;
    var commit = function(save) {
        if (committed) return;
        committed = true;
        var newName = save ? (input.value.trim() || currentName) : currentName;
        var newSpan = document.createElement('span');
        newSpan.className = 'project-name';
        newSpan.textContent = newName;
        newSpan.title = newName;
        input.replaceWith(newSpan);

        if (save && newName !== currentName) {
            App.renameProject(projectId, newName);
        }
    };

    input.addEventListener('blur', function() { commit(true); });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            commit(true);
        }
        if (e.key === 'Escape') {
            commit(false);
        }
    });
};
