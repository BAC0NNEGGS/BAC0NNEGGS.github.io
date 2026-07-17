/**
 * The Langford — Accessible tabbed interface (Apartments page)
 */
(function () {
  'use strict';

  const tabGroups = document.querySelectorAll('[data-tabs]');

  tabGroups.forEach((group) => {
    const buttons = group.querySelectorAll('.tab-btn');
    const panels = group.querySelectorAll('.tab-panel');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => activate(btn));
      btn.addEventListener('keydown', (e) => {
        const idx = Array.from(buttons).indexOf(btn);
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          buttons[(idx + 1) % buttons.length].focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          buttons[(idx - 1 + buttons.length) % buttons.length].focus();
        }
      });
    });

    function activate(target) {
      buttons.forEach((b) => b.setAttribute('aria-selected', 'false'));
      panels.forEach((p) => p.classList.remove('is-active'));
      target.setAttribute('aria-selected', 'true');
      target.focus();
      const panel = document.getElementById(target.getAttribute('aria-controls'));
      if (panel) panel.classList.add('is-active');
    }
  });
})();
