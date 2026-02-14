// ============================================
// Application State
// ============================================

var App = window.App || {};

// Active project info
App.activeProjectId = null;
App.activeProjectName = 'My App';
App.activeProjectCreatedAt = null;
App.projects = []; // [{id, name}, ...]

App.state = {
    activePlatform: 'iphone',
    // Global language settings (shared across all platforms)
    languages: ['en'],
    activeLanguage: 'en',
    platforms: {
        'iphone': { screenshots: [], activeIndex: 0 },
        'ipad': { screenshots: [], activeIndex: 0 },
        'mac': { screenshots: [], activeIndex: 0 },
        'android-phone': { screenshots: [], activeIndex: 0 },
        'android-tablet': { screenshots: [], activeIndex: 0 }
    }
};

App.getActiveFormat = function() {
    return App.FORMATS[App.state.activePlatform];
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
        if (platform.screenshots.length > 0) {
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
    // Also update the active platform badge in the toggle
    App.updatePlatformToggleLabel();
};

App.selectPlatform = function(platformKey) {
    App.state.activePlatform = platformKey;

    // Update UI active states
    document.querySelectorAll('.platform-item').forEach(function(item) {
        item.classList.toggle('active', item.dataset.platform === platformKey);
    });

    // Close platforms accordion and update toggle label
    document.getElementById('platformsSection').classList.remove('open');
    document.getElementById('platformsToggle').classList.remove('open');
    App.updatePlatformToggleLabel();

    // Update platform select in toolbar
    App.updatePlatformSelect();

    // Update empty state text
    App.updateEmptyStateText();

    // Update settings UI and render
    App.updateSettingsUI();
    App.renderAllPreviews();
    App.Storage.scheduleSave();
};

App.updatePlatformToggleLabel = function() {
    var family = App.PLATFORM_FAMILIES[App.state.activePlatform];
    var nameEl = document.getElementById('activePlatformName');
    var countEl = document.getElementById('activePlatformCount');
    if (nameEl && family) {
        nameEl.textContent = family.name;
    }
    if (countEl) {
        var count = App.state.platforms[App.state.activePlatform].screenshots.length;
        countEl.textContent = count;
        countEl.style.display = count > 0 ? 'inline-flex' : 'none';
    }
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

        platformItem.appendChild(header);
        section.appendChild(platformItem);
    });
};

App.updatePlatformSelect = function() {
    var select = document.getElementById('formatSelect');
    select.innerHTML = '';

    var platformsWithScreenshots = [];
    Object.keys(App.state.platforms).forEach(function(platformKey) {
        if (App.state.platforms[platformKey].screenshots.length > 0) {
            platformsWithScreenshots.push(platformKey);
        }
    });

    // Always include the active platform
    if (platformsWithScreenshots.indexOf(App.state.activePlatform) === -1) {
        platformsWithScreenshots.push(App.state.activePlatform);
    }

    platformsWithScreenshots.forEach(function(platformKey) {
        var family = App.PLATFORM_FAMILIES[platformKey];
        var option = document.createElement('option');
        option.value = platformKey;
        option.textContent = family.name;
        select.appendChild(option);
    });

    select.value = App.state.activePlatform;

    // Hide select if only one platform has screenshots
    select.style.display = platformsWithScreenshots.length > 1 ? '' : 'none';
};

// ============================================
// Multi-Project Management
// ============================================

// Reset state to defaults (before loading a new project)
App.resetStateToDefaults = function() {
    App.state.activePlatform = 'iphone';
    App.state.languages = ['en'];
    App.state.activeLanguage = 'en';

    Object.keys(App.state.platforms).forEach(function(platformKey) {
        App.state.platforms[platformKey] = {
            screenshots: [],
            activeIndex: 0
        };
    });

    if (App.Undo) App.Undo.clear();
};

// Switch to another project
App.switchProject = function(projectId) {
    if (projectId === App.activeProjectId) return Promise.resolve();

    // Flush pending save immediately
    if (App.Storage._saveTimeout) {
        clearTimeout(App.Storage._saveTimeout);
        App.Storage._saveTimeout = null;
    }

    // Update active state in sidebar immediately (no DOM rebuild)
    document.querySelectorAll('.project-item').forEach(function(item) {
        item.classList.toggle('active', item.getAttribute('data-project-id') === projectId);
    });
    App.showLoadingState(true);

    // Clear existing previews immediately (keep spinner visible)
    var container = document.getElementById('previewsContainer');
    container.querySelectorAll('.preview-item').forEach(function(el) { el.remove(); });

    return App.Storage.saveProject(App.activeProjectId).then(function() {
        App.resetStateToDefaults();
        App.activeProjectId = projectId;

        return App.Storage.saveProjectsMeta();
    }).then(function() {
        return App.Storage.loadProject(projectId);
    }).then(function() {
        requestAnimationFrame(function() {
            App.showLoadingState(false);
            App.updateSettingsUI();
            App.renderAllPreviews();
        });
    });
};

