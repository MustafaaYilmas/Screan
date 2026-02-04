// ============================================
// Drag & Drop (File Import)
// ============================================

var App = window.App || {};

App.initDragDrop = function() {
    var wrapper = document.querySelector('.previews-wrapper');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        wrapper.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        // Don't prevent defaults during reorder
        if (App.isReorderDrag && App.isReorderDrag()) return;
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(function(eventName) {
        wrapper.addEventListener(eventName, function(e) {
            // Don't show drop zone during reorder
            if (App.isReorderDrag && App.isReorderDrag()) return;
            // Only show for file drops
            if (e.dataTransfer && e.dataTransfer.types.indexOf('Files') !== -1) {
                wrapper.classList.add('drag-over');
            }
        }, false);
    });

    ['dragleave', 'drop'].forEach(function(eventName) {
        wrapper.addEventListener(eventName, function() {
            wrapper.classList.remove('drag-over');
        }, false);
    });

    wrapper.addEventListener('drop', function(e) {
        // Don't handle file drops during reorder
        if (App.isReorderDrag && App.isReorderDrag()) return;
        var files = e.dataTransfer.files;
        if (files.length > 0) {
            App.handleScreenshots(files);
        }
    }, false);
};
