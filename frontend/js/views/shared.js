import { EXCURSION_STATUS, EXCURSION_TYPE, daysUntil, money, period } from '../format.js';
import { badge, html, raw, rhtml } from '../ui.js';

export function statusBadge(status) {
  const { label, tone } = EXCURSION_STATUS[status] ?? { label: status, tone: 'grey' };
  return badge(label, tone);
}

function departure(excursion) {
  if (['FINISHED', 'CANCELLED'].includes(excursion.status)) return 'Encerrada';
  const days = daysUntil(excursion.startDate);
  if (days > 1) return `Sai em ${days} dias`;
  if (days === 1) return 'Sai amanhã';
  if (days === 0) return 'Sai hoje';
  return 'Em viagem ou já realizada';
}

/** An excursion drawn as a bus ticket: route on the left, departure on the stub. */
export function excursionTicket(excursion) {
  const places = excursion.seats || 0;
  const occupied = excursion.activeParticipants ?? 0;
  const ratio = places ? Math.min(occupied / places, 1) : 0;
  return rhtml`
    <a class="ticket" href="#/excursoes/${excursion.id}">
      <div>
        <h3>${excursion.name}</h3>
        <p class="meta">${excursion.destination}, ${period(excursion.startDate, excursion.endDate)}</p>
        <p class="inline-list" style="margin-top:.5rem">
          ${statusBadge(excursion.status)}
          ${badge(EXCURSION_TYPE[excursion.type], 'grey')}
          ${excursion.receivable && Number(excursion.receivable) > 0 ? badge(`A receber ${money(excursion.receivable)}`, 'yellow') : ''}
        </p>
      </div>
      <div class="stub">
        <strong>${departure(excursion)}</strong>
        <span class="muted">${occupied} passageiro${occupied === 1 ? '' : 's'}${places ? ` de ${places} lugares` : ''}</span>
        ${places ? rhtml`<div class="meter ${ratio >= 1 ? 'full' : ''}" aria-hidden="true"><span style="width:${Math.round(ratio * 100)}%"></span></div>` : ''}
      </div>
    </a>`;
}

export function signFigure(value, label, attention = false) {
  return rhtml`<div class="sign ${attention ? 'attention' : ''}"><span class="value">${value}</span><span class="label">${label}</span></div>`;
}

export function pageHead({ title, sub, crumbs, actions = '' }) {
  return html`
    <header class="page-head">
      <div>
        ${crumbs ? rhtml`<nav class="crumbs" aria-label="Você está em">${raw(crumbs)}</nav>` : ''}
        <h1>${title}</h1>
        ${sub ? rhtml`<p class="sub">${raw(sub)}</p>` : ''}
      </div>
      <div class="actions">${raw(actions)}</div>
    </header>`;
}

export function personOptions(persons) {
  return persons.map((person) => [person.id, `${person.fullName} (${person.document})`]);
}