App.showLoadingState = function(show) {
    var emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.style.display = show ? 'flex' : '';
        emptyState.classList.toggle('loading', show);
    }
};

// Create a new project
App.createProject = function(name) {
    // Flush pending save
    if (App.Storage._saveTimeout) {
        clearTimeout(App.Storage._saveTimeout);
        App.Storage._saveTimeout = null;
    }

    return App.Storage.saveProject(App.activeProjectId).then(function() {
        App.resetStateToDefaults();

        var newId = App.Storage._generateProjectId();
        App.activeProjectId = newId;
        App.activeProjectName = name || 'New App';
        App.activeProjectCreatedAt = Date.now();

        App.projects.push({ id: newId, name: App.activeProjectName });

        return App.Storage.saveAll();
    }).then(function() {
        App.Storage._restoreUI();
        App.updateSettingsUI();
        App.renderAllPreviews();
    });
};

// Delete a project
App.deleteProject = function(projectId) {
    if (App.projects.length <= 1) {
        alert('Cannot delete the only project');
        return Promise.resolve();
    }

    if (!confirm('Delete this project? This cannot be undone.')) {
        return Promise.resolve();
    }

    return App.Storage.deleteProject(projectId).then(function() {
        // Remove from projects list
        App.projects = App.projects.filter(function(p) { return p.id !== projectId; });

        // If deleting the active project, switch to another one
        if (projectId === App.activeProjectId) {
            var nextProject = App.projects[0];
            App.resetStateToDefaults();
            App.activeProjectId = nextProject.id;

            return App.Storage.saveProjectsMeta().then(function() {
                return App.Storage.loadProject(nextProject.id);
            }).then(function() {
                App.updateSettingsUI();
                App.renderAllPreviews();
                App.updateProjectsList();
            });
        } else {
            return App.Storage.saveProjectsMeta().then(function() {
                App.updateProjectsList();
            });
        }
    });
};

// Duplicate a project
App.duplicateProject = function(projectId) {
    // Save current project first
    if (App.Storage._saveTimeout) {
        clearTimeout(App.Storage._saveTimeout);
        App.Storage._saveTimeout = null;
    }

    return App.Storage.saveProject(App.activeProjectId).then(function() {
        return App.Storage.duplicateProject(projectId);
    }).then(function(newId) {
        if (!newId) return;

        // Find original name
        var original = App.projects.find(function(p) { return p.id === projectId; });
        var newName = (original ? original.name : 'My App') + ' (copy)';

        App.projects.push({ id: newId, name: newName });

        // Switch to the new project
        App.resetStateToDefaults();
        App.activeProjectId = newId;

        return App.Storage.saveProjectsMeta().then(function() {
            return App.Storage.loadProject(newId);
        }).then(function() {
            App.updateSettingsUI();
            App.renderAllPreviews();
            App.updateProjectsList();
        });
    });
};

// Rename a project
App.renameProject = function(projectId, newName) {
    if (!newName || !newName.trim()) return Promise.resolve();
    newName = newName.trim();

    // Update in projects list cache
    var project = App.projects.find(function(p) { return p.id === projectId; });
    if (project) project.name = newName;

    // If renaming the active project, update the active name and save
    if (projectId === App.activeProjectId) {
        App.activeProjectName = newName;
        App.Storage.scheduleSave();
        return Promise.resolve();
    }

    // Renaming an inactive project: update directly in IndexedDB
    return new Promise(function(resolve) {
        var transaction = App.Storage.db.transaction([App.Storage.STORE_NAME], 'readwrite');
        var store = transaction.objectStore(App.Storage.STORE_NAME);
        var request = store.get(projectId);

        request.onsuccess = function(event) {
            var data = event.target.result;
            if (data) {
                data.name = newName;
                store.put(data);
            }
            resolve();
        };
        request.onerror = function() { resolve(); };
    });
};

// Update the projects list in the sidebar
App.updateProjectsList = function() {
    var container = document.getElementById('projectsList');
    if (!container) return;

    container.innerHTML = '';

    App.projects.forEach(function(project) {
        var item = document.createElement('div');
        item.className = 'project-item' + (project.id === App.activeProjectId ? ' active' : '');
        item.setAttribute('data-project-id', project.id);

        var nameSpan = document.createElement('span');
        nameSpan.className = 'project-name';
        nameSpan.textContent = project.name;
        nameSpan.title = project.name;

        var menuBtn = document.createElement('button');
        menuBtn.className = 'project-menu-btn';
        menuBtn.title = 'Options';
        menuBtn.innerHTML = '<i data-lucide="ellipsis"></i>';

        item.appendChild(nameSpan);
        item.appendChild(menuBtn);
        container.appendChild(item);
    });

    // Re-create Lucide icons for the new elements
    var icons = Array.from(container.querySelectorAll('[data-lucide]'));
    if (icons.length > 0) {
        lucide.createIcons({ nodes: icons });
    }
};
