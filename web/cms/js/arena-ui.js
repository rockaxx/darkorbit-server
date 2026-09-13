(function () {
  'use strict';

  const root = document.createElement('div');
  root.id = 'arena-ui';
  root.innerHTML = [
    '<button id="arena-toggle" type="button">⚔ 1v1 Arena</button>',
    '<section id="arena-panel" aria-hidden="true">',
      '<header><strong>1v1 Arena</strong><button id="arena-close" type="button" aria-label="Zavrieť">×</button></header>',
      '<nav class="arena-tabs"><button class="active" data-arena-tab="invite" type="button">Invite 1v1</button><button data-arena-tab="competitive" type="button">Competitive</button></nav>',
      '<div class="arena-pane active" data-arena-pane="invite">',
      '<form id="arena-form"><label for="arena-nickname">Nick hráča</label>',
      '<div><input id="arena-nickname" maxlength="32" autocomplete="off" placeholder="Pilot nickname"><button type="submit">Pozvať</button></div></form>',
      '<div id="arena-invite" hidden><p><b id="arena-inviter"></b> ťa pozýva na 1v1.</p>',
      '<div><button id="arena-accept" type="button">Prijať</button><button id="arena-decline" type="button">Odmietnuť</button></div></div></div>',
      '<div class="arena-pane" data-arena-pane="competitive">',
        '<div class="competitive-card"><div><strong id="competitive-elo">Elo 100</strong><span id="competitive-record">0W / 0L</span></div>',
        '<button id="competitive-search" type="button">Search for match</button></div>',
      '</div>',
      '<p id="arena-status" role="status"></p>',
      '<div class="arena-ranking"><strong>Competitive leaderboard</strong><ol id="arena-leaderboard"></ol></div>',
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
  let competitiveSearching = false;

  async function leaderboard() {
    const data = await request('competitive_leaderboard');
    const list = document.getElementById('arena-leaderboard');
    list.textContent = '';
    data.leaderboard.forEach(entry => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = entry.rank + '. ' + entry.pilotName + ' — Elo ' + entry.elo + ' — ' + entry.wins + 'W / ' + entry.losses + 'L';
      item.appendChild(label);
      if (entry.title) {
        const title = document.createElement('em');
        title.className = 'competitive-title ' + entry.titleColor;
        title.textContent = entry.title;
        item.appendChild(title);
      }
      list.appendChild(item);
    });
    if (!data.leaderboard.length) {
      const item = document.createElement('li');
      item.textContent = 'Zatiaľ bez výsledkov';
      list.appendChild(item);
    }
  }

  function updateCompetitive(data) {
    if (data.stats) {
      document.getElementById('competitive-elo').textContent = 'Elo ' + data.stats.elo;
      document.getElementById('competitive-record').textContent = data.stats.wins + 'W / ' + data.stats.losses + 'L';
    }
    competitiveSearching = data.state === 'searching';
    const button = document.getElementById('competitive-search');
    button.textContent = competitiveSearching ? 'Cancel search' : 'Search for match';
    button.classList.toggle('searching', competitiveSearching);
    if (data.state === 'matched' && data.match) {
      feedback('Súper nájdený: ' + data.match.opponentName + '. Presun do arény…', true);
    }
  }

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
  document.querySelectorAll('[data-arena-tab]').forEach(button => {
    button.onclick = () => {
      document.querySelectorAll('[data-arena-tab]').forEach(tab => tab.classList.toggle('active', tab === button));
      document.querySelectorAll('[data-arena-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.arenaPane === button.dataset.arenaTab));
    };
  });
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
  document.getElementById('competitive-search').onclick = async () => {
    try {
      const data = await request(competitiveSearching ? 'competitive_cancel' : 'competitive_search');
      updateCompetitive(data);
      feedback(data.message, data.status);
    } catch (error) {
      feedback(error.message, false);
    }
  };
  async function pollCompetitive() {
    try { updateCompetitive(await request('competitive_poll')); } catch (error) { feedback(error.message, false); }
  }
  setInterval(poll, 1000);
  setInterval(pollCompetitive, 1000);
  setInterval(() => leaderboard().catch(() => {}), 10000);
  poll();
  pollCompetitive();
  leaderboard().catch(() => {});
})();
