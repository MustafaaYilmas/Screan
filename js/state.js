// ============================================
// État de l'application
// ============================================

var App = window.App || {};

App.state = {
    screenshots: [],
    activeIndex: 0,
    exportFormats: ['iphone-6.9', 'ipad-13']
};

App.currentFormat = 'iphone-6.9';

App.setCurrentFormat = function(format) {
    App.currentFormat = format;
};

App.getActiveSettings = function() {
    var screenshot = App.state.screenshots[App.state.activeIndex];
    return screenshot ? screenshot.settings : App.DEFAULT_SETTINGS;
};

App.updateExportButton = function() {
    document.getElementById('exportBtn').disabled = App.state.screenshots.length === 0 || App.state.exportFormats.length === 0;
};
