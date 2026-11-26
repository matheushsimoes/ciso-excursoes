import { dashboardView } from './views/dashboard.js';
import { excursionsView } from './views/excursions.js';
import { excursionView } from './views/excursion.js';
import { participationView } from './views/participation.js';
import { personsView, personView } from './views/persons.js';
import { catalogView } from './views/catalog.js';
import { esc } from './ui.js';

const routes = [
  [/^\/$/, dashboardView, 'dashboard'],
  [/^\/excursoes$/, excursionsView, 'excursions'],
  [/^\/excursoes\/([\w-]+)(?:\/(\w+))?$/, excursionView, 'excursions'],
  [/^\/participacoes\/([\w-]+)$/, participationView, 'excursions'],
  [/^\/pessoas$/, personsView, 'persons'],
  [/^\/pessoas\/([\w-]+)$/, personView, 'persons'],
  [/^\/cadastros(?:\/(\w+))?$/, catalogView, 'catalog'],
];

const main = document.getElementById('main');
let renderId = 0;

async function render() {
  const id = ++renderId;
  const [rawPath, queryString = ''] = (location.hash.replace(/^#/, '') || '/').split('?');
  const path = rawPath || '/';
  const query = new URLSearchParams(queryString);
  const [pattern, view, section] = routes.find(([regex]) => regex.test(path)) ?? [];

  document.querySelectorAll('.nav a').forEach((link) => {
    link.toggleAttribute('aria-current', link.dataset.nav === section);
    if (link.dataset.nav === section) link.setAttribute('aria-current', 'page');
  });

  if (!view) {
    main.innerHTML = `<div class="empty"><strong>Página não encontrada</strong><a class="button" href="#/">Ir para o painel</a></div>`;
    return;
  }

  main.innerHTML = '<p class="loading">Carregando…</p>';
  const params = path.match(pattern).slice(1);
  try {
    // A newer navigation may have started while this one was loading.
    await view(main, params, { isCurrent: () => id === renderId, refresh: render, query });
  } catch (error) {
    if (id !== renderId) return;
    main.innerHTML = `<div class="empty"><strong>Não foi possível carregar esta página</strong><p>${esc(error.message)}</p><button type="button" onclick="location.reload()">Tentar novamente</button></div>`;
  }
  if (id === renderId) {
    const title = main.querySelector('h1')?.textContent;
    document.title = title ? `${title} | Ciso Excursões` : 'Ciso Excursões';
  }
}

window.addEventListener('hashchange', () => {
  render();
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
render();
