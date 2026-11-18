(() => {
  'use strict';
  // Both comparison videos use the same presentation speed; assets stay unchanged.
  document.querySelectorAll('#before-after video[data-ba]').forEach(video => {
    const setSpeed = () => { video.defaultPlaybackRate = 1.1; video.playbackRate = 1.1; };
    setSpeed();
    video.addEventListener('loadedmetadata', setSpeed);
    video.addEventListener('play', setSpeed);
  });
  // Keep native activation for links/buttons; the shared deck uses Enter/Space to advance.
  document.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    if (event.target.closest('a, button, input, textarea, select, [contenteditable="true"]')) {
      event.stopImmediatePropagation();
    }
  }, true);
})();
