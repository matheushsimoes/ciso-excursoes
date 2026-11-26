import { api } from '../api.js';
import { money } from '../format.js';
import { empty, html, raw } from '../ui.js';
import { excursionTicket, pageHead, signFigure } from './shared.js';

export async function dashboardView(main, _params, { isCurrent }) {
  const data = await api.get('/dashboard');
  if (!isCurrent()) return;

  const open = data.excursions.filter((e) => !['FINISHED', 'CANCELLED'].includes(e.status));
  const closed = data.excursions.filter((e) => ['FINISHED', 'CANCELLED'].includes(e.status));

  main.innerHTML = html`
    ${raw(pageHead({
      title: 'Painel',
      sub: 'O que está acontecendo nas suas excursões.',
      actions: html`<a class="button" href="#/excursoes?nova">Nova excursão</a>`,
    }))}

    <section class="signs" aria-label="Resumo">
      ${signFigure(money(data.totals.receivable), 'a receber dos passageiros', Number(data.totals.receivable) > 0)}
      ${signFigure(data.totals.activeParticipants, 'passageiros nas próximas saídas')}
      ${signFigure(data.totals.activeExcursions, 'excursões em aberto')}
      ${signFigure(data.totals.persons, 'pessoas cadastradas')}
    </section>

    <section class="stack" aria-labelledby="proximas">
      <h2 id="proximas">Próximas saídas</h2>
      ${open.length
        ? raw(`<div class="tickets">${open.map((e) => excursionTicket(e).value).join('')}</div>`)
        : empty('Nenhuma excursão em aberto', 'Cadastre a próxima viagem para começar a vender.', '<a class="button" href="#/excursoes?nova">Nova excursão</a>')}
    </section>

    ${closed.length ? raw(html`
      <section class="stack" style="margin-top:2rem" aria-labelledby="encerradas">
        <h2 id="encerradas">Encerradas</h2>
        ${raw(`<div class="tickets">${closed.map((e) => excursionTicket(e).value).join('')}</div>`)}
      </section>`) : ''}
  `;
}
