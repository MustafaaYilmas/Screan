// ============================================
// IndexedDB Storage for Screenshots & Settings
// ============================================

var App = window.App || {};

App.Storage = {
    DB_NAME: 'screan-db',
    DB_VERSION: 1,
    STORE_NAME: 'screenshots',
    db: null,

    // Initialize the database
    init: function() {
        var self = this;
        return new Promise(function(resolve, reject) {
            // Check if IndexedDB is available
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

    // Save all state to IndexedDB
    saveAll: function() {
        var self = this;
        if (!self.db) return Promise.resolve(false);

        return new Promise(function(resolve, reject) {
            try {
                // Prepare data for serialization (exclude Image objects)
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

                var data = {
                    id: 'app-state',
                    platforms: platformsData,
                    activePlatform: App.state.activePlatform,
                    currentFormat: App.currentFormat,
                    // Global language settings
                    languages: App.state.languages || ['en'],
                    activeLanguage: App.state.activeLanguage || 'en',
                    timestamp: Date.now()
                };

                var transaction = self.db.transaction([self.STORE_NAME], 'readwrite');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.put(data);

                request.onsuccess = function() {
                    resolve(true);
                };

                request.onerror = function(event) {
                    console.warn('Error saving to IndexedDB:', event.target.error);
                    resolve(false);
                };
            } catch (e) {
                console.warn('Error preparing data for IndexedDB:', e);
                resolve(false);
            }
        });
    },

    // Load all state from IndexedDB
    loadAll: function() {
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

                    // Restore state
                    App.state.activePlatform = data.activePlatform || 'iphone';
                    App.currentFormat = data.currentFormat || 'iphone-6.9';
                    // Restore global language settings
                    App.state.languages = data.languages || ['en'];
                    App.state.activeLanguage = data.activeLanguage || 'en';

                    // Count images to load
                    var imagesToLoad = 0;
                    var imagesLoaded = 0;

                    Object.keys(data.platforms).forEach(function(platformKey) {
                        imagesToLoad += data.platforms[platformKey].screenshots.length;
                    });

                    if (imagesToLoad === 0) {
                        // Restore platform data without screenshots
                        Object.keys(data.platforms).forEach(function(platformKey) {
                            if (App.state.platforms[platformKey]) {
                                App.state.platforms[platformKey].activeIndex = data.platforms[platformKey].activeIndex || 0;
                                App.state.platforms[platformKey].exportFormats = data.platforms[platformKey].exportFormats || [];
                            }
                        });
                        self._restoreUI();
                        resolve(true);
                        return;
                    }

                    // Restore screenshots with Image objects
                    Object.keys(data.platforms).forEach(function(platformKey) {
                        var savedPlatform = data.platforms[platformKey];
                        if (!App.state.platforms[platformKey]) return;

                        App.state.platforms[platformKey].activeIndex = savedPlatform.activeIndex || 0;
                        App.state.platforms[platformKey].exportFormats = savedPlatform.exportFormats || [];
                        App.state.platforms[platformKey].screenshots = [];

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
                    console.warn('Error loading from IndexedDB:', event.target.error);
                    resolve(false);
                };
            } catch (e) {
                console.warn('Error reading from IndexedDB:', e);
                resolve(false);
            }
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
    },

    // Clear all stored data
    clear: function() {
        var self = this;
        if (!self.db) return Promise.resolve(false);

        return new Promise(function(resolve, reject) {
            try {
                var transaction = self.db.transaction([self.STORE_NAME], 'readwrite');
                var store = transaction.objectStore(self.STORE_NAME);
                var request = store.delete('app-state');

                request.onsuccess = function() {
                    resolve(true);
                };

                request.onerror = function(event) {
                    console.warn('Error clearing IndexedDB:', event.target.error);
                    resolve(false);
                };
            } catch (e) {
                console.warn('Error clearing IndexedDB:', e);
                resolve(false);
            }
        });
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
