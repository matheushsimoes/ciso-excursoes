import { api } from '../api.js';
import { empty, field, formDialog, html, raw, rhtml, toast } from '../ui.js';
import { pageHead } from './shared.js';

const SECTIONS = {
  onibus: {
    label: 'Tipos de ônibus',
    singular: 'tipo de ônibus',
    path: '/bus-types',
    empty: ['Nenhum tipo de ônibus', 'Cadastre os modelos que você costuma fretar, com a quantidade de lugares.'],
    columns: [['Nome', (t) => t.name], ['Lugares', (t) => t.capacity, 'num'], ['Descrição', (t) => t.description ?? '—']],
    fields: (t = {}) => html`
      ${field({ name: 'name', label: 'Nome', value: t.name, required: true, attrs: 'maxlength="100" placeholder="Double-Deck 64 lugares"' })}
      ${field({ name: 'capacity', label: 'Lugares', type: 'number', value: t.capacity, required: true, attrs: 'min="1" max="200"' })}
      ${field({ name: 'description', label: 'Descrição', value: t.description, attrs: 'maxlength="255"' })}`,
    body: (d) => ({ name: d.name, capacity: Number(d.capacity), description: d.description || undefined }),
  },
  hoteis: {
    label: 'Hotéis',
    singular: 'hotel',
    path: '/hotels',
    empty: ['Nenhum hotel', 'Cadastre os hotéis com que você trabalha. Os quartos são criados em cada excursão.'],
    columns: [['Nome', (h) => h.name], ['Endereço', (h) => h.address ?? '—'], ['Telefone', (h) => h.phone ?? '—']],
    fields: (h = {}) => html`
      ${field({ name: 'name', label: 'Nome', value: h.name, required: true, attrs: 'maxlength="150"' })}
      ${field({ name: 'address', label: 'Endereço', value: h.address, attrs: 'maxlength="255"' })}
      ${field({ name: 'phone', label: 'Telefone', value: h.phone, attrs: 'maxlength="20" inputmode="tel"' })}`,
    body: (d) => ({ name: d.name, address: d.address || undefined, phone: d.phone || undefined }),
  },
  fornecedores: {
    label: 'Fornecedores',
    singular: 'fornecedor',
    path: '/suppliers',
    empty: ['Nenhum fornecedor', 'Cadastre de quem você compra ingressos e serviços.'],
    columns: [['Nome', (s) => s.name], ['Documento', (s) => s.document ?? '—'], ['Telefone', (s) => s.phone ?? '—'], ['E-mail', (s) => s.email ?? '—']],
    fields: (s = {}) => html`
      ${field({ name: 'name', label: 'Nome', value: s.name, required: true, attrs: 'maxlength="150"' })}
      ${field({ name: 'document', label: 'CNPJ ou CPF', value: s.document, attrs: 'maxlength="20"' })}
      <div class="row">
        ${field({ name: 'phone', label: 'Telefone', value: s.phone, attrs: 'maxlength="20" inputmode="tel"' })}
        ${field({ name: 'email', label: 'E-mail', type: 'email', value: s.email, attrs: 'maxlength="254"' })}
      </div>`,
    body: (d) => ({ name: d.name, document: d.document || undefined, phone: d.phone || undefined, email: d.email || undefined }),
  },
};

export async function catalogView(main, [tab = 'onibus'], { isCurrent, refresh }) {
  const section = SECTIONS[tab] ?? SECTIONS.onibus;
  const items = await api.get(section.path);
  if (!isCurrent()) return;

  main.innerHTML = html`
    ${raw(pageHead({
      title: 'Cadastros',
      sub: 'Ônibus, hotéis e fornecedores usados nas excursões.',
      actions: html`<button type="button" data-new>Novo ${section.singular}</button>`,
    }))}
    <nav class="tabs" aria-label="Tipos de cadastro">
      ${Object.entries(SECTIONS).map(([key, s]) => rhtml`<a href="#/cadastros/${key}" ${raw(s === section ? 'aria-current="page"' : '')}>${s.label}</a>`)}
    </nav>
    <div class="panel">
      ${items.length
        ? rhtml`<div class="table-wrap"><table class="responsive">
            <thead><tr>${section.columns.map(([label, , cls]) => rhtml`<th class="${cls ?? ''}">${label}</th>`)}<th></th></tr></thead>
            <tbody>${items.map((item) => rhtml`<tr>
              ${section.columns.map(([label, value, cls], index) => rhtml`<td class="${cls ?? ''} ${index === 0 ? 'primary' : ''}" data-label="${label}">${value(item)}</td>`)}
              <td class="num" data-label=""><button type="button" class="link-button" data-edit="${item.id}">Editar</button></td>
            </tr>`)}</tbody></table></div>`
        : empty(section.empty[0], section.empty[1])}
    </div>`;

  const open = (item) =>
    formDialog({
      title: item ? `Editar ${item.name}` : `Novo ${section.singular}`,
      submitLabel: item ? 'Salvar' : 'Cadastrar',
      body: section.fields(item),
      onSubmit: (data) =>
        item ? api.patch(`${section.path}/${item.id}`, section.body(data)) : api.post(section.path, section.body(data)),
    }).then((saved) => {
      if (saved) {
        toast(item ? 'Cadastro atualizado.' : 'Cadastro criado.');
        refresh();
      }
    });

  main.querySelector('[data-new]').addEventListener('click', () => open());
  main.querySelectorAll('[data-edit]').forEach((button) =>
    button.addEventListener('click', () => open(items.find((i) => i.id === button.dataset.edit))),
  );
}
