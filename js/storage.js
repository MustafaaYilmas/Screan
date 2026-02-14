// ============================================
// IndexedDB Storage for Screenshots & Settings
// Multi-project support
// ============================================

var App = window.App || {};

App.Storage = {
    DB_NAME: 'screan-db',
    DB_VERSION: 1,
    STORE_NAME: 'screenshots',
    META_KEY: 'projects-meta',
    db: null,

    // Initialize the database
    init: function() {
        var self = this;
        return new Promise(function(resolve, reject) {
            if (!window.indexedDB) {
                console.warn('IndexedDB not available, persistence disabled');
                resolve(false);
                return;
            }

            var request = indexedDB.open(self.DB_NAME, self.DB_VERSION);

            request.onerror = function(event) {
                console.warn('IndexedDB error:', event.target.error);
                resolve(false);
            };

            request.onsuccess = function(event) {
                self.db = event.target.result;
                resolve(true);
            };

            request.onupgradeneeded = function(event) {
                var db = event.target.result;
                if (!db.objectStoreNames.contains(self.STORE_NAME)) {
                    db.createObjectStore(self.STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    },

    // Generate a unique project ID
    _generateProjectId: function() {
        return 'project-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    // Serialize platforms data (strip Image objects)
    _serializePlatforms: function() {
        var platformsData = {};
        Object.keys(App.state.platforms).forEach(function(platformKey) {
            var platform = App.state.platforms[platformKey];
            platformsData[platformKey] = {
                screenshots: platform.screenshots.map(function(screenshot) {
                    return {
                        src: screenshot.src,
                        width: screenshot.width,
                        height: screenshot.height,
                        settings: screenshot.settings
                    };
                }),
                activeIndex: platform.activeIndex,
                exportFormats: platform.exportFormats
            };
        });
        return platformsData;
    },

    // Save a project to IndexedDB
    saveProject: function(projectId) {
        var self = this;
        if (!self.db) return Promise.resolve(false);

        return new Promise(function(resolve, reject) {
            try {
                var data = {
                    id: projectId,
                    name: App.activeProjectName || 'My App',
                    createdAt: App.activeProjectCreatedAt || Date.now(),
                    platforms: self._serializePlatforms(),
                    activePlatform: App.state.activePlatform,
                    currentFormat: App.currentFormat,
                    languages: App.state.languages || ['en'],
                    activeLanguage: App.state.activeLanguage || 'en',
                    timestamp: Date.now()
                };

                var transaction = self.db.transaction([self.STORE_NAME], 'readwrite');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.put(data);

                request.onsuccess = function() { resolve(true); };
                request.onerror = function(event) {
                    console.warn('Error saving project:', event.target.error);
                    resolve(false);
                };
            } catch (e) {
                console.warn('Error preparing project data:', e);
                resolve(false);
            }
        });
    },

    // Load a project from IndexedDB into App.state
    loadProject: function(projectId) {
        var self = this;
        if (!self.db) return Promise.resolve(false);

        return new Promise(function(resolve, reject) {
            try {
                var transaction = self.db.transaction([self.STORE_NAME], 'readonly');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.get(projectId);

                request.onsuccess = function(event) {
                    var data = event.target.result;
                    if (!data || !data.platforms) {
                        resolve(false);
                        return;
                    }

                    // Set project info
                    App.activeProjectId = projectId;
                    App.activeProjectName = data.name || 'My App';
                    App.activeProjectCreatedAt = data.createdAt || Date.now();

                    // Restore state
                    App.state.activePlatform = data.activePlatform || 'iphone';
                    App.currentFormat = data.currentFormat || 'iphone-6.9';
                    App.state.languages = data.languages || ['en'];
                    App.state.activeLanguage = data.activeLanguage || 'en';

                    // Count images to load
                    var imagesToLoad = 0;
                    var imagesLoaded = 0;

                    Object.keys(data.platforms).forEach(function(platformKey) {
                        imagesToLoad += data.platforms[platformKey].screenshots.length;
                    });

                    // Restore all platform metadata first
                    Object.keys(App.state.platforms).forEach(function(platformKey) {
                        var savedPlatform = data.platforms[platformKey];
                        if (savedPlatform) {
                            App.state.platforms[platformKey].activeIndex = savedPlatform.activeIndex || 0;
                            App.state.platforms[platformKey].exportFormats = savedPlatform.exportFormats || [];
                            App.state.platforms[platformKey].screenshots = [];
                        }
                    });

                    if (imagesToLoad === 0) {
                        self._restoreUI();
                        resolve(true);
                        return;
                    }

                    // Restore screenshots with Image objects
                    Object.keys(data.platforms).forEach(function(platformKey) {
                        var savedPlatform = data.platforms[platformKey];
                        if (!App.state.platforms[platformKey]) return;

                        savedPlatform.screenshots.forEach(function(savedScreenshot, index) {
                            var img = new Image();
                            img.onload = function() {
                                App.state.platforms[platformKey].screenshots[index] = {
                                    src: savedScreenshot.src,
                                    image: img,
                                    width: savedScreenshot.width,
                                    height: savedScreenshot.height,
                                    settings: savedScreenshot.settings
                                };

                                imagesLoaded++;
                                if (imagesLoaded === imagesToLoad) {
                                    self._restoreUI();
                                    resolve(true);
                                }
                            };
                            img.onerror = function() {
                                console.warn('Failed to load image for', platformKey);
                                imagesLoaded++;
                                if (imagesLoaded === imagesToLoad) {
                                    self._restoreUI();
                                    resolve(true);
                                }
                            };
                            img.src = savedScreenshot.src;
                        });
                    });
                };

                request.onerror = function(event) {
                    console.warn('Error loading project:', event.target.error);
                    resolve(false);
                };
            } catch (e) {
                console.warn('Error reading project:', e);
                resolve(false);
            }
        });
    },

    // Delete a project from IndexedDB
    deleteProject: function(projectId) {
        var self = this;
        if (!self.db) return Promise.resolve(false);

        return new Promise(function(resolve, reject) {
            try {
                var transaction = self.db.transaction([self.STORE_NAME], 'readwrite');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.delete(projectId);

                request.onsuccess = function() { resolve(true); };
                request.onerror = function(event) {
                    console.warn('Error deleting project:', event.target.error);
                    resolve(false);
                };
            } catch (e) {
                console.warn('Error deleting project:', e);
                resolve(false);
            }
        });
    },

    // Duplicate a project in IndexedDB
    duplicateProject: function(projectId) {
        var self = this;
        if (!self.db) return Promise.resolve(null);

        return new Promise(function(resolve, reject) {
            try {
                var transaction = self.db.transaction([self.STORE_NAME], 'readonly');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.get(projectId);

                request.onsuccess = function(event) {
                    var data = event.target.result;
                    if (!data) { resolve(null); return; }

                    var newId = self._generateProjectId();
                    var clone = JSON.parse(JSON.stringify(data));
                    clone.id = newId;
                    clone.name = (data.name || 'My App') + ' (copy)';
                    clone.createdAt = Date.now();
                    clone.timestamp = Date.now();

                    var writeTx = self.db.transaction([self.STORE_NAME], 'readwrite');
                    var writeStore = writeTx.objectStore(self.STORE_NAME);
                    var putReq = writeStore.put(clone);

                    putReq.onsuccess = function() { resolve(newId); };
                    putReq.onerror = function(event) {
                        console.warn('Error duplicating project:', event.target.error);
                        resolve(null);
                    };
                };

                request.onerror = function() { resolve(null); };
            } catch (e) {
                console.warn('Error duplicating project:', e);
                resolve(null);
            }
        });
    },

    // Load projects meta-data
    loadProjectsMeta: function() {
        var self = this;
        if (!self.db) return Promise.resolve(null);

        return new Promise(function(resolve, reject) {
            try {
                var transaction = self.db.transaction([self.STORE_NAME], 'readonly');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.get(self.META_KEY);

                request.onsuccess = function(event) {
                    resolve(event.target.result || null);
                };
                request.onerror = function() { resolve(null); };
            } catch (e) {
                resolve(null);
            }
        });
    },

    // Save projects meta-data
    saveProjectsMeta: function() {
        var self = this;
        if (!self.db) return Promise.resolve(false);

        return new Promise(function(resolve, reject) {
            try {
                var data = {
                    id: self.META_KEY,
                    activeProjectId: App.activeProjectId,
                    projectOrder: App.projects.map(function(p) { return p.id; })
                };

                var transaction = self.db.transaction([self.STORE_NAME], 'readwrite');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.put(data);

                request.onsuccess = function() { resolve(true); };
                request.onerror = function(event) {
                    console.warn('Error saving projects meta:', event.target.error);
                    resolve(false);
                };
            } catch (e) {
                console.warn('Error saving projects meta:', e);
                resolve(false);
            }
        });
    },

    // Get project name from IndexedDB (for building projects list)
    _getProjectName: function(projectId) {
        var self = this;
        if (!self.db) return Promise.resolve(null);

        return new Promise(function(resolve) {
            try {
                var transaction = self.db.transaction([self.STORE_NAME], 'readonly');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.get(projectId);

                request.onsuccess = function(event) {
                    var data = event.target.result;
                    resolve(data ? { id: data.id, name: data.name || 'My App' } : null);
                };
                request.onerror = function() { resolve(null); };
            } catch (e) { resolve(null); }
        });
    },

    // Build projects list from meta + IndexedDB
    listProjects: function() {
        var self = this;
        return self.loadProjectsMeta().then(function(meta) {
            if (!meta || !meta.projectOrder) return [];

            var promises = meta.projectOrder.map(function(id) {
                return self._getProjectName(id);
            });

            return Promise.all(promises).then(function(results) {
                return results.filter(function(r) { return r !== null; });
            });
        });
    },

    // Migrate legacy app-state to a project
    migrateFromLegacy: function() {
        var self = this;
        if (!self.db) return Promise.resolve(false);

        return new Promise(function(resolve, reject) {
            try {
                var transaction = self.db.transaction([self.STORE_NAME], 'readonly');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.get('app-state');

                request.onsuccess = function(event) {
                    var data = event.target.result;
                    if (!data || !data.platforms) {
                        resolve(false);
                        return;
                    }

                    // Create a new project from legacy data
                    var newId = self._generateProjectId();
                    var projectData = {
                        id: newId,
                        name: 'My App',
                        createdAt: data.timestamp || Date.now(),
                        platforms: data.platforms,
                        activePlatform: data.activePlatform || 'iphone',
                        currentFormat: data.currentFormat || 'iphone-6.9',
                        languages: data.languages || ['en'],
                        activeLanguage: data.activeLanguage || 'en',
                        timestamp: Date.now()
                    };

                    var metaData = {
                        id: self.META_KEY,
                        activeProjectId: newId,
                        projectOrder: [newId]
                    };

                    // Write project + meta, delete legacy key
                    var writeTx = self.db.transaction([self.STORE_NAME], 'readwrite');
                    var writeStore = writeTx.objectStore(self.STORE_NAME);
                    writeStore.put(projectData);
                    writeStore.put(metaData);
                    writeStore.delete('app-state');

                    writeTx.oncomplete = function() {
                        App.activeProjectId = newId;
                        App.activeProjectName = 'My App';
                        App.activeProjectCreatedAt = projectData.createdAt;
                        App.projects = [{ id: newId, name: 'My App' }];
                        resolve(true);
                    };

                    writeTx.onerror = function(event) {
                        console.warn('Migration error:', event.target.error);
                        resolve(false);
                    };
                };

                request.onerror = function() { resolve(false); };
            } catch (e) {
                console.warn('Migration error:', e);
                resolve(false);
            }
        });
    },

    // Save all state (current project + meta)
    saveAll: function() {
        var self = this;
        if (!self.db || !App.activeProjectId) return Promise.resolve(false);

        return Promise.all([
            self.saveProject(App.activeProjectId),
            self.saveProjectsMeta()
        ]).then(function(results) {
            return results[0] && results[1];
        });
    },

    // Load all state (meta → active project, with migration fallback)
    loadAll: function() {
        var self = this;
        if (!self.db) return Promise.resolve(false);

        return self.loadProjectsMeta().then(function(meta) {
            if (meta && meta.activeProjectId && meta.projectOrder) {
                // Existing multi-project data
                App.activeProjectId = meta.activeProjectId;
                return self.listProjects().then(function(projects) {
                    App.projects = projects;
                    return self.loadProject(meta.activeProjectId);
                });
            }

            // Try legacy migration
            return self.migrateFromLegacy().then(function(migrated) {
                if (migrated) {
                    return self.loadProject(App.activeProjectId);
                }

                // First launch: create default project
                var newId = self._generateProjectId();
                App.activeProjectId = newId;
                App.activeProjectName = 'My App';
                App.activeProjectCreatedAt = Date.now();
                App.projects = [{ id: newId, name: 'My App' }];

                return self.saveAll().then(function() {
                    self._restoreUI();
                    return true;
                });
            });
        });
    },

    // Restore UI after loading
    _restoreUI: function() {
        // Restore export format checkboxes
        Object.keys(App.state.platforms).forEach(function(platformKey) {
            var formats = App.state.platforms[platformKey].exportFormats;
            document.querySelectorAll('.size-item input[data-platform="' + platformKey + '"]').forEach(function(cb) {
                cb.checked = formats.indexOf(cb.dataset.format) !== -1;
            });
        });

        // Update active platform in sidebar
        document.querySelectorAll('.platform-item').forEach(function(item) {
            item.classList.toggle('active', item.dataset.platform === App.state.activePlatform);
        });

        // Update toggle label with active platform name
        App.updatePlatformToggleLabel();

        // Update format dropdown
        App.updateFormatDropdown();

        // Set current format in dropdown if it matches current platform
        var formatSelect = document.getElementById('formatSelect');
        var options = Array.from(formatSelect.options).map(function(o) { return o.value; });
        if (options.indexOf(App.currentFormat) !== -1) {
            formatSelect.value = App.currentFormat;
        }

        // Update sidebar counts and export button
        App.updateSidebarCounts();
        App.updateExportButton();
        App.updateEmptyStateText();

        // Update language selector with saved languages
        if (typeof App.updateLanguageSelect === 'function') {
            App.updateLanguageSelect();
        }

        // Update projects list in sidebar
        if (typeof App.updateProjectsList === 'function') {
            App.updateProjectsList();
        }
    }
};

// Debounced save function to avoid excessive writes
App.Storage._saveTimeout = null;
App.Storage.scheduleSave = function() {
    var self = this;
    if (self._saveTimeout) {
        clearTimeout(self._saveTimeout);
    }
    self._saveTimeout = setTimeout(function() {
        self.saveAll();
    }, 500);
};
