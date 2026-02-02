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

document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Initialize format dropdown for default platform
    App.updateFormatDropdown();

    App.initEventListeners();
    App.initDragDrop();
    App.updateSettingsUI();
    App.renderAllPreviews();
});

// Throttled resize handler for better performance
window.addEventListener('resize', App.throttle(function() {
    App.scheduleRender();
}, 100));
