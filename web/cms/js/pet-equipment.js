(function () {
  const root = document.getElementById('pet-equipment');
  if (!root) return;
  const configsRoot = root.querySelector('[data-pet-configs]');
  const message = root.querySelector('[data-pet-message]');

  function controls(config, type, equipped, capacity) {
    const label = type === 'laser' ? 'LF-4 LASERS' : 'BO2 SHIELDS';
    return `<div class="pet-equipment__group"><strong>${label}</strong><span>${equipped}/${capacity}</span><div>` +
      `<button data-action="add" data-config="${config}" data-type="${type}">+1</button>` +
      `<button data-action="remove" data-config="${config}" data-type="${type}">−1</button>` +
      `<button data-action="equipAll" data-config="${config}" data-type="${type}">MAX</button>` +
      `<button data-action="clear" data-config="${config}" data-type="${type}">CLEAR</button></div></div>`;
  }

  function render(configs) {
    configsRoot.innerHTML = ['1', '2'].map(id => {
      const config = configs[id];
      return `<article class="pet-equipment__config"><h3>CONFIGURATION ${id}</h3>` +
        controls(id, 'laser', config.lasers.length, config.laserCapacity) +
        controls(id, 'shield', config.shields.length, config.shieldCapacity) + '</article>';
    }).join('');
  }

  async function request(data) {
    message.textContent = 'Ukladám…';
    try {
      const body = new URLSearchParams(data);
      const response = await fetch('/pet-equipment-api.php', {method: 'POST', body});
      const result = await response.json();
      if (!result.status) throw new Error(result.message || 'PET výbava sa nedala uložiť.');
      render(result.configs);
      message.textContent = result.message || 'PET výbava je pripravená.';
    } catch (error) {
      message.textContent = error.message;
    }
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    request({action: button.dataset.action, config: button.dataset.config, type: button.dataset.type});
  });
  request({action: 'status'});
})();
