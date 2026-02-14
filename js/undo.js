// ============================================
// Undo/Redo System
// ============================================

var App = window.App || {};

App.Undo = {
    _stacks: {},
    _indexes: {},
    _captureTimeout: null,
    MAX_HISTORY: 50,

    _key: function() {
        return App.state.activePlatform;
    },

    _snapshot: function() {
        var platform = App.getActivePlatformData();
        return {
            activeIndex: platform.activeIndex,
            screenshots: platform.screenshots.map(function(s) {
                return {
                    src: s.src,
                    width: s.width,
                    height: s.height,
                    settings: JSON.parse(JSON.stringify(s.settings))
                };
            })
        };
    },

    _restore: function(snapshot) {
        var platform = App.getActivePlatformData();
        var oldScreenshots = platform.screenshots;

        platform.activeIndex = snapshot.activeIndex;
        platform.screenshots = snapshot.screenshots.map(function(snap) {
            // Reuse existing Image object if same src
            var existingImg = null;
            for (var i = 0; i < oldScreenshots.length; i++) {
                if (oldScreenshots[i].src === snap.src && oldScreenshots[i].image) {
                    existingImg = oldScreenshots[i].image;
                    break;
                }
            }
            var screenshot = {
                src: snap.src,
                image: existingImg,
                width: snap.width,
                height: snap.height,
                settings: JSON.parse(JSON.stringify(snap.settings))
            };
            if (!screenshot.image) {
                var img = new Image();
                img.src = snap.src;
                screenshot.image = img;
            }
            return screenshot;
        });

        App.updateSettingsUI();
        App.renderAllPreviews();
        App.updateExportButton();
        App.updateSidebarCounts();
        App.Storage.scheduleSave();
        App.updateUndoRedoButtons();
    },

    _ensureStack: function(key) {
        if (!this._stacks[key]) {
            this._stacks[key] = [this._snapshot()];
            this._indexes[key] = 0;
        }
    },

    capture: function() {
        var key = this._key();
        this._ensureStack(key);
        var stack = this._stacks[key];
        var idx = this._indexes[key];

        // Trim redo entries
        stack.length = idx + 1;
        stack.push(this._snapshot());

        if (stack.length > this.MAX_HISTORY) {
            stack.shift();
        }
        this._indexes[key] = stack.length - 1;
        App.updateUndoRedoButtons();
    },

    scheduleCapture: function() {
        var self = this;
        if (self._captureTimeout) clearTimeout(self._captureTimeout);
        self._captureTimeout = setTimeout(function() {
            self._captureTimeout = null;
            self.capture();
        }, 400);
    },

    undo: function() {
        var key = this._key();
        this._ensureStack(key);
        if (this._indexes[key] <= 0) return;
        this._indexes[key]--;
        this._restore(this._stacks[key][this._indexes[key]]);
    },

    redo: function() {
        var key = this._key();
        this._ensureStack(key);
        if (this._indexes[key] >= this._stacks[key].length - 1) return;
        this._indexes[key]++;
        this._restore(this._stacks[key][this._indexes[key]]);
    },

    canUndo: function() {
        var key = this._key();
        return this._stacks[key] && this._indexes[key] > 0;
    },

    canRedo: function() {
        var key = this._key();
        return this._stacks[key] && this._indexes[key] < this._stacks[key].length - 1;
    },

    clear: function() {
        this._stacks = {};
        this._indexes = {};
        if (this._captureTimeout) clearTimeout(this._captureTimeout);
        this._captureTimeout = null;
        App.updateUndoRedoButtons();
    }
};
