(function () {
  'use strict';

  const root = document.createElement('div');
  root.id = 'arena-ui';
  root.innerHTML = [
    '<button id="arena-toggle" type="button">⚔ 1v1 Arena</button>',
    '<section id="arena-panel" aria-hidden="true">',
      '<header><strong>1v1 Arena</strong><button id="arena-close" type="button" aria-label="Zavrieť">×</button></header>',
      '<form id="arena-form"><label for="arena-nickname">Nick hráča</label>',
      '<div><input id="arena-nickname" maxlength="32" autocomplete="off" placeholder="Pilot nickname"><button type="submit">Pozvať</button></div></form>',
      '<div id="arena-invite" hidden><p><b id="arena-inviter"></b> ťa pozýva na 1v1.</p>',
      '<div><button id="arena-accept" type="button">Prijať</button><button id="arena-decline" type="button">Odmietnuť</button></div></div>',
      '<p id="arena-status" role="status"></p>',
    '</section>'
  ].join('');
  document.body.appendChild(root);

  const panel = document.getElementById('arena-panel');
  const status = document.getElementById('arena-status');
  const inviteBox = document.getElementById('arena-invite');
  const inviter = document.getElementById('arena-inviter');
  const nickname = document.getElementById('arena-nickname');
  let currentInviteId = 0;
  let polling = false;

  function showPanel(open) {
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  async function request(action, values) {
    const response = await fetch('/arena-api.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams(Object.assign({action}, values || {}))
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Arena server neodpovedá.');
    return data;
  }

  function feedback(message, good) {
    status.textContent = message || '';
    status.className = good ? 'ok' : 'error';
  }

  async function poll() {
    if (polling) return;
    polling = true;
    try {
      const data = await request('poll');
      if (data.invite) {
        currentInviteId = data.invite.inviteId;
        inviter.textContent = data.invite.inviterName;
        inviteBox.hidden = false;
        showPanel(true);
      } else {
        currentInviteId = 0;
        inviteBox.hidden = true;
      }
    } catch (error) {
      feedback(error.message, false);
    } finally {
      polling = false;
    }
  }

  document.getElementById('arena-toggle').onclick = () => showPanel(panel.getAttribute('aria-hidden') === 'true');
  document.getElementById('arena-close').onclick = () => showPanel(false);
  document.getElementById('arena-form').onsubmit = async event => {
    event.preventDefault();
    const value = nickname.value.trim();
    if (!value) return feedback('Zadaj nick hráča.', false);
    try {
      const data = await request('invite', {nickname: value});
      feedback(data.message, data.status);
      if (data.status) nickname.value = '';
    } catch (error) {
      feedback(error.message, false);
    }
  };

  async function respond(action) {
    if (!currentInviteId) return;
    const inviteId = currentInviteId;
    currentInviteId = 0;
    inviteBox.hidden = true;
    try {
      const data = await request(action, {inviteId});
      feedback(data.message, data.status);
    } catch (error) {
      feedback(error.message, false);
    }
  }

  document.getElementById('arena-accept').onclick = () => respond('accept');
  document.getElementById('arena-decline').onclick = () => respond('decline');
  setInterval(poll, 1000);
  poll();
})();
