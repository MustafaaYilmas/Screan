// ============================================
// Screenshot Studio - Point d'entrée
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

    App.initEventListeners();
    App.initDragDrop();
    App.updateSettingsUI();
    App.renderAllPreviews();
});

window.addEventListener('resize', function() { App.renderAllPreviews(); });
