// ============================================
// Screenshot Studio - Entry Point
// ============================================

// Theme management
function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (saved === 'light' || (!saved && !prefersDark)) {
        document.documentElement.classList.add('light');
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Initialize theme before DOM ready to avoid flash
initTheme();

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Lucide icons
    lucide.createIcons();

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Undo button
    document.getElementById('undoBtn').addEventListener('click', function() { App.Undo.undo(); });

    // Generate sidebar platforms from config
    App.initSidebarPlatforms();

    // Initialize platform select in toolbar
    App.updatePlatformSelect();

    // Populate font selects (filtered by OS)
    App.populateFontSelects();

    App.initEventListeners();
    App.initDragDrop();
    App.initReorder();
    App.initAITranslateEvents();

    // Load persisted data from IndexedDB
    await App.Storage.init();
    await App.Storage.loadAll();

    // Update AI translate button state after loading data
    App.updateTranslateButtonState();

    App.updateSettingsUI();
    App.renderAllPreviews();

    // Capture initial state for undo
    App.Undo.capture();

    // Scroll to active screenshot on load
    var container = document.getElementById('previewsContainer');
    var activeIndex = App.getActiveIndex();
    var items = container.querySelectorAll('.preview-item');
    if (items[activeIndex]) {
        items[activeIndex].scrollIntoView({ inline: 'center', block: 'nearest' });
    }
});

// Throttle resize with requestAnimationFrame to avoid excessive renders
var resizeRafId = null;
window.addEventListener('resize', function() {
    if (resizeRafId) return;
    resizeRafId = requestAnimationFrame(function() {
        App.renderAllPreviews();
        resizeRafId = null;
    });
});
