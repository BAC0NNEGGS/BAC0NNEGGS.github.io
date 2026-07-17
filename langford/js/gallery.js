/**
 * The Langford — Gallery filtering and lightbox viewer
 */
(function () {
  'use strict';

  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;

  const filterButtons = document.querySelectorAll('.filter-btn');
  const items = Array.from(grid.querySelectorAll('.gallery-item'));

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const cat = btn.dataset.filter;
      items.forEach((item) => {
        const match = cat === 'all' || item.dataset.category === cat;
        item.style.display = match ? '' : 'none';
      });
    });
  });

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lbImg = lightbox.querySelector('img');
  const lbCaption = lightbox.querySelector('figcaption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');

  let visibleItems = items;
  let currentIndex = 0;
  let lastFocused = null;

  function openLightbox(index) {
    visibleItems = items.filter((i) => i.style.display !== 'none');
    currentIndex = visibleItems.indexOf(items[index]) >= 0 ? visibleItems.indexOf(items[index]) : 0;
    render();
    lastFocused = document.activeElement;
    lightbox.classList.add('is-open');
    closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }

  function render() {
    const item = visibleItems[currentIndex];
    const img = item.querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = img.alt;
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  items.forEach((item, index) => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', 'View larger image: ' + item.querySelector('img').alt);
    item.addEventListener('click', () => openLightbox(index));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(index);
      }
    });
  });

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    render();
  });
  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % visibleItems.length;
    render();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextBtn.click();
    if (e.key === 'ArrowLeft') prevBtn.click();
  });
})();
