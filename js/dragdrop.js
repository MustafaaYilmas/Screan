// ============================================
// Drag & Drop
// ============================================

var App = window.App || {};

App.initDragDrop = function() {
    var wrapper = document.querySelector('.previews-wrapper');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        wrapper.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(function(eventName) {
        wrapper.addEventListener(eventName, function() { wrapper.classList.add('drag-over'); }, false);
    });

    ['dragleave', 'drop'].forEach(function(eventName) {
        wrapper.addEventListener(eventName, function() { wrapper.classList.remove('drag-over'); }, false);
    });

    wrapper.addEventListener('drop', function(e) {
        var files = e.dataTransfer.files;
        App.handleScreenshots(files);
    }, false);
};
