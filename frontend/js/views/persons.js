import { api } from '../api.js';
import { EXCURSION_STATUS, SITUATION, date, money } from '../format.js';
import { badge, empty, field, formDialog, html, raw, rhtml, toast } from '../ui.js';
import { pageHead } from './shared.js';

function personFields(person = {}) {
  return html`
    ${field({ name: 'fullName', label: 'Nome completo', value: person.fullName, required: true, attrs: 'maxlength="150" autocomplete="off"' })}
    <div class="row">
      ${field({ name: 'document', label: 'Documento (CPF ou RG)', value: person.document, required: true, attrs: 'maxlength="20" autocomplete="off"' })}
      ${field({ name: 'birthDate', label: 'Data de nascimento', type: 'date', value: person.birthDate, required: true, hint: 'Necessária para o seguro viagem.' })}
    </div>
    <div class="row">
      ${field({ name: 'phone', label: 'Telefone', value: person.phone, attrs: 'maxlength="20" inputmode="tel" autocomplete="off"' })}
      ${field({ name: 'email', label: 'E-mail', type: 'email', value: person.email, attrs: 'maxlength="254" autocomplete="off"' })}
    </div>`;
}

function personBody(data, editing) {
  const body = {
    fullName: data.fullName.trim(),
    document: data.document.replace(/\s/g, ''),
    birthDate: data.birthDate,
  };
  // Optional fields: omitted when empty on creation; kept unchanged when empty on edit.
  if (data.phone) body.phone = data.phone.trim();
  if (data.email) body.email = data.email.trim();
  if (!editing) return body;
  return body;
}

export function personForm(person, prefill = {}) {
  const editing = Boolean(person);
  return formDialog({
    title: editing ? 'Editar pessoa' : 'Nova pessoa',
    submitLabel: editing ? 'Salvar alterações' : 'Cadastrar pessoa',
    body: personFields(person ?? prefill),
    async onSubmit(data) {
      const body = personBody(data, editing);
      const saved = editing ? await api.patch(`/persons/${person.id}`, body) : await api.post('/persons', body);
      toast(editing ? 'Cadastro atualizado.' : 'Pessoa cadastrada.');
      return saved;
    },
  });
}

/**
 * Lets the operator find a person by name or document, or register a new one
 * without leaving the flow. Resolves with the chosen person or null.
 */
export function choosePersonDialog({ title, exclude = new Set() }) {
  return new Promise((resolve) => {
    let chosen = null;
    let newPersonName = '';
    formDialog({
      title,
      submitLabel: 'Cadastrar nova pessoa',
      body: html`
        ${field({ name: 'search', label: 'Buscar por nome ou documento', attrs: 'autocomplete="off" placeholder="Digite pelo menos 2 letras"' })}
        <div data-results class="stack" aria-live="polite"></div>`,
      onOpen(form) {
        const results = form.querySelector('[data-results]');
        let timer;
        form.search.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') event.preventDefault();
        });
        form.search.addEventListener('input', () => {
          clearTimeout(timer);
          newPersonName = form.search.value.trim();
          timer = setTimeout(async () => {
            const term = form.search.value.trim();
            if (term.length < 2) {
              results.innerHTML = '';
              return;
            }
            const persons = await api.get(`/persons?search=${encodeURIComponent(term)}`);
            results.innerHTML = persons.length
              ? html`<div class="table-wrap"><table><tbody>${persons.map((p) => rhtml`
                  <tr><td><strong>${p.fullName}</strong><br><span class="muted">${p.document}, nascido(a) em ${date(p.birthDate)}</span></td>
                  <td class="num">${exclude.has(p.id)
                    ? badge('Já está na excursão', 'grey')
                    : rhtml`<button type="button" class="small" data-pick="${p.id}">Escolher</button>`}</td></tr>`)}
                </tbody></table></div>`
              : html`<p class="muted">Ninguém encontrado. Cadastre a pessoa pelo botão abaixo.</p>`;
            results.querySelectorAll('[data-pick]').forEach((button) =>
              button.addEventListener('click', () => {
                chosen = persons.find((p) => p.id === button.dataset.pick);
                form.closest('dialog').close();
              }),
            );
          }, 250);
        });
      },
      onSubmit: () => true,
    }).then(async (submitted) => {
      if (chosen) return resolve(chosen);
      if (!submitted) return resolve(null);
      const looksLikeDocument = /^\d[\d.\-/]*$/.test(newPersonName);
      resolve(
        await personForm(null, looksLikeDocument ? { document: newPersonName } : { fullName: newPersonName }),
      );
    });
  });
}

