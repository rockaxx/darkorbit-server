document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => window.clientTabs.select(button.dataset.tab));
document.getElementById('hangar').onclick = () => window.clientTabs.hangar();
window.clientTabs.onActive(tab => document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === tab)));

const arenaShell = document.getElementById('arena-shell');
const arenaInvite = document.getElementById('arena-shell-invite');
const arenaInviter = document.getElementById('arena-shell-inviter');
const arenaStatus = document.getElementById('arena-shell-status');
const arenaName = document.getElementById('arena-shell-name');
let arenaInviteId = 0;
let arenaPolling = false;
async function leaderboard() {
  const result = await window.clientTabs.arena({action: 'leaderboard'});
  const list = document.getElementById('arena-shell-leaderboard');
  list.textContent = '';
  const entries = result.leaderboard.length ? result.leaderboard : [{pilotName: 'Zatiaľ bez výsledkov', wins: 0, losses: 0}];
  entries.forEach(entry => {
    const item = document.createElement('li');
    item.textContent = `${entry.pilotName} — ${entry.wins}W / ${entry.losses}L`;
    list.appendChild(item);
  });
}
function setArenaOpen(open) { arenaShell.hidden = !open; window.clientTabs.arenaOpen(open); }
function arenaFeedback(message, good) { arenaStatus.textContent = message || ''; arenaStatus.className = good ? 'ok' : 'error'; }
document.getElementById('arena-button').onclick = () => setArenaOpen(arenaShell.hidden);
document.getElementById('arena-shell-form').onsubmit = async event => {
  event.preventDefault();
  const nickname = arenaName.value.trim();
  if (!nickname) return arenaFeedback('Zadaj nick hráča.', false);
  const result = await window.clientTabs.arena({action: 'invite', nickname});
  arenaFeedback(result.message, result.status);
  if (result.status) arenaName.value = '';
};
async function respondArena(action) {
  if (!arenaInviteId) return;
  const inviteId = arenaInviteId; arenaInviteId = 0; arenaInvite.hidden = true;
  const result = await window.clientTabs.arena({action, inviteId});
  arenaFeedback(result.message, result.status);
}
document.getElementById('arena-shell-accept').onclick = () => respondArena('accept');
document.getElementById('arena-shell-decline').onclick = () => respondArena('decline');
async function pollArena() {
  if (arenaPolling) return; arenaPolling = true;
  try {
    const result = await window.clientTabs.arena({action: 'poll'});
    if (result.invite) {
      arenaInviteId = result.invite.inviteId;
      arenaInviter.textContent = result.invite.inviterName;
      arenaInvite.hidden = false; setArenaOpen(true);
    } else { arenaInviteId = 0; arenaInvite.hidden = true; }
  } catch (error) { arenaFeedback(error.message, false); }
  finally { arenaPolling = false; }
}
setInterval(pollArena, 1000);
setInterval(() => leaderboard().catch(() => {}), 10000);
pollArena();
leaderboard().catch(() => {});
