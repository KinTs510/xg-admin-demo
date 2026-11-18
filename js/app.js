/* GoldZip Admin Portal — static demo
   app.js: boot. Loads (or seeds) the demo data and renders the current route. */
'use strict';

Store.load();
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalStack.length) {
    const top = modalStack[modalStack.length - 1].ov;
    if (!top.querySelector('#sk-ok, #idle-yes')) closeModal();   // security-key and idle prompts need an explicit choice
  }
});
render();
