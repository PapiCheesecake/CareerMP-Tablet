/* ============================================
   CareerMP Tablet — Application Logic
   ============================================ */

(function () {
  'use strict';

  // --- Tab Navigation ---
  const sidebar = document.getElementById('sidebar');
  const navItems = sidebar.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');

  function switchPage(pageName) {
    // Update nav items
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });

    // Update pages
    pages.forEach(page => {
      const isTarget = page.id === 'page-' + pageName;
      page.classList.toggle('active', isTarget);
    });
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchPage(item.dataset.page);
    });
  });

  // --- Toggle Switches, Toast Prompt & Reposition/Resize ---
  const tablet = document.getElementById('tablet');
  const toastOverlay = document.getElementById('toast-overlay');
  const toastText = document.getElementById('toast-text');
  let activeMode = null; // 'reposition' or 'resize'

  // Store original and current transform state
  let savedPos = { x: 0, y: 0 };
  let savedScale = 1;
  let currentPos = { x: 0, y: 0 };
  let currentScale = 1;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  function applyTransform() {
    tablet.style.transform = 'translateY(-50%) translate(' + currentPos.x + 'px, ' + currentPos.y + 'px) scale(' + currentScale + ')';
  }

  function showToast(message) {
    toastText.textContent = message;
    toastOverlay.classList.add('visible');
  }

  function hideToast() {
    toastOverlay.classList.remove('visible');
  }

  function enterMode(mode) {
    // Save current state so ESC can revert
    savedPos = { x: currentPos.x, y: currentPos.y };
    savedScale = currentScale;
    activeMode = mode;

    if (mode === 'reposition') {
      tablet.style.cursor = 'grab';
      showToast('Drag to move — SPACE to confirm — ESC to cancel');
    } else {
      tablet.style.cursor = 'ew-resize';
      showToast('Move mouse left/right to resize — SPACE to confirm — ESC to cancel');
    }
  }

  function exitMode(confirm) {
    if (!confirm) {
      // Revert to saved state
      currentPos = { x: savedPos.x, y: savedPos.y };
      currentScale = savedScale;
      applyTransform();
    }
    // Turn off toggle
    const toggleEl = document.getElementById('toggle-' + activeMode);
    if (toggleEl) toggleEl.classList.remove('on');
    activeMode = null;
    isDragging = false;
    tablet.style.cursor = '';
    hideToast();
  }

  window.toggleSwitch = function (el) {
    const id = el.id;

    // Special handling for reposition and resize
    if (id === 'toggle-reposition' || id === 'toggle-resize') {
      const mode = id === 'toggle-reposition' ? 'reposition' : 'resize';

      if (el.classList.contains('on')) {
        // Turning off — cancel
        el.classList.remove('on');
        if (activeMode === mode) exitMode(false);
      } else {
        // Cancel any other active mode first
        if (activeMode) exitMode(false);
        el.classList.add('on');
        enterMode(mode);
      }
      return;
    }

    // Default toggle behavior
    el.classList.toggle('on');
  };

  // --- Mouse handlers for reposition & resize ---
  document.addEventListener('mousedown', (e) => {
    if (activeMode === 'reposition') {
      isDragging = true;
      dragStart = { x: e.clientX - currentPos.x, y: e.clientY - currentPos.y };
      tablet.style.cursor = 'grabbing';
      e.preventDefault();
    }
    if (activeMode === 'resize') {
      isDragging = true;
      dragStart = { x: e.clientX };
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    if (activeMode === 'reposition') {
      currentPos.x = e.clientX - dragStart.x;
      currentPos.y = e.clientY - dragStart.y;
      applyTransform();
    }

    if (activeMode === 'resize') {
      const delta = (e.clientX - dragStart.x) * 0.003;
      dragStart.x = e.clientX;
      currentScale = Math.max(0.4, Math.min(2.0, currentScale + delta));
      applyTransform();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      if (activeMode === 'reposition') tablet.style.cursor = 'grab';
    }
  });

  // Listen for SPACE to confirm, ESC to cancel
  document.addEventListener('keydown', (e) => {
    if (activeMode && e.key === ' ') {
      e.preventDefault();
      exitMode(true); // confirm
    }

    if (activeMode && e.key === 'Escape') {
      e.preventDefault();
      exitMode(false); // revert
    }
  });

  // --- Job Item Click Feedback ---
  document.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('click', () => {
      // Brief pulse animation
      item.style.borderColor = 'rgba(232, 148, 58, 0.5)';
      item.style.boxShadow = '0 0 12px rgba(232, 148, 58, 0.15)';
      setTimeout(() => {
        item.style.borderColor = '';
        item.style.boxShadow = '';
      }, 600);
    });
  });

  // --- Button Click Ripple ---
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Visual press feedback
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 150);
    });
  });

  // --- Expose API surface for future BeamNG/Lua integration ---
  window.careerMP = {
    // Update header stats from Lua
    updateBalance: function (amount) {
      const el = document.getElementById('header-balance');
      if (el) el.textContent = '$' + Number(amount).toLocaleString();
    },

    updateLevel: function (level) {
      const el = document.getElementById('header-level');
      if (el) el.textContent = level;
    },

    updateMap: function (mapName) {
      const el = document.getElementById('header-map');
      if (el) el.textContent = mapName;
    },

    // Update connection status
    setStatus: function (title, desc) {
      const titleEl = document.getElementById('home-status-title');
      if (titleEl) titleEl.textContent = title;
    },

    // Navigate to a specific tab programmatically
    navigateTo: function (pageName) {
      switchPage(pageName);
    },

    // Update player name
    setPlayerName: function (name) {
      const el = document.getElementById('profile-name');
      if (el) el.textContent = name;
    }
  };

  // --- Keyboard shortcut: Tab key to cycle pages ---
  const pageOrder = ['home', 'jobs', 'tasks', 'vehicles', 'map', 'recovery', 'profile', 'settings'];

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentNav = sidebar.querySelector('.nav-item.active');
      const currentPage = currentNav ? currentNav.dataset.page : 'home';
      const currentIndex = pageOrder.indexOf(currentPage);
      const nextIndex = (currentIndex + 1) % pageOrder.length;
      switchPage(pageOrder[nextIndex]);
    }
  });
  // --- Sub-Tab Navigation (Jobs page) ---
  const subtabBar = document.getElementById('jobs-subtab-bar');
  if (subtabBar) {
    const subtabs = subtabBar.querySelectorAll('.subtab');
    const subtabPages = document.querySelectorAll('.subtab-page');

    subtabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.subtab;

        // Update tabs — add checkmark to active
        subtabs.forEach(t => {
          t.classList.remove('active');
          t.textContent = t.textContent.replace(' ✓', '');
        });
        tab.classList.add('active');
        tab.textContent = tab.textContent + ' ✓';

        // Update pages
        subtabPages.forEach(page => {
          page.classList.toggle('active', page.id === 'subtab-' + target);
        });
      });
    });
  }

  // --- Facility Selector ---
  const facilityChips = document.querySelectorAll('.facility-chip');
  const facilityNameEl = document.getElementById('facility-name');

  facilityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      facilityChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      // Update header with facility name
      if (facilityNameEl) {
        facilityNameEl.textContent = chip.textContent;
      }
    });
  });

})();
