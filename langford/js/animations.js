/**
 * The Langford — Subtle scroll reveals
 * Uses IntersectionObserver; respects prefers-reduced-motion.
 */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('.reveal');

  if (!items.length) return;

  if (prefersReduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  items.forEach((el, i) => {
    el.style.setProperty('--i', i % 6);
    observer.observe(el);
  });
})();
