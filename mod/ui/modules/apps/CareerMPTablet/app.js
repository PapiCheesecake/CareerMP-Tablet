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

      // ===== Visibility Toggle =====
      // Controlled by Lua via guihooks.trigger('careerMPTabletToggle', bool)
      scope.$on('careerMPTabletToggle', function (event, visible) {
        console.log('[CareerMPTablet] Toggle event received:', visible);
        element[0].style.display = visible ? '' : 'none';
      });

      // ===== Tab Navigation =====
      var navItems = element[0].querySelectorAll('.nav-item');
      var pages = element[0].querySelectorAll('.page');

      navItems.forEach(function (item) {
        item.addEventListener('click', function () {
          var targetPage = this.getAttribute('data-page');

          // Update active nav
          navItems.forEach(function (n) { n.classList.remove('active'); });
          this.classList.add('active');

          // Show target page
          pages.forEach(function (p) { p.classList.remove('active'); });
          var target = element[0].querySelector('#page-' + targetPage);
          if (target) target.classList.add('active');
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

            // Update active subtab
            subtabs.forEach(function (t) { t.classList.remove('active'); });
            this.classList.add('active');

            // Show target subtab page
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

          if (facilityName) {
            facilityName.textContent = this.textContent;
          }
        });
      });

      // ===== Toggle Switches =====
      element[0].querySelectorAll('.toggle').forEach(function (toggle) {
        toggle.addEventListener('click', function () {
          this.classList.toggle('on');
        });
      });

      // ===== Button Click Feedback =====
      element[0].querySelectorAll('.btn').forEach(function (btn) {
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
          if (el) el.textContent = data.balance;
        }
        if (data.xp !== undefined) {
          var el = element[0].querySelector('#header-xp');
          if (el) el.textContent = data.xp;
        }
        if (data.vehicle !== undefined) {
          var el = element[0].querySelector('#header-vehicle');
          if (el) el.textContent = data.vehicle;
        }
      });

      // Cleanup
      scope.$on('$destroy', function () {
        // Nothing to clean up for now
      });
    }
  };
}]);
