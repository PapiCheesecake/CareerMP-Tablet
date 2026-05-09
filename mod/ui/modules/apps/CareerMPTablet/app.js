angular.module('beamng.apps')
  .directive('careerMpTablet', [function () {
    return {
      templateUrl: '/ui/modules/apps/CareerMPTablet/app.html',
      replace: true,
      restrict: 'EA',
      link: function (scope, element, attrs) {

        // ===== Load CSS =====
        var cssId = 'careerMPTablet-css';
        if (!document.getElementById(cssId)) {
          var link = document.createElement('link');
          link.id = cssId;
          link.rel = 'stylesheet';
          link.href = '/ui/modules/apps/CareerMPTablet/app.css';
          document.head.appendChild(link);
        }

        console.log('[CareerMPTablet] App directive loaded successfully');

        // ===== Settings State =====
        var settings = {
          useMiles: false,
          notifications: true,
          notificationPosition: 'bottom-right',
          left: null,
          top: null,
          width: null,
          height: null
        };

        // ===== Notification Popup =====
        var notifContainer = element[0].querySelector('#notif-container');

        function showNotification(message, type) {
          if (!settings.notifications && type !== 'settings') return;
          if (!notifContainer) return;

          var notif = document.createElement('div');
          notif.className = 'notif-popup notif-' + (type || 'info');
          notif.innerHTML = '<span class="notif-icon">' +
            (type === 'success' ? '\u2713' : type === 'warning' ? '\u26A0' : type === 'error' ? '\u2717' : '\u2139') +
            '</span><span class="notif-text">' + message + '</span>';

          notifContainer.appendChild(notif);

          // Trigger animation on next frame
          requestAnimationFrame(function () {
            notif.classList.add('show');
          });

          // Auto-dismiss after 3 seconds
          setTimeout(function () {
            notif.classList.remove('show');
            notif.classList.add('hide');
            setTimeout(function () {
              if (notif.parentNode) notif.parentNode.removeChild(notif);
            }, 300);
          }, 3000);
        }

        function updateNotifPosition() {
          if (!notifContainer) return;
          notifContainer.style.top = '';
          notifContainer.style.bottom = '';
          notifContainer.style.left = '';
          notifContainer.style.right = '';
          notifContainer.className = 'notif-container notif-pos-' + settings.notificationPosition;
        }

        // ===== Visibility Toggle =====
        element[0].style.display = 'none'; // start hidden by default
        scope.$on('careerMPTabletToggle', function (event, visible) {
          console.log('[CareerMPTablet] Toggle event received:', visible);
          element[0].style.display = visible ? '' : 'none';
        });

        // ===== Settings Persistence =====
        if (typeof bngApi !== 'undefined') {
          bngApi.engineLua('extensions.career_careerMPTablet.requestSettings()');
        }

        scope.$on('careerMPTabletSettings', function (event, savedSettings) {
          console.log('[CareerMPTablet] Settings loaded:', savedSettings);
          if (!savedSettings) return;

          if (savedSettings.useMiles !== undefined) {
            settings.useMiles = savedSettings.useMiles;
            var milesToggle = element[0].querySelector('#toggle-miles');
            if (milesToggle) {
              if (settings.useMiles) milesToggle.classList.add('on');
              else milesToggle.classList.remove('on');
            }
          }
          if (savedSettings.notifications !== undefined) {
            settings.notifications = savedSettings.notifications;
            var notifToggle = element[0].querySelector('#toggle-notifications');
            if (notifToggle) {
              if (settings.notifications) notifToggle.classList.add('on');
              else notifToggle.classList.remove('on');
            }
          }
          if (savedSettings.notificationPosition) {
            settings.notificationPosition = savedSettings.notificationPosition;
            // Update custom dropdown display
            var selected = element[0].querySelector('#notif-position-selected');
            if (selected) {
              selected.textContent = savedSettings.notificationPosition.replace('-', ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
            }
            // Update active option
            var options = element[0].querySelectorAll('#notif-position-options .dropdown-option');
            options.forEach(function (opt) {
              opt.classList.remove('active');
              if (opt.getAttribute('data-value') === savedSettings.notificationPosition) {
                opt.classList.add('active');
              }
            });
            updateNotifPosition();
          }

          // Apply saved position/size to the bng-app container
          var container = getBngAppContainer();
          if (container) {
            if (savedSettings.left) container.style.left = savedSettings.left;
            if (savedSettings.top) container.style.top = savedSettings.top;
            if (savedSettings.width) container.style.width = savedSettings.width;
            if (savedSettings.height) container.style.height = savedSettings.height;
            if (savedSettings.left || savedSettings.top) {
              container.style.right = '';
              container.style.bottom = '';
              container.style.margin = '';
            }
          }
        });

        function saveSettingsToLua() {
          var container = getBngAppContainer();
          var saveData = {
            useMiles: settings.useMiles,
            notifications: settings.notifications,
            notificationPosition: settings.notificationPosition,
            left: container ? container.style.left : null,
            top: container ? container.style.top : null,
            width: container ? container.style.width : null,
            height: container ? container.style.height : null
          };
          if (typeof bngApi !== 'undefined') {
            bngApi.engineLua('extensions.career_careerMPTablet.saveSettings(' + bngApi.serializeToLua(saveData) + ')');
            console.log('[CareerMPTablet] Settings saved to Lua');
          } else {
            console.log('[CareerMPTablet] bngApi not available, cannot save settings');
          }
        }

        // ===== Tab Navigation =====
        var navItems = element[0].querySelectorAll('.nav-item');
        var pages = element[0].querySelectorAll('.page');

        navItems.forEach(function (item) {
          item.addEventListener('click', function () {
            var targetPage = this.getAttribute('data-page');
            navItems.forEach(function (n) { n.classList.remove('active'); });
            this.classList.add('active');
            pages.forEach(function (p) { p.classList.remove('active'); });
            var target = element[0].querySelector('#page-' + targetPage);
            if (target) target.classList.add('active');

            // Request fresh recovery data when switching to recovery tab
            if (targetPage === 'recovery' && typeof bngApi !== 'undefined') {
              bngApi.engineLua('extensions.career_careerMPTablet.getRecoveryData()');
            }
          });
        });

        // ===== Jobs Sub-Tab Navigation =====
        var subtabBar = element[0].querySelector('#jobs-subtab-bar');
        if (subtabBar) {
          var subtabs = subtabBar.querySelectorAll('.subtab');
          var subtabPages = element[0].querySelectorAll('.subtab-page');
          subtabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
              var targetSubtab = this.getAttribute('data-subtab');
              subtabs.forEach(function (t) { t.classList.remove('active'); });
              this.classList.add('active');
              subtabPages.forEach(function (p) { p.classList.remove('active'); });
              var target = element[0].querySelector('#subtab-' + targetSubtab);
              if (target) target.classList.add('active');
            });
          });
        }

        // ===== Facility Selector =====
        var facilityChips = element[0].querySelectorAll('.facility-chip');
        var facilityName = element[0].querySelector('#facility-name');
        facilityChips.forEach(function (chip) {
          chip.addEventListener('click', function () {
            facilityChips.forEach(function (c) { c.classList.remove('active'); });
            this.classList.add('active');
            if (facilityName) facilityName.textContent = this.textContent;
          });
        });

        // ===== Find the bng-app container =====
        function getBngAppContainer() {
          var el = element[0];
          while (el && el.parentElement) {
            el = el.parentElement;
            if (el.tagName === 'BNG-APP' || el.classList.contains('bng-app')) {
              return el;
            }
          }
          return null;
        }

        // ===== Toast Prompt (with clickable buttons) =====
        var toastOverlay = element[0].querySelector('#toast-overlay');
        var toastText = element[0].querySelector('#toast-text');
        var toastConfirmBtn = element[0].querySelector('#toast-confirm');
        var toastCancelBtn = element[0].querySelector('#toast-cancel');

        function showToast(message) {
          if (toastText) toastText.textContent = message;
          if (toastOverlay) {
            toastOverlay.style.opacity = '1';
            toastOverlay.style.pointerEvents = 'auto';
          }
        }

        function hideToast() {
          if (toastOverlay) {
            toastOverlay.style.opacity = '0';
            toastOverlay.style.pointerEvents = 'none';
          }
        }

        // Toast button handlers
        if (toastConfirmBtn) {
          toastConfirmBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (activeMode === 'reposition') stopReposition(true);
            else if (activeMode === 'resize') stopResize(true);
          });
        }
        if (toastCancelBtn) {
          toastCancelBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (activeMode === 'reposition') stopReposition(false);
            else if (activeMode === 'resize') stopResize(false);
          });
        }

        // ===== Reposition Mode =====
        var activeMode = null;
        var isDragging = false;
        var dragStartX = 0, dragStartY = 0;
        var origLeft = 0, origTop = 0;
        var origWidth = 0, origHeight = 0, resizeStartX = 0;

        function onMouseDownReposition(e) {
          // Don't drag if clicking a toast button
          if (e.target.id === 'toast-confirm' || e.target.id === 'toast-cancel') return;
          isDragging = true;
          var container = getBngAppContainer();
          if (container) {
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            origLeft = container.offsetLeft;
            origTop = container.offsetTop;
            container.style.cursor = 'grabbing';
          }
          e.preventDefault();
        }

        function onMouseMoveReposition(e) {
          if (!isDragging) return;
          var container = getBngAppContainer();
          if (container) {
            var dx = e.clientX - dragStartX;
            var dy = e.clientY - dragStartY;
            container.style.left = (origLeft + dx) + 'px';
            container.style.top = (origTop + dy) + 'px';
            container.style.right = '';
            container.style.bottom = '';
            container.style.margin = '';
          }
        }

        function onMouseUpReposition() {
          isDragging = false;
          var container = getBngAppContainer();
          if (container && activeMode === 'reposition') container.style.cursor = 'grab';
        }

        function startReposition() {
          activeMode = 'reposition';
          var container = getBngAppContainer();
          if (container) {
            container.style.cursor = 'grab';
            origLeft = container.offsetLeft;
            origTop = container.offsetTop;
          }
          showToast('Drag to reposition');
          document.addEventListener('mousedown', onMouseDownReposition, true);
          document.addEventListener('mousemove', onMouseMoveReposition, true);
          document.addEventListener('mouseup', onMouseUpReposition, true);
        }

        function stopReposition(confirm) {
          document.removeEventListener('mousedown', onMouseDownReposition, true);
          document.removeEventListener('mousemove', onMouseMoveReposition, true);
          document.removeEventListener('mouseup', onMouseUpReposition, true);
          isDragging = false;
          var container = getBngAppContainer();
          if (container) {
            container.style.cursor = '';
            if (!confirm) {
              container.style.left = origLeft + 'px';
              container.style.top = origTop + 'px';
            } else {
              saveSettingsToLua();
              showNotification('Position saved', 'success');
            }
          }
          activeMode = null;
          hideToast();
          var toggle = element[0].querySelector('#toggle-reposition');
          if (toggle) toggle.classList.remove('on');
        }

        // ===== Resize Mode =====
        function onMouseDownResize(e) {
          if (e.target.id === 'toast-confirm' || e.target.id === 'toast-cancel') return;
          isDragging = true;
          var container = getBngAppContainer();
          if (container) {
            resizeStartX = e.clientX;
            origWidth = container.offsetWidth;
            origHeight = container.offsetHeight;
          }
          e.preventDefault();
        }

        function onMouseMoveResize(e) {
          if (!isDragging) return;
          var container = getBngAppContainer();
          if (container) {
            var dx = e.clientX - resizeStartX;
            var newWidth = Math.max(400, Math.min(1600, origWidth + dx));
            var newHeight = Math.round(newWidth * (620 / 960));
            newHeight = Math.max(300, Math.min(1000, newHeight));
            container.style.width = newWidth + 'px';
            container.style.height = newHeight + 'px';
          }
        }

        function onMouseUpResize() {
          isDragging = false;
        }

        function startResize() {
          activeMode = 'resize';
          var container = getBngAppContainer();
          if (container) {
            container.style.cursor = 'ew-resize';
            origWidth = container.offsetWidth;
            origHeight = container.offsetHeight;
          }
          showToast('Drag left/right to resize');
          document.addEventListener('mousedown', onMouseDownResize, true);
          document.addEventListener('mousemove', onMouseMoveResize, true);
          document.addEventListener('mouseup', onMouseUpResize, true);
        }

        function stopResize(confirm) {
          document.removeEventListener('mousedown', onMouseDownResize, true);
          document.removeEventListener('mousemove', onMouseMoveResize, true);
          document.removeEventListener('mouseup', onMouseUpResize, true);
          isDragging = false;
          var container = getBngAppContainer();
          if (container) {
            container.style.cursor = '';
            if (!confirm) {
              container.style.width = origWidth + 'px';
              container.style.height = origHeight + 'px';
            } else {
              saveSettingsToLua();
              showNotification('Size saved', 'success');
            }
          }
          activeMode = null;
          hideToast();
          var toggle = element[0].querySelector('#toggle-resize');
          if (toggle) toggle.classList.remove('on');
        }

        // ===== Custom Dropdown for Notification Position =====
        var dropdownEl = element[0].querySelector('#notif-position-dropdown');
        var dropdownSelected = element[0].querySelector('#notif-position-selected');
        var dropdownOptions = element[0].querySelector('#notif-position-options');

        if (dropdownEl && dropdownSelected && dropdownOptions) {
          // Toggle open/close on click
          dropdownSelected.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownEl.classList.toggle('open');
          });

          // Handle option selection
          var optionEls = dropdownOptions.querySelectorAll('.dropdown-option');
          optionEls.forEach(function (opt) {
            opt.addEventListener('click', function (e) {
              e.stopPropagation();
              var value = this.getAttribute('data-value');
              settings.notificationPosition = value;
              dropdownSelected.textContent = this.textContent;

              // Update active state
              optionEls.forEach(function (o) { o.classList.remove('active'); });
              this.classList.add('active');

              dropdownEl.classList.remove('open');
              updateNotifPosition();
              saveSettingsToLua();
              showNotification('Notifications: ' + this.textContent, 'settings');
            });
          });

          // Close dropdown when clicking elsewhere
          element[0].addEventListener('click', function () {
            dropdownEl.classList.remove('open');
          });
        }

        // Init notification position
        updateNotifPosition();

        // ===== Toggle Switches =====
        element[0].querySelectorAll('.toggle').forEach(function (toggle) {
          toggle.addEventListener('click', function () {
            var setting = this.getAttribute('data-setting');

            // Reposition mode
            if (setting === 'reposition') {
              if (activeMode === 'reposition') { stopReposition(false); return; }
              if (activeMode === 'resize') stopResize(false);
              this.classList.add('on');
              startReposition();
              return;
            }

            // Resize mode
            if (setting === 'resize') {
              if (activeMode === 'resize') { stopResize(false); return; }
              if (activeMode === 'reposition') stopReposition(false);
              this.classList.add('on');
              startResize();
              return;
            }

            // Normal toggles
            this.classList.toggle('on');

            if (setting === 'miles') {
              settings.useMiles = this.classList.contains('on');
              saveSettingsToLua();
              showNotification(
                settings.useMiles ? 'Distance units: Miles' : 'Distance units: Kilometers',
                'settings'
              );
            }

            if (setting === 'notifications') {
              settings.notifications = this.classList.contains('on');
              saveSettingsToLua();
              // Always show this one regardless of the notifications setting
              showNotification(
                settings.notifications ? 'Notifications enabled' : 'Notifications disabled',
                'settings'
              );
            }
          });
        });

        // ===== Button Click Feedback =====
        element[0].querySelectorAll('.btn:not(.toast-btn)').forEach(function (btn) {
          btn.addEventListener('click', function () {
            this.style.transform = 'scale(0.95)';
            var self = this;
            setTimeout(function () { self.style.transform = ''; }, 120);
          });
        });

        // ===== Card Click Feedback =====
        element[0].querySelectorAll('.card[style*="cursor:pointer"]').forEach(function (card) {
          card.addEventListener('click', function () {
            this.style.transform = 'scale(0.98)';
            var self = this;
            setTimeout(function () { self.style.transform = ''; }, 150);
          });
        });

        // ===== API Surface for Lua Communication =====
        scope.$on('careerMPTabletData', function (event, data) {
          if (data.balance !== undefined) {
            var el = element[0].querySelector('#header-balance');
            if (el) el.textContent = Number(data.balance).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2});
          }
          if (data.xp !== undefined) {
            var el = element[0].querySelector('#header-xp');
            if (el) el.textContent = Number(data.xp).toLocaleString('en-US');
          }
          if (data.vehicle !== undefined) {
            var el = element[0].querySelector('#header-vehicle');
            if (el) el.textContent = data.vehicle;
          }
        });

        // ===== Recovery System =====
        var pendingRecoveryAction = null; // stores {action, garageId, label, price}
        var latestRecoveryData = null; // stores latest data from Lua for dynamic prices

        function formatPrice(amount) {
          if (amount === 0) return 'FREE';
          return '\u20BF ' + Number(amount).toFixed(0);
        }

        function updateRecoveryUI(data) {
          latestRecoveryData = data; // cache for button click handlers
          // Update status bar
          var balanceEl = element[0].querySelector('#recovery-balance');
          if (balanceEl) balanceEl.textContent = '\u20BF ' + Number(data.balance).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2});

          var insuranceEl = element[0].querySelector('#recovery-insurance');
          if (insuranceEl) {
            insuranceEl.textContent = data.hasInsurance ? 'Roadside Assist' : 'No Coverage';
            insuranceEl.className = 'rs-value ' + (data.hasInsurance ? 'insurance-yes' : 'insurance-no');
          }

          var vehicleStatusEl = element[0].querySelector('#recovery-vehicle-status');
          if (vehicleStatusEl) {
            if (data.inPursuit) {
              vehicleStatusEl.textContent = 'In Pursuit!';
              vehicleStatusEl.className = 'rs-value vehicle-bad';
            } else if (data.vehicleStopped) {
              vehicleStatusEl.textContent = 'Stopped';
              vehicleStatusEl.className = 'rs-value vehicle-ok';
            } else if (data.vehicleSlow) {
              vehicleStatusEl.textContent = 'Moving Slowly';
              vehicleStatusEl.className = 'rs-value vehicle-warn';
            } else {
              vehicleStatusEl.textContent = 'Too Fast';
              vehicleStatusEl.className = 'rs-value vehicle-bad';
            }
          }

          // Update Tow to Road card
          var towRoadCard = element[0].querySelector('#recovery-tow-road');
          var towRoadBadge = element[0].querySelector('#tow-road-badge');
          var towRoadPrice = element[0].querySelector('#tow-road-price');
          var towRoadReason = element[0].querySelector('#tow-road-reason');
          var btnTowRoad = element[0].querySelector('#btn-tow-road');

          var towRoadEnabled = data.vehicleSlow && !data.inPursuit;
          if (towRoadCard) towRoadCard.classList.toggle('disabled', !towRoadEnabled);
          if (towRoadBadge) {
            towRoadBadge.textContent = towRoadEnabled ? 'Available' : 'Unavailable';
            towRoadBadge.className = 'card-badge ' + (towRoadEnabled ? 'ready' : 'offline');
          }
          if (towRoadPrice) {
            towRoadPrice.innerHTML = data.towToRoadCost === 0
              ? '<span class="price-free">FREE</span> <span style="font-size:11px;color:var(--text-muted);">(Insurance)</span>'
              : '<span class="price-amount">\u20BF ' + data.towToRoadCost + '</span>';
          }
          if (towRoadReason) {
            if (!towRoadEnabled) {
              towRoadReason.style.display = '';
              towRoadReason.textContent = data.inPursuit ? 'Disabled during police chase' : 'Vehicle must be moving slowly';
            } else {
              towRoadReason.style.display = 'none';
            }
          }

          // Update Flip Upright card
          var flipCard = element[0].querySelector('#recovery-flip');
          var flipBadge = element[0].querySelector('#flip-badge');
          var flipPrice = element[0].querySelector('#flip-price');
          var flipReason = element[0].querySelector('#flip-reason');

          var flipEnabled = data.vehicleStopped && !data.inPursuit;
          if (flipCard) flipCard.classList.toggle('disabled', !flipEnabled);
          if (flipBadge) {
            flipBadge.textContent = flipEnabled ? 'Available' : 'Unavailable';
            flipBadge.className = 'card-badge ' + (flipEnabled ? 'ready' : 'offline');
          }
          if (flipPrice) {
            flipPrice.innerHTML = data.flipCost === 0
              ? '<span class="price-free">FREE</span> <span style="font-size:11px;color:var(--text-muted);">(Insurance)</span>'
              : '<span class="price-amount">\u20BF ' + data.flipCost + '</span>';
          }
          if (flipReason) {
            if (!flipEnabled) {
              flipReason.style.display = '';
              flipReason.textContent = data.inPursuit ? 'Disabled during police chase' : 'Vehicle must be completely stopped';
            } else {
              flipReason.style.display = 'none';
            }
          }

          // Build garage tow list
          var garageListEl = element[0].querySelector('#recovery-garage-list');
          if (garageListEl && data.garages) {
            if (data.garages.length === 0) {
              garageListEl.innerHTML = '<div class="card" style="text-align:center;padding:24px;"><div class="card-desc">No garages available on this map.</div></div>';
            } else {
              var html = '';
              var garageEnabled = data.vehicleSlow && !data.inPursuit;
              for (var i = 0; i < data.garages.length; i++) {
                var g = data.garages[i];
                var priceText = g.price === 0 ? 'FREE' : ('\u20BF ' + Number(g.price).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2}));
                var priceClass = g.price === 0 ? 'garage-tow-price free' : 'garage-tow-price';
                html += '<div class="garage-tow-item' + (garageEnabled ? '' : ' disabled') + '">' +
                  '<div class="garage-tow-info">' +
                  '<div class="garage-tow-name">' + g.name + '</div>' +
                  '<div class="' + priceClass + '">' + priceText + '</div>' +
                  '</div>' +
                  '<button class="btn btn-outline btn-tow-garage" data-garage-id="' + g.id + '" data-garage-name="' + g.name + '" data-garage-price="' + g.price + '"' + (garageEnabled ? '' : ' disabled') + '>Tow Here</button>' +
                  '</div>';
              }
              garageListEl.innerHTML = html;

              // Attach click handlers to garage tow buttons
              garageListEl.querySelectorAll('.btn-tow-garage').forEach(function (btn) {
                btn.addEventListener('click', function () {
                  var gId = this.getAttribute('data-garage-id');
                  var gName = this.getAttribute('data-garage-name');
                  var gPrice = parseFloat(this.getAttribute('data-garage-price'));
                  showRecoveryConfirm('towToGarage', gId, 'Tow to ' + gName, gPrice);
                });
              });
            }
          }
        }

        // Confirmation flow
        function showRecoveryConfirm(action, garageId, label, price) {
          pendingRecoveryAction = { action: action, garageId: garageId, label: label, price: price };
          var overlay = element[0].querySelector('#recovery-confirm-overlay');
          var rcTitle = element[0].querySelector('#rc-title');
          var rcDesc = element[0].querySelector('#rc-desc');
          var rcPrice = element[0].querySelector('#rc-price');

          if (rcTitle) rcTitle.textContent = label;
          if (rcDesc) rcDesc.textContent = 'Are you sure you want to proceed with this recovery action?';
          if (rcPrice) {
            if (price === 0) {
              rcPrice.textContent = 'FREE (Insurance)';
              rcPrice.className = 'rc-price free';
            } else {
              rcPrice.textContent = '\u20BF ' + Number(price).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2});
              rcPrice.className = 'rc-price';
            }
          }
          if (overlay) overlay.style.display = '';
        }

        function hideRecoveryConfirm() {
          var overlay = element[0].querySelector('#recovery-confirm-overlay');
          if (overlay) overlay.style.display = 'none';
          pendingRecoveryAction = null;
        }

        function executeRecoveryAction() {
          if (!pendingRecoveryAction) return;
          var act = pendingRecoveryAction;
          hideRecoveryConfirm();

          if (typeof bngApi !== 'undefined') {
            if (act.action === 'towToRoad') {
              bngApi.engineLua('extensions.career_careerMPTablet.recoverToRoad()');
            } else if (act.action === 'flipUpright') {
              bngApi.engineLua('extensions.career_careerMPTablet.flipUpright()');
            } else if (act.action === 'towToGarage') {
              bngApi.engineLua('extensions.career_careerMPTablet.towToGarage("' + act.garageId + '")');
            }
          } else {
            console.log('[CareerMPTablet] bngApi not available — recovery action: ' + act.action);
            showNotification('Recovery: ' + act.label, 'info');
          }
        }

        // Recovery button click handlers
        var btnTowRoad = element[0].querySelector('#btn-tow-road');
        if (btnTowRoad) {
          btnTowRoad.addEventListener('click', function () {
            var price = latestRecoveryData ? latestRecoveryData.towToRoadCost : 75;
            showRecoveryConfirm('towToRoad', null, 'Tow to Nearest Road', price);
          });
        }

        var btnFlip = element[0].querySelector('#btn-flip');
        if (btnFlip) {
          btnFlip.addEventListener('click', function () {
            var price = latestRecoveryData ? latestRecoveryData.flipCost : 50;
            showRecoveryConfirm('flipUpright', null, 'Flip Upright', price);
          });
        }

        // Confirmation dialog buttons
        var rcConfirm = element[0].querySelector('#rc-confirm');
        if (rcConfirm) {
          rcConfirm.addEventListener('click', function (e) {
            e.stopPropagation();
            executeRecoveryAction();
          });
        }

        var rcCancel = element[0].querySelector('#rc-cancel');
        if (rcCancel) {
          rcCancel.addEventListener('click', function (e) {
            e.stopPropagation();
            hideRecoveryConfirm();
          });
        }

        // Listen for recovery data from Lua
        scope.$on('careerMPTabletRecoveryData', function (event, data) {
          console.log('[CareerMPTablet] Recovery data received:', data);
          updateRecoveryUI(data);
        });

        // Listen for recovery action results
        scope.$on('careerMPTabletRecoveryResult', function (event, result) {
          console.log('[CareerMPTablet] Recovery result:', result);
          if (result.success) {
            showNotification(result.message, 'success');
          } else {
            showNotification(result.message, 'error');
          }
        });

        // Listen for profile data from Lua
        scope.$on('careerMPTabletProfileData', function (event, data) {
          console.log('[CareerMPTablet] Profile data received:', data);
          
          var nameEl = element[0].querySelector('#profile-name');
          if (nameEl && data.saveSlot) nameEl.textContent = data.saveSlot;
          
          var serverEl = element[0].querySelector('.profile-server');
          if (serverEl && data.server) serverEl.textContent = data.server;
          
          var bbEl = element[0].querySelector('#profile-beambucks');
          if (bbEl && data.balance !== undefined) bbEl.textContent = Number(data.balance).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2});
          
          var xpEl = element[0].querySelector('#profile-xp');
          if (xpEl && data.xp !== undefined) xpEl.textContent = Number(data.xp).toLocaleString('en-US');
          
          var bonusEl = element[0].querySelector('#profile-bonus');
          if (bonusEl && data.vouchers !== undefined) bonusEl.textContent = Number(data.vouchers).toLocaleString('en-US');
          
          // Rebuild career paths
          var gridEl = element[0].querySelector('#career-paths-grid');
          if (gridEl && data.branches && data.branches.length > 0) {
            var html = '';
            for (var i = 0; i < data.branches.length; i++) {
              var b = data.branches[i];
              // Clamp progress to 100% maximum for visual styling
              var pct = Math.min(100, Math.max(0, b.percent));
              html += '<div class="card">' +
                '<div class="card-header">' +
                '<span class="card-title">' + b.icon + ' ' + b.name + '</span>' +
                '<span class="card-badge pending">Level ' + b.level + '</span>' +
                '</div>' +
                '<div class="card-desc">Current Progress</div>' +
                '<div class="progress-bar">' +
                '<div class="progress-fill ' + b.color + '" style="width: ' + pct + '%"></div>' +
                '</div>' +
                '</div>';
            }
            gridEl.innerHTML = html;
          }
        });

        // ===== Canvas Schematic Map =====
        var mapCanvas = element[0].querySelector('#map-canvas');
        var mapCtx = mapCanvas ? mapCanvas.getContext('2d') : null;
        var currentTab = 'home';
        var mapState = {
          data: null, activeWaypoint: null,
          offsetX: 0, offsetY: 0, zoom: 1,
          isDragging: false, dragStartX: 0, dragStartY: 0,
          dragOffsetX: 0, dragOffsetY: 0,
          animFrame: null, pulsePhase: 0,
          roadData: null, roadPaths: null, currentRoadLevel: null,
          lastCw: 0, lastCh: 0, updateInterval: null
        };
        var MC = {
          bg: '#0d1017', grid: 'rgba(255,255,255,0.04)',
          dealership: '#60a5fa', garage: '#34d399', computer: '#a78bfa',
          player: '#e8943a', playerGlow: 'rgba(232,148,58,0.3)',
          waypointLine: 'rgba(251,191,36,0.4)',
          text: 'rgba(255,255,255,0.7)', textBg: 'rgba(0,0,0,0.6)'
        };

        function buildRoadPaths() {
          if (!mapState.roadData || !mapState.data || !mapState.data.mapBounds) return;
          var b = mapState.data.mapBounds;
          var cw = parseInt(mapCanvas.style.width)||300, ch = parseInt(mapCanvas.style.height)||300;
          
          mapState.lastCw = cw;
          mapState.lastCh = ch;
          
          var scaleX = cw / (b.maxX - b.minX);
          var scaleY = ch / (b.maxY - b.minY);
          
          mapState.roadPaths = [new Path2D(), new Path2D(), new Path2D()];
          
          for (var i = 0; i < mapState.roadData.length; i += 5) {
            var t = mapState.roadData[i+4] - 1;
            if (t >= 0 && t <= 2) {
              var nx1 = (mapState.roadData[i] - b.minX) * scaleX;
              var ny1 = (b.maxY - mapState.roadData[i+1]) * scaleY;
              var nx2 = (mapState.roadData[i+2] - b.minX) * scaleX;
              var ny2 = (b.maxY - mapState.roadData[i+3]) * scaleY;
              
              mapState.roadPaths[t].moveTo(nx1, ny1);
              mapState.roadPaths[t].lineTo(nx2, ny2);
            }
          }
        }

        function resizeMapCanvas() {
          if (!mapCanvas) return;
          var ct = mapCanvas.parentElement; if (!ct) return;
          var dpr = window.devicePixelRatio || 1;
          var w = ct.clientWidth, h = ct.clientHeight;
          mapCanvas.width = w * dpr; mapCanvas.height = h * dpr;
          mapCanvas.style.width = w + 'px'; mapCanvas.style.height = h + 'px';
          if (mapCtx) mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          
          if (mapState.lastCw !== w || mapState.lastCh !== h) {
            buildRoadPaths();
          }
        }

        function w2c(wx, wy) {
          if (!mapState.data || !mapState.data.mapBounds) return {x:0,y:0};
          var b = mapState.data.mapBounds;
          var cw = parseInt(mapCanvas.style.width)||300, ch = parseInt(mapCanvas.style.height)||300;
          var nx = (wx - b.minX) / (b.maxX - b.minX);
          var ny = 1 - (wy - b.minY) / (b.maxY - b.minY);
          return { x: nx * cw * mapState.zoom + mapState.offsetX, y: ny * ch * mapState.zoom + mapState.offsetY };
        }

        function drawRoundRect(x, y, w, h, r) {
          mapCtx.beginPath();
          mapCtx.moveTo(x+r,y); mapCtx.lineTo(x+w-r,y);
          mapCtx.quadraticCurveTo(x+w,y,x+w,y+r); mapCtx.lineTo(x+w,y+h-r);
          mapCtx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); mapCtx.lineTo(x+r,y+h);
          mapCtx.quadraticCurveTo(x,y+h,x,y+h-r); mapCtx.lineTo(x,y+r);
          mapCtx.quadraticCurveTo(x,y,x+r,y);
        }

        function drawLabel(x, y, text, color) {
          mapCtx.font = '600 9px Inter, sans-serif';
          var tw = mapCtx.measureText(text).width;
          drawRoundRect(x-tw/2-4, y-8, tw+8, 14, 4);
          mapCtx.fillStyle = MC.textBg; mapCtx.fill();
          mapCtx.fillStyle = color || MC.text;
          mapCtx.textAlign = 'center'; mapCtx.textBaseline = 'middle';
          mapCtx.fillText(text, x, y);
        }

        function drawPOI(poi, color) {
          if (!poi.pos) return;
          var p = w2c(poi.pos.x, poi.pos.y);
          mapCtx.beginPath(); mapCtx.arc(p.x, p.y, 6, 0, Math.PI*2);
          mapCtx.fillStyle = color; mapCtx.fill();
          mapCtx.strokeStyle = 'rgba(255,255,255,0.3)'; mapCtx.lineWidth = 1; mapCtx.stroke();
          var name = poi.name || '?';
          if (name.length > 20) name = name.substring(0,18) + '..';
          drawLabel(p.x, p.y - 14, name, color);
        }

        function drawMap() {
          if (!mapCtx || !mapCanvas) return;
          var cw = parseInt(mapCanvas.style.width)||300, ch = parseInt(mapCanvas.style.height)||300;
          mapCtx.clearRect(0, 0, cw, ch);
          mapCtx.fillStyle = MC.bg; mapCtx.fillRect(0, 0, cw, ch);
          var grad = mapCtx.createRadialGradient(cw/2,ch/2,0,cw/2,ch/2,cw*0.7);
          grad.addColorStop(0,'rgba(52,211,153,0.03)');
          grad.addColorStop(1,'transparent');
          mapCtx.fillStyle = grad; mapCtx.fillRect(0, 0, cw, ch);

          if (!mapState.data || !mapState.data.mapBounds) {
            mapCtx.fillStyle = 'rgba(255,255,255,0.3)';
            mapCtx.font = '14px Inter, sans-serif'; mapCtx.textAlign = 'center';
            mapCtx.fillText('Waiting for map data...', cw/2, ch/2);
            return;
          }

          // Grid
          var gs = 50 * mapState.zoom; if (gs<15) gs*=2; if (gs<15) gs*=2;
          mapCtx.beginPath(); mapCtx.strokeStyle = MC.grid; mapCtx.lineWidth = 0.5;
          for (var gx = mapState.offsetX%gs; gx < cw; gx += gs) { mapCtx.moveTo(gx,0); mapCtx.lineTo(gx,ch); }
          for (var gy = mapState.offsetY%gs; gy < ch; gy += gs) { mapCtx.moveTo(0,gy); mapCtx.lineTo(cw,gy); }
          mapCtx.stroke();

          // Roads
          if (mapState.roadPaths) {
            // Make roads significantly brighter and thicker for a true schematic map look
            var colors = ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)'];
            var widths = [3.5, 2.0, 1.0];
            mapCtx.save();
            mapCtx.translate(mapState.offsetX, mapState.offsetY);
            mapCtx.scale(mapState.zoom, mapState.zoom);
            
            // To prevent lines from scaling up massively when zooming in,
            // we divide lineWidth by the current zoom level.
            for (var t = 0; t < 3; t++) {
              mapCtx.strokeStyle = colors[t];
              mapCtx.lineWidth = widths[t] / mapState.zoom;
              mapCtx.lineCap = 'round';
              mapCtx.lineJoin = 'round';
              mapCtx.stroke(mapState.roadPaths[t]);
            }
            mapCtx.restore();
          }

          // Waypoint line
          if (mapState.data.route && mapState.data.route.length > 0) {
            mapCtx.beginPath();
            mapCtx.setLineDash([6,4]);
            mapCtx.strokeStyle = MC.waypointLine;
            mapCtx.lineWidth = 3;
            var pt = w2c(mapState.data.route[0], mapState.data.route[1]);
            mapCtx.moveTo(pt.x, pt.y);
            for (var i = 2; i < mapState.data.route.length; i += 2) {
              pt = w2c(mapState.data.route[i], mapState.data.route[i+1]);
              mapCtx.lineTo(pt.x, pt.y);
            }
            mapCtx.stroke();
            mapCtx.setLineDash([]);
          } else if (mapState.data.playerPos && mapState.activeWaypoint && mapState.activeWaypoint.pos) {
            var pl = w2c(mapState.data.playerPos.x, mapState.data.playerPos.y);
            var wl = w2c(mapState.activeWaypoint.pos.x, mapState.activeWaypoint.pos.y);
            mapCtx.beginPath(); mapCtx.setLineDash([6,4]);
            mapCtx.strokeStyle = MC.waypointLine; mapCtx.lineWidth = 2;
            mapCtx.moveTo(pl.x, pl.y); mapCtx.lineTo(wl.x, wl.y);
            mapCtx.stroke(); mapCtx.setLineDash([]);
          }

          // POIs
          if (mapState.data.garages) mapState.data.garages.forEach(function(g) {
            drawPOI(g, g.isComputer ? MC.computer : MC.garage);
          });
          if (mapState.data.dealerships) mapState.data.dealerships.forEach(function(d) {
            drawPOI(d, MC.dealership);
          });

          // Active waypoint pulse
          if (mapState.activeWaypoint && mapState.activeWaypoint.pos) {
            var wp = w2c(mapState.activeWaypoint.pos.x, mapState.activeWaypoint.pos.y);
            var pulse = 0.5 + Math.sin(mapState.pulsePhase*2) * 0.5;
            mapCtx.beginPath(); mapCtx.arc(wp.x, wp.y, 16 + pulse*6, 0, Math.PI*2);
            mapCtx.strokeStyle = 'rgba(251,191,36,' + (0.3+pulse*0.3) + ')';
            mapCtx.lineWidth = 2; mapCtx.stroke();
          }

          // Player
          if (mapState.data.playerPos) {
            var pp = w2c(mapState.data.playerPos.x, mapState.data.playerPos.y);
            var pp2 = 0.5 + Math.sin(mapState.pulsePhase*3) * 0.5;
            mapCtx.beginPath(); mapCtx.arc(pp.x, pp.y, 12+pp2*4, 0, Math.PI*2);
            mapCtx.fillStyle = 'rgba(232,148,58,' + (0.1+pp2*0.15) + ')'; mapCtx.fill();
            mapCtx.beginPath(); mapCtx.arc(pp.x, pp.y, 8, 0, Math.PI*2);
            mapCtx.fillStyle = MC.playerGlow; mapCtx.fill();
            mapCtx.beginPath(); mapCtx.arc(pp.x, pp.y, 5, 0, Math.PI*2);
            mapCtx.fillStyle = MC.player; mapCtx.fill();
            drawLabel(pp.x, pp.y - 18, 'YOU', MC.player);
          }

          // Legend
          var legs = [{c:MC.dealership,l:'Dealership'},{c:MC.garage,l:'Garage'},{c:MC.computer,l:'Computer'},{c:MC.player,l:'You'}];
          var lx = 12, ly = ch - 12 - legs.length*16;
          drawRoundRect(lx, ly, 90, legs.length*16+8, 4);
          mapCtx.fillStyle = 'rgba(0,0,0,0.5)'; mapCtx.fill();
          mapCtx.font = '500 9px Inter, sans-serif'; mapCtx.textAlign = 'left'; mapCtx.textBaseline = 'middle';
          for (var li = 0; li < legs.length; li++) {
            var iy = ly + 12 + li*16;
            mapCtx.beginPath(); mapCtx.arc(lx+12, iy, 4, 0, Math.PI*2);
            mapCtx.fillStyle = legs[li].c; mapCtx.fill();
            mapCtx.fillStyle = MC.text; mapCtx.fillText(legs[li].l, lx+22, iy);
          }

          mapState.pulsePhase += 0.03;
          mapState.animFrame = requestAnimationFrame(drawMap);
        }

        function startMapAnim() {
          if (mapState.animFrame) return;
          resizeMapCanvas(); drawMap();
        }
        function stopMapAnim() {
          if (mapState.animFrame) { cancelAnimationFrame(mapState.animFrame); mapState.animFrame = null; }
        }

        // Canvas pan & zoom
        if (mapCanvas) {
          mapCanvas.addEventListener('mousedown', function(e) {
            mapState.isDragging = true;
            mapState.dragStartX = e.clientX; mapState.dragStartY = e.clientY;
            mapState.dragOffsetX = mapState.offsetX; mapState.dragOffsetY = mapState.offsetY;
            mapCanvas.style.cursor = 'grabbing'; e.preventDefault();
          });
          mapCanvas.addEventListener('mousemove', function(e) {
            if (!mapState.isDragging) return;
            mapState.offsetX = mapState.dragOffsetX + (e.clientX - mapState.dragStartX);
            mapState.offsetY = mapState.dragOffsetY + (e.clientY - mapState.dragStartY);
          });
          mapCanvas.addEventListener('mouseup', function() { mapState.isDragging = false; mapCanvas.style.cursor = 'grab'; });
          mapCanvas.addEventListener('mouseleave', function() { mapState.isDragging = false; mapCanvas.style.cursor = 'grab'; });
          mapCanvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            var old = mapState.zoom;
            mapState.zoom = e.deltaY < 0 ? Math.min(5, old*1.1) : Math.max(0.3, old*0.9);
            var rect = mapCanvas.getBoundingClientRect();
            var mx = e.clientX - rect.left, my = e.clientY - rect.top;
            var r = mapState.zoom / old;
            mapState.offsetX = mx - (mx - mapState.offsetX) * r;
            mapState.offsetY = my - (my - mapState.offsetY) * r;
          }, {passive: false});
          mapCanvas.style.cursor = 'grab';
        }

        // Tab navigation hooks for canvas map
        navItems.forEach(function (item) {
          item.addEventListener('click', function () {
            currentTab = this.getAttribute('data-page');
            if (currentTab === 'map') {
              startMapAnim();
              if (!mapState.updateInterval) {
                mapState.updateInterval = setInterval(function() {
                  if (typeof bngApi !== 'undefined') bngApi.engineLua('extensions.career_careerMPTablet.getMapData()');
                }, 5000);
              }
            } else {
              stopMapAnim();
              if (mapState.updateInterval) { clearInterval(mapState.updateInterval); mapState.updateInterval = null; }
            }
          });
        });

        // Stop animation when tablet closes
        scope.$on('careerMPTabletToggle', function (event, visible) {
          if (!visible) {
            stopMapAnim();
            if (mapState.updateInterval) { clearInterval(mapState.updateInterval); mapState.updateInterval = null; }
          }
          else if (currentTab === 'map') {
            startMapAnim();
            if (!mapState.updateInterval) {
              mapState.updateInterval = setInterval(function() {
                if (typeof bngApi !== 'undefined') bngApi.engineLua('extensions.career_careerMPTablet.getMapData()');
              }, 5000);
            }
          }
        });

        // Listen for map data from Lua
        scope.$on('careerMPTabletMapData', function (event, data) {
          console.log('[CareerMPTablet] Map data received:', data);
          mapState.data = data;
          if (currentTab === 'map') startMapAnim();
          
          // Request road data if level changed
          if (data.levelName && mapState.currentRoadLevel !== data.levelName) {
            mapState.currentRoadLevel = data.levelName;
            mapState.roadData = null;
            mapState.roadPaths = null;
            if (typeof bngApi !== 'undefined') {
              bngApi.engineLua('extensions.career_careerMPTablet.getRoadData()');
            }
          }

          // Update Map Banner
          var bannerEl = element[0].querySelector('#map-banner-label');
          if (bannerEl && data.levelName) {
            bannerEl.innerText = 'Career / ' + data.levelName;
          }

          // Render Vehicles
          var vehiclesContainer = element[0].querySelector('#map-vehicles-list');
          if (vehiclesContainer) {
            vehiclesContainer.innerHTML = '';
            if (data.vehicles && data.vehicles.length > 0) {
              data.vehicles.forEach(function(veh) {
                var isSpawned = veh.isSpawned ? '<span style="color:var(--accent-green)">📍 Current vehicle</span>' : '<span>🅿️ Stored</span>';
                var html = `
                  <div class="list-item">
                    <div class="list-item-info">
                      <div class="list-item-title">${veh.name}</div>
                      <div class="list-item-meta">
                        <span>🚗 ${veh.config || 'Vehicle'}</span>
                        ${isSpawned}
                      </div>
                    </div>
                  </div>
                `;
                vehiclesContainer.insertAdjacentHTML('beforeend', html);
              });
            } else {
              vehiclesContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">No vehicles found.</div>';
            }
          }

          // Render Dealerships (clickable for waypoints)
          var dealershipsContainer = element[0].querySelector('#map-dealerships-list');
          if (dealershipsContainer) {
            dealershipsContainer.innerHTML = '';
            if (data.dealerships && data.dealerships.length > 0) {
              data.dealerships.forEach(function(dealer) {
                var feeHtml = dealer.fee ? ` Fees: $${dealer.fee}` : '';
                var html = `
                  <div class="card map-poi-card" style="cursor:pointer;" data-poi-type="dealership" data-poi-id="${dealer.id}">
                    <div class="card-header">
                      <span class="card-title">${dealer.name}</span>
                      <span class="card-badge ready">Open</span>
                    </div>
                    <div class="card-desc">${dealer.desc}${feeHtml}</div>
                    <div class="card-nav-hint">📍 Click to set waypoint</div>
                  </div>
                `;
                dealershipsContainer.insertAdjacentHTML('beforeend', html);
              });
            } else {
              dealershipsContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);grid-column:1/-1;">No dealerships found on this map.</div>';
            }
          }

          // Render Garages (clickable for waypoints)
          var garagesContainer = element[0].querySelector('#map-garages-list');
          if (garagesContainer) {
            garagesContainer.innerHTML = '';
            if (data.garages && data.garages.length > 0) {
              data.garages.forEach(function(garage) {
                var badge = garage.isComputer ? '<span class="card-badge pending">Computer</span>' : '<span class="card-badge ready">Available</span>';
                var poiType = garage.isComputer ? 'computer' : 'garage';
                var html = `
                  <div class="card map-poi-card" style="cursor:pointer;" data-poi-type="${poiType}" data-poi-id="${garage.id}">
                    <div class="card-header">
                      <span class="card-title">${garage.name}</span>
                      ${badge}
                    </div>
                    <div class="card-desc">${garage.desc}</div>
                    <div class="card-nav-hint">📍 Click to set waypoint</div>
                  </div>
                `;
                garagesContainer.insertAdjacentHTML('beforeend', html);
              });
            } else {
              garagesContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);grid-column:1/-1;">No garages found on this map.</div>';
            }
          }

          // Attach waypoint click handlers to all POI cards
          var poiCards = element[0].querySelectorAll('.map-poi-card');
          poiCards.forEach(function(card) {
            card.addEventListener('click', function() {
              var poiType = this.getAttribute('data-poi-type');
              var poiId = this.getAttribute('data-poi-id');
              if (typeof bngApi !== 'undefined') {
                bngApi.engineLua('extensions.career_careerMPTablet.setWaypoint("' + poiType + '", "' + poiId + '")');
              }
              // Track active waypoint for canvas map
              var wpPos = null;
              var allPois = (mapState.data ? [].concat(mapState.data.dealerships||[], mapState.data.garages||[]) : []);
              for (var wi = 0; wi < allPois.length; wi++) {
                if (allPois[wi].id === poiId && allPois[wi].pos) { wpPos = allPois[wi].pos; break; }
              }
              mapState.activeWaypoint = { type: poiType, id: poiId, pos: wpPos };
              // Visual feedback
              this.style.transform = 'scale(0.97)';
              this.style.borderColor = 'var(--accent-green)';
              var self = this;
              setTimeout(function() {
                self.style.transform = '';
                self.style.borderColor = '';
              }, 300);
            });
          });
        });

        // Listen for waypoint/general notifications from Lua
        scope.$on('careerMPTabletNotification', function (event, data) {
          if (data && data.message) {
            showNotification(data.message, data.type || 'info');
          }
        });

        // Listen for road geometry data from Lua
        scope.$on('careerMPTabletRoadData', function(event, flatRoadArray) {
          console.log('[CareerMPTablet] Road data received, segments:', flatRoadArray.length / 5);
          mapState.roadData = flatRoadArray;
          buildRoadPaths();
        });

        // Cleanup
        scope.$on('$destroy', function () {
          stopMapAnim();
          if (mapState.updateInterval) { clearInterval(mapState.updateInterval); mapState.updateInterval = null; }
          document.removeEventListener('mousedown', onMouseDownReposition, true);
          document.removeEventListener('mousemove', onMouseMoveReposition, true);
          document.removeEventListener('mouseup', onMouseUpReposition, true);
          document.removeEventListener('mousedown', onMouseDownResize, true);
          document.removeEventListener('mousemove', onMouseMoveResize, true);
          document.removeEventListener('mouseup', onMouseUpResize, true);
        });
      }
    };
  }]);
