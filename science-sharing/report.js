(() => {
  'use strict';
  const dialog = document.querySelector('.report-image-dialog');
  const image = dialog.querySelector('[data-full-evidence]');
  const title = dialog.querySelector('#evidence-title');
  document.querySelectorAll('[data-evidence]').forEach(button => {
    button.addEventListener('click', () => {
      image.src = button.dataset.evidence;
      image.alt = button.dataset.evidenceTitle;
      title.textContent = button.dataset.evidenceTitle;
      dialog.showModal();
      dialog.querySelector('.evidence-scroll').scrollTop = 0;
    });
  });
  dialog.querySelector('[data-close-evidence]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  document.addEventListener('keydown', event => {
    if (dialog.open) event.stopImmediatePropagation();
  }, true);
})();
