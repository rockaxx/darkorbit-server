document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => window.clientTabs.select(button.dataset.tab));
document.getElementById('hangar').onclick = () => window.clientTabs.hangar();
window.clientTabs.onActive(tab => document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === tab)));
