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

    // Generate sidebar platforms from config
    App.initSidebarPlatforms();

    // Initialize format dropdown for default platform
    App.updateFormatDropdown();

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
});

window.addEventListener('resize', function() { App.renderAllPreviews(); });