export async function personsView(main, _params, { isCurrent, query }) {
  const term = query.get('busca') ?? '';
  const persons = await api.get(term ? `/persons?search=${encodeURIComponent(term)}` : '/persons');
  if (!isCurrent()) return;

  main.innerHTML = html`
    ${raw(pageHead({
      title: 'Pessoas',
      sub: 'Passageiros cadastrados. Uma pessoa pode viajar em várias excursões.',
      actions: html`<button type="button" data-new>Nova pessoa</button>`,
    }))}
    <form class="search" role="search" style="margin-bottom:1.25rem">
      ${field({ name: 'busca', label: 'Buscar por nome ou documento', value: term, attrs: 'type="search" autocomplete="off"' })}
    </form>
    <div class="panel">
      ${persons.length
        ? rhtml`<div class="table-wrap"><table class="responsive">
            <thead><tr><th>Nome</th><th>Documento</th><th>Nascimento</th><th>Telefone</th></tr></thead>
            <tbody>${persons.map((p) => rhtml`<tr class="clickable" data-href="#/pessoas/${p.id}">
              <td class="primary" data-label="Nome"><a href="#/pessoas/${p.id}">${p.fullName}</a></td>
              <td data-label="Documento">${p.document}</td>
              <td data-label="Nascimento">${date(p.birthDate)}</td>
              <td data-label="Telefone">${p.phone ?? '—'}</td></tr>`)}</tbody></table></div>`
        : term
          ? empty('Ninguém encontrado', `Nenhuma pessoa com "${term}" no nome ou documento.`)
          : empty('Nenhuma pessoa cadastrada', 'Cadastre os passageiros aqui ou direto na excursão.')}
    </div>`;

  const form = main.querySelector('form.search');
  let timer;
  form.busca.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const value = form.busca.value.trim();
      location.hash = value ? `#/pessoas?busca=${encodeURIComponent(value)}` : '#/pessoas';
    }, 400);
  });
  form.addEventListener('submit', (event) => event.preventDefault());
  if (term) {
    form.busca.focus();
    form.busca.setSelectionRange(term.length, term.length);
  }

  main.querySelectorAll('tr[data-href]').forEach((row) =>
    row.addEventListener('click', () => (location.hash = row.dataset.href)),
  );
  main.querySelector('[data-new]').addEventListener('click', async () => {
    const saved = await personForm();
    if (saved) location.hash = `#/pessoas/${saved.id}`;
  });
}

export async function personView(main, [id], { isCurrent, refresh }) {
  const [person, history] = await Promise.all([
    api.get(`/persons/${id}`),
    api.get(`/persons/${id}/participations`),
  ]);
  if (!isCurrent()) return;

  main.innerHTML = html`
    ${raw(pageHead({
      title: person.fullName,
      crumbs: '<a href="#/pessoas">Pessoas</a>',
      actions: html`<button type="button" class="secondary" data-edit>Editar cadastro</button>`,
    }))}
    <div class="grid-2">
      <section class="panel">
        <h2>Cadastro</h2>
        <dl class="kv" style="margin-top:.8rem">
          <dt>Documento</dt><dd>${person.document}</dd>
          <dt>Nascimento</dt><dd>${date(person.birthDate)}</dd>
          <dt>Telefone</dt><dd>${person.phone ?? '—'}</dd>
          <dt>E-mail</dt><dd>${person.email ?? '—'}</dd>
        </dl>
      </section>
      <section class="panel">
        <h2>Excursões (${history.length})</h2>
        ${history.length
          ? rhtml`<ul style="list-style:none;padding:0;margin:.8rem 0 0;display:grid;gap:.6rem">${history.map((p) => rhtml`
              <li><a href="#/participacoes/${p.id}"><strong>${p.excursion.name}</strong></a>
              ${badge(EXCURSION_STATUS[p.excursion.status].label, EXCURSION_STATUS[p.excursion.status].tone)}
              ${badge(SITUATION[p.financial.situation].label, SITUATION[p.financial.situation].tone)}
              <br><span class="muted">Combinado ${money(p.contractedAmount)}, pago ${money(p.financial.netPaid)}</span></li>`)}</ul>`
          : rhtml`<p class="muted" style="margin-top:.5rem">Ainda não participou de nenhuma excursão.</p>`}
      </section>
    </div>`;

  main.querySelector('[data-edit]').addEventListener('click', async () => {
    if (await personForm(person)) refresh();
  });
}

