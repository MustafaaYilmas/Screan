// ============================================
// Screenshot Reorder (Drag & Drop)
// ============================================

var App = window.App || {};

App._reorder = {
    container: null,
    draggingItem: null,
    isReordering: false,
    initialOrder: [],
    startX: 0,
    startY: 0
};

App.initReorder = function() {
    var container = document.getElementById('previewsContainer');
    if (!container) return;

    App._reorder.container = container;

    container.addEventListener('dragstart', App._onDragStart);
    container.addEventListener('dragend', App._onDragEnd);
    container.addEventListener('dragover', App._onDragOver);
};

App._onDragStart = function(e) {
    var item = e.target.closest('.preview-item');
    if (!item) return;

    var r = App._reorder;
    r.draggingItem = item;
    r.isReordering = true;
    r.startX = e.clientX;
    r.startY = e.clientY;

    // Store initial order for data sync
    r.initialOrder = Array.from(r.container.querySelectorAll('.preview-item')).map(function(el) {
        return parseInt(el.dataset.index, 10);
    });

    // Delay to allow drag image to be captured
    setTimeout(function() {
        item.classList.add('dragging');
    }, 0);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'reorder');
};

App._onDragEnd = function(e) {
    var r = App._reorder;
    if (!r.draggingItem) return;

    r.draggingItem.classList.remove('dragging');

    // Get new order from DOM
    var newOrder = Array.from(r.container.querySelectorAll('.preview-item')).map(function(el) {
        return parseInt(el.dataset.index, 10);
    });

    // Find what changed
    var fromIndex = -1;
    var toIndex = -1;

    for (var i = 0; i < r.initialOrder.length; i++) {
        if (r.initialOrder[i] !== newOrder[i]) {
            // Find the dragged item's original and new position
            var draggedDataIndex = parseInt(r.draggingItem.dataset.index, 10);
            fromIndex = r.initialOrder.indexOf(draggedDataIndex);
            toIndex = newOrder.indexOf(draggedDataIndex);
            break;
        }
    }

    r.draggingItem = null;
    r.isReordering = false;
    r.initialOrder = [];

    // Apply the reorder to data
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        App.moveScreenshot(fromIndex, toIndex);
    }
};

App._onDragOver = function(e) {
    var r = App._reorder;
    if (!r.draggingItem) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    var afterElement = App._getDragAfterElement(r.container, e.clientX);

    // Check if we need to move
    var needsMove = false;
    if (afterElement === null) {
        needsMove = r.draggingItem.nextElementSibling !== null;
    } else if (afterElement !== r.draggingItem) {
        needsMove = r.draggingItem.nextElementSibling !== afterElement;
    }

    if (!needsMove) return;

    // FLIP animation: First - record positions before move
    var items = Array.from(r.container.querySelectorAll('.preview-item:not(.dragging)'));
    var firstPositions = new Map();
    items.forEach(function(item) {
        firstPositions.set(item, item.getBoundingClientRect().left);
    });

    // Move the element
    if (afterElement === null) {
        r.container.appendChild(r.draggingItem);
    } else {
        r.container.insertBefore(r.draggingItem, afterElement);
    }

    // FLIP animation: Last & Invert & Play
    items.forEach(function(item) {
        var firstLeft = firstPositions.get(item);
        var lastLeft = item.getBoundingClientRect().left;
        var deltaX = firstLeft - lastLeft;

        if (deltaX !== 0) {
            // Invert: move to old position instantly
            item.style.transition = 'none';
            item.style.transform = 'translateX(' + deltaX + 'px)';

            // Play: animate to new position
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    item.style.transition = 'transform 0.15s ease';
                    item.style.transform = '';
                });
            });
        }
    });
};

App._getDragAfterElement = function(container, x) {
    var draggableElements = Array.from(
        container.querySelectorAll('.preview-item:not(.dragging)')
    );

    var result = draggableElements.reduce(function(closest, child) {
        var box = child.getBoundingClientRect();
        var offset = x - box.left - box.width / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY, element: null });

    return result.element;
};

App.setupReorderItem = function(item, index, container) {
    item.setAttribute('draggable', 'true');
    item.dataset.index = index;
};

App.isReorderDrag = function() {
    return App._reorder.isReordering;
};
