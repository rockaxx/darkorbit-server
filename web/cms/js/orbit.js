(() => {
  'use strict';
  const menu = document.querySelector('.orbit-menu');
  const backdrop = document.querySelector('.orbit-backdrop');
  const setMenu = open => {
    document.body.classList.toggle('orbit-nav-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    backdrop.hidden = !open;
    if (open) document.querySelector('.orbit-sidebar a').focus();
  };
  if (menu && backdrop) {
    menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
    backdrop.addEventListener('click', () => { setMenu(false); menu.focus(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); }
      if (event.key === 'Tab' && menu.getAttribute('aria-expanded') === 'true') {
        const links = Array.from(document.querySelectorAll('.orbit-sidebar a'));
        const first = links[0], last = links[links.length-1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }
  // A missing preview should remain legible instead of rendering a broken image.
  document.querySelectorAll('.orbit-ship-art img, .orbit-ship-stage img').forEach(img => {
    img.addEventListener('error', () => { img.src = '/css/orbit-unknown.svg'; }, {once: true});
  });
  document.querySelectorAll('#l-username, #r-username').forEach(input => input.autocomplete = 'username');
  const password = document.getElementById('l-password');
  if (password) password.autocomplete = 'current-password';
  const pilotAccess = document.querySelector('.orbit-landing-nav a[href="#login"]');
  if (pilotAccess) pilotAccess.addEventListener('click', () => {
    const tabs = document.querySelector('.tabs');
    const instance = window.M && window.M.Tabs.getInstance(tabs);
    if (instance) instance.select('login');
    document.getElementById('l-username').focus();
  });
  document.querySelectorAll('#r-password, #r-password-confirm').forEach(input => input.autocomplete = 'new-password');
  document.querySelectorAll('#pilots tbody, #clans tbody, #warRanks tbody').forEach(body => {
    if (!body.children.length) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = 4;
      cell.className = 'orbit-empty-state';
      cell.textContent = 'No ranked entries yet. Every legend starts somewhere.';
    }
  });
})();
