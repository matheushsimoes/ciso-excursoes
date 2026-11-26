import { api } from '../api.js';
import {
  CATEGORY,
  EXCURSION_TYPE,
  NEXT_STATUS,
  SITUATION,
  date,
  isFinal,
  money,
  moneyInput,
  parseMoney,
  period,
  today,
} from '../format.js';
import {
  badge,
  confirmDialog,
  empty,
  field,
  formDialog,
  html,
  raw,
  rhtml,
  run,
  toast,
} from '../ui.js';
import { excursionForm } from './excursions.js';
import { pageHead, signFigure, statusBadge } from './shared.js';
import { choosePersonDialog } from './persons.js';

const TABS = [
  ['resumo', 'Resumo'],
  ['passageiros', 'Passageiros'],
  ['transporte', 'Transporte'],
  ['hospedagem', 'Hospedagem'],
  ['atividades', 'Atividades e ingressos'],
  ['financeiro', 'Financeiro'],
  ['relatorios', 'Relatórios'],
];

export async function excursionView(main, [id, tab = 'resumo'], context) {
  const excursion = await api.get(`/excursions/${id}`);
  if (!context.isCurrent()) return;

  const locked = isFinal(excursion.status);
  main.innerHTML = html`
    ${raw(pageHead({
      title: excursion.name,
      crumbs: '<a href="#/excursoes">Excursões</a>',
      sub: html`${excursion.destination}, ${period(excursion.startDate, excursion.endDate)} ${statusBadge(excursion.status)} ${badge(EXCURSION_TYPE[excursion.type])}`,
      actions: locked ? '' : html`<button type="button" class="secondary" data-edit>Editar dados</button>`,
    }))}
    <nav class="tabs" aria-label="Seções da excursão">
      ${TABS.map(([key, label]) =>
        rhtml`<a href="#/excursoes/${id}/${key}" ${raw(key === tab ? 'aria-current="page"' : '')}>${label}</a>`,
      )}
    </nav>
    <section data-tab><p class="loading">Carregando…</p></section>`;

  main.querySelector('[data-edit]')?.addEventListener('click', async () => {
    if (await excursionForm(excursion)) context.refresh();
  });

  const section = main.querySelector('[data-tab]');
  const tabs = {
    resumo: summaryTab,
    passageiros: passengersTab,
    transporte: transportTab,
    hospedagem: accommodationTab,
    atividades: activitiesTab,
    financeiro: financeTab,
    relatorios: reportsTab,
  };
  await (tabs[tab] ?? summaryTab)(section, excursion, context);
}

// ------------------------------------------------------------------- summary

async function summaryTab(section, excursion, context) {
  const [summary, transport, accommodation] = await Promise.all([
    api.get(`/excursions/${excursion.id}/financial-summary`),
    api.get(`/excursions/${excursion.id}/transport`),
    api.get(`/excursions/${excursion.id}/accommodation`),
  ]);
  if (!context.isCurrent()) return;

  const transitions = NEXT_STATUS[excursion.status];
  const withoutRoom = excursion.type === 'OVERNIGHT'
    ? summary.participants.active - accommodation.totalOccupied
    : 0;

  section.innerHTML = html`
    <div class="signs">
      ${signFigure(summary.participants.active, 'passageiros ativos')}
      ${signFigure(transport.totalCapacity ? `${transport.totalOccupied}/${transport.totalCapacity}` : '—', 'lugares nos ônibus ocupados')}
      ${excursion.type === 'OVERNIGHT' ? signFigure(accommodation.totalCapacity ? `${accommodation.totalOccupied}/${accommodation.totalCapacity}` : '—', 'vagas nos quartos ocupadas') : ''}
      ${signFigure(money(summary.cash.receivable), 'ainda a receber', Number(summary.cash.receivable) > 0)}
    </div>

    <div class="grid-2">
      <section class="panel">
        <h2>Situação da excursão</h2>
        <p style="margin:.6rem 0 1rem">${statusBadge(excursion.status)}</p>
        ${withoutRoom > 0 && ['DRAFT', 'OPEN'].includes(excursion.status)
          ? rhtml`<p class="form-error" style="margin-bottom:1rem">${withoutRoom} passageiro(s) ainda sem quarto. Para confirmar a excursão, todos precisam de quarto.</p>`
          : ''}
        ${transitions.length
          ? rhtml`<div class="actions">${transitions.map(([status, label]) =>
              rhtml`<button type="button" class="${status === 'CANCELLED' ? 'danger' : ''}" data-status="${status}">${label}</button>`,
            )}</div>`
          : rhtml`<p class="muted">Excursão encerrada: os dados ficam guardados como histórico.</p>`}
      </section>

      <section class="panel">
        <h2>Dados da viagem</h2>
        <dl class="kv" style="margin-top:.8rem">
          <dt>Destino</dt><dd>${excursion.destination}</dd>
          <dt>Ida</dt><dd>${date(excursion.startDate)}</dd>
          <dt>Volta</dt><dd>${date(excursion.endDate)}</dd>
          <dt>Tipo</dt><dd>${EXCURSION_TYPE[excursion.type]}</dd>
          <dt>Preço do pacote</dt><dd>${money(excursion.referencePrice)}</dd>
          <dt>Resultado até agora</dt>
          <dd class="${Number(summary.result.realized) >= 0 ? 'positive' : 'negative'}">${money(summary.result.realized)}</dd>
        </dl>
      </section>
    </div>`;

  section.querySelectorAll('[data-status]').forEach((button) =>
    button.addEventListener('click', async () => {
      const status = button.dataset.status;
      const label = button.textContent;
      const go = () => api.patch(`/excursions/${excursion.id}/status`, { status });
      if (status === 'CANCELLED' || status === 'FINISHED') {
        const done = await confirmDialog({
          title: label,
          text: status === 'CANCELLED'
            ? 'A excursão será cancelada e não poderá mais ser alterada. Pagamentos continuam registrados e podem ser devolvidos.'
            : 'A excursão será encerrada e passa a ser apenas histórico. Despesas ainda podem ser lançadas.',
          confirmLabel: label,
          danger: status === 'CANCELLED',
          onConfirm: go,
        });
        if (done) context.refresh();
      } else if (await run(button, go, 'Situação atualizada.')) {
        context.refresh();
      }
    }),
  );
}

// ---------------------------------------------------------------- passengers

async function passengersTab(section, excursion, context) {
  const participations = await api.get(`/excursions/${excursion.id}/participations`);
  if (!context.isCurrent()) return;

  const active = participations.filter((p) => p.status === 'ACTIVE');
  const locked = isFinal(excursion.status);

  section.innerHTML = html`
    <div class="panel">
      <div class="panel-head">
        <h2>${active.length} passageiro${active.length === 1 ? '' : 's'}</h2>
        ${locked ? '' : rhtml`<button type="button" data-add>Adicionar passageiro</button>`}
      </div>
      ${participations.length
        ? rhtml`<div class="table-wrap"><table class="responsive">
            <thead><tr><th>Nome</th><th>Ônibus</th><th>Quarto</th><th class="num">Combinado</th><th class="num">Pago</th><th class="num">Saldo</th><th>Situação</th></tr></thead>
            <tbody>${participations.map((p) => {
              const situation = SITUATION[p.financial.situation];
              return rhtml`<tr class="clickable ${p.status === 'CANCELLED' ? 'cancelled' : ''}" data-href="#/participacoes/${p.id}">
                <td class="primary" data-label="Nome"><a href="#/participacoes/${p.id}">${p.person.fullName}</a>${p.person.nickname ? rhtml`<br><span class="muted">${p.person.nickname}</span>` : ''}</td>
                <td data-label="Ônibus">${p.vehicleIdentifier ? `${p.vehicleIdentifier}${p.seatNumber ? `, poltrona ${p.seatNumber}` : ''}` : '—'}</td>
                <td data-label="Quarto">${p.room ? `${p.room.identifier} (${p.room.hotelName})` : excursion.type === 'DAY_TRIP' ? 'Não se aplica' : '—'}</td>
                <td class="num" data-label="Combinado">${money(p.contractedAmount)}</td>
                <td class="num" data-label="Pago">${money(p.financial.netPaid)}</td>
                <td class="num" data-label="Saldo">${money(p.financial.balance)}</td>
                <td data-label="Situação">${badge(situation.label, situation.tone)}</td>
              </tr>`;
            })}</tbody></table></div>`
        : empty('Nenhum passageiro ainda', 'Adicione as pessoas que vão viajar. O valor combinado começa com o preço do pacote.')}
    </div>`;

  section.querySelectorAll('tr[data-href]').forEach((row) =>
    row.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      location.hash = row.dataset.href;
    }),
  );

  section.querySelector('[data-add]')?.addEventListener('click', async () => {
    const person = await choosePersonDialog({
      title: 'Adicionar passageiro',
      exclude: new Set(participations.map((p) => p.personId)),
    });
    if (!person) return;

    const added = await formDialog({
      title: person.fullName,
      submitLabel: 'Adicionar à excursão',
      body: field({
        name: 'contractedAmount',
        label: 'Valor combinado (R$)',
        value: moneyInput(excursion.referencePrice),
        required: true,
        attrs: 'inputmode="decimal"',
        hint: `Preço do pacote: ${money(excursion.referencePrice)}. Altere se houver desconto ou condição especial.`,
      }),
      async onSubmit(data) {
        const contractedAmount = parseMoney(data.contractedAmount);
        if (!contractedAmount) throw new Error('Informe o valor no formato 1500,00.');
        return api.post(`/excursions/${excursion.id}/participations`, { personId: person.id, contractedAmount });
      },
    });
    if (added) {
      toast(`${person.fullName} adicionado(a) à excursão.`);
      context.refresh();
    }
  });
}

// ----------------------------------------------------------------- transport

function seatLayout(capacity) {
  // 2 + aisle + 2, numbered left to right, front to back.
  const cells = [];
  for (let seat = 1; seat <= capacity; seat++) {
    const position = (seat - 1) % 4;
    if (position === 2) cells.push('<span class="aisle" aria-hidden="true"></span>');
    cells.push(seat);
  }
  return cells;
}

async function transportTab(section, excursion, context) {
  const [transport, busTypes, participations] = await Promise.all([
    api.get(`/excursions/${excursion.id}/transport`),
    api.get('/bus-types'),
    api.get(`/excursions/${excursion.id}/participations`),
  ]);
  if (!context.isCurrent()) return;

  const locked = isFinal(excursion.status);
  const vehicles = transport.buses.flatMap((bus) => bus.vehicles);
  const active = participations.filter((p) => p.status === 'ACTIVE');
  const withoutBus = active.filter((p) => !p.excursionVehicleId);
  const stored = sessionStorage.getItem(`vehicle-${excursion.id}`);
  let current = vehicles.find((v) => v.id === stored) ?? vehicles[0];

  section.innerHTML = html`
    <div class="bus-layout">
      <div class="panel" data-map>
        ${vehicles.length ? '' : empty('Nenhum ônibus nesta excursão', 'Adicione o tipo de ônibus e a quantidade para montar o mapa de poltronas.')}
      </div>
      <div class="stack">
        <section class="panel">
          <div class="panel-head"><h2>Ônibus</h2>${locked ? '' : rhtml`<button type="button" class="small" data-add-bus>Adicionar</button>`}</div>
          ${transport.buses.length
            ? rhtml`<div class="stack">${transport.buses.map((bus) => rhtml`
                <div>
                  <strong>${bus.busType.name}</strong>
                  <p class="muted">${bus.quantity} × ${bus.busType.capacity} lugares</p>
                  ${locked ? '' : rhtml`<div class="inline-list" style="margin-top:.4rem">
                    <button type="button" class="small secondary" data-resize="${bus.id}" data-quantity="${bus.quantity}">Alterar quantidade</button>
                    <button type="button" class="small danger" data-remove-bus="${bus.id}">Remover</button>
                  </div>`}
                </div>`)}</div>`
            : rhtml`<p class="muted">Nenhum ônibus ainda.</p>`}
        </section>
        <section class="panel">
          <h2>Sem ônibus (${withoutBus.length})</h2>
          ${withoutBus.length
            ? rhtml`<ul style="margin:.6rem 0 0;padding-left:1.1rem">${withoutBus.map((p) => rhtml`<li><a href="#/participacoes/${p.id}">${p.person.fullName}</a></li>`)}</ul>`
            : rhtml`<p class="muted" style="margin-top:.4rem">Todos os passageiros estão em algum ônibus.</p>`}
        </section>
      </div>
    </div>`;

  async function drawMap() {
    const map = section.querySelector('[data-map]');
    if (!current) return;
    sessionStorage.setItem(`vehicle-${excursion.id}`, current.id);
    const seatMap = await api.get(`/excursion-vehicles/${current.id}/seats`);
    const bySeat = new Map(seatMap.seats.map((s) => [s.number, s]));
    const occupied = seatMap.seats.filter((s) => s.participationId).length + seatMap.withoutSeat.length;

    map.innerHTML = html`
      <div class="vehicle-picker" role="group" aria-label="Escolha o ônibus">
        ${vehicles.map((v) => rhtml`<button type="button" class="small" aria-pressed="${v.id === current.id}" data-vehicle="${v.id}">${v.identifier}</button>`)}
      </div>
      <p class="muted" style="text-align:center;margin-bottom:.8rem">${occupied} de ${seatMap.vehicle.capacity} lugares ocupados</p>
      <div class="bus">
        <div class="bus-front"><span class="wheel" aria-hidden="true"></span><span>Frente</span></div>
        <div class="seat-rows">
          ${seatLayout(seatMap.vehicle.capacity).map((cell) => {
            if (typeof cell === 'string') return raw(cell);
            const seat = bySeat.get(cell);
            const label = seat.personName ? `Poltrona ${cell}: ${seat.personName}` : `Poltrona ${cell}: livre`;
            return rhtml`<button type="button" class="seat ${seat.participationId ? 'taken' : ''}" data-seat="${cell}" title="${label}" aria-label="${label}" ${raw(locked ? 'disabled' : '')}>${cell}</button>`;
          })}
        </div>
      </div>
      <div class="legend"><span>Livre</span><span class="is-taken">Ocupada</span></div>
      ${seatMap.withoutSeat.length
        ? rhtml`<p class="muted" style="margin-top:1rem">Neste ônibus, sem poltrona: ${seatMap.withoutSeat.map((p) => p.personName).join(', ')}</p>`
        : ''}`;

    map.querySelectorAll('[data-vehicle]').forEach((button) =>
      button.addEventListener('click', () => {
        current = vehicles.find((v) => v.id === button.dataset.vehicle);
        drawMap();
      }),
    );

    map.querySelectorAll('[data-seat]').forEach((button) =>
      button.addEventListener('click', async () => {
        const number = Number(button.dataset.seat);
        const seat = bySeat.get(number);
        if (seat.participationId) {
          const done = await confirmDialog({
            title: `Poltrona ${number}`,
            text: `${seat.personName} está nesta poltrona. Deseja liberá-la? A pessoa continua neste ônibus, sem poltrona.`,
            confirmLabel: 'Liberar poltrona',
            onConfirm: () =>
              api.patch(`/participations/${seat.participationId}/transport`, {
                excursionVehicleId: current.id,
                seatNumber: null,
              }),
          });
          if (done) {
            toast('Poltrona liberada.');
            context.refresh();
          }
          return;
        }

        const candidates = active
          .filter((p) => !p.seatNumber || p.excursionVehicleId !== current.id)
          .sort((a, b) => Number(Boolean(a.excursionVehicleId)) - Number(Boolean(b.excursionVehicleId)));
        if (!candidates.length) {
          toast('Todos os passageiros já têm poltrona.', 'error');
          return;
        }
        const done = await formDialog({
          title: `${current.identifier}, poltrona ${number}`,
          submitLabel: 'Colocar na poltrona',
          body: field({
            name: 'participationId',
            label: 'Passageiro',
            required: true,
            options: candidates.map((p) => [
              p.id,
              p.excursionVehicleId
                ? `${p.person.fullName} (hoje: ${p.vehicleIdentifier}${p.seatNumber ? `, poltrona ${p.seatNumber}` : ''})`
                : p.person.fullName,
            ]),
            hint: 'Quem ainda não tem ônibus aparece primeiro.',
          }),
          onSubmit: (data) =>
            api.patch(`/participations/${data.participationId}/transport`, {
              excursionVehicleId: current.id,
              seatNumber: number,
            }),
        });
        if (done) {
          toast(`Poltrona ${number} reservada.`);
          context.refresh();
        }
      }),
    );
  }
  await drawMap();

  section.querySelector('[data-add-bus]')?.addEventListener('click', async () => {
    const available = busTypes.filter((t) => !transport.buses.some((b) => b.busType.id === t.id));
    if (!available.length) {
      toast(busTypes.length ? 'Todos os tipos de ônibus já estão na excursão.' : 'Cadastre um tipo de ônibus em Cadastros.', 'error');
      if (!busTypes.length) location.hash = '#/cadastros/onibus';
      return;
    }
    const done = await formDialog({
      title: 'Adicionar ônibus',
      submitLabel: 'Adicionar',
      body: html`
        ${field({ name: 'busTypeId', label: 'Tipo de ônibus', required: true, options: available.map((t) => [t.id, `${t.name} (${t.capacity} lugares)`]) })}
        ${field({ name: 'quantity', label: 'Quantidade', type: 'number', value: 1, required: true, attrs: 'min="1" max="50"' })}`,
      onSubmit: (data) =>
        api.post(`/excursions/${excursion.id}/buses`, { busTypeId: data.busTypeId, quantity: Number(data.quantity) }),
    });
    if (done) {
      toast('Ônibus adicionado.');
      context.refresh();
    }
  });

  section.querySelectorAll('[data-resize]').forEach((button) =>
    button.addEventListener('click', async () => {
      const done = await formDialog({
        title: 'Alterar quantidade',
        body: field({
          name: 'quantity',
          label: 'Quantidade de ônibus deste tipo',
          type: 'number',
          value: button.dataset.quantity,
          required: true,
          attrs: 'min="1" max="50"',
          hint: 'Ao diminuir, saem primeiro os ônibus vazios de número mais alto.',
        }),
        onSubmit: (data) => api.patch(`/excursion-buses/${button.dataset.resize}`, { quantity: Number(data.quantity) }),
      });
      if (done) {
        toast('Quantidade atualizada.');
        context.refresh();
      }
    }),
  );

  section.querySelectorAll('[data-remove-bus]').forEach((button) =>
    button.addEventListener('click', async () => {
      const done = await confirmDialog({
        title: 'Remover ônibus',
        text: 'Todos os ônibus deste tipo saem da excursão. Só é possível se estiverem vazios.',
        confirmLabel: 'Remover',
        onConfirm: () => api.delete(`/excursion-buses/${button.dataset.removeBus}`),
      });
      if (done) {
        toast('Ônibus removido.');
        context.refresh();
      }
    }),
  );
}

// ------------------------------------------------------------- accommodation

async function accommodationTab(section, excursion, context) {
  if (excursion.type === 'DAY_TRIP') {
    section.innerHTML = empty('Bate-volta não tem hospedagem', 'Se a viagem passar a ter pernoite, edite os dados e mude o tipo para "Com hospedagem".').value;
    return;
  }

  const [accommodation, hotels, participations] = await Promise.all([
    api.get(`/excursions/${excursion.id}/accommodation`),
    api.get('/hotels'),
    api.get(`/excursions/${excursion.id}/participations`),
  ]);
  if (!context.isCurrent()) return;

  const locked = isFinal(excursion.status);
  const active = participations.filter((p) => p.status === 'ACTIVE');
  const withoutRoom = active.filter((p) => !p.roomId);

  section.innerHTML = html`
    <div class="signs">
      ${signFigure(`${accommodation.totalOccupied}/${accommodation.totalCapacity}`, 'vagas ocupadas')}
      ${signFigure(withoutRoom.length, 'passageiros sem quarto', withoutRoom.length > 0)}
      ${signFigure(money(accommodation.totalRoomCost), 'custo dos quartos (hotel)')}
    </div>
    <div class="panel-head">
      <h2>Hotéis e quartos</h2>
      ${locked ? '' : rhtml`<button type="button" data-link>Adicionar hotel</button>`}
    </div>
    ${accommodation.hotels.length
      ? rhtml`<div class="stack">${accommodation.hotels.map((entry) => rhtml`
          <section class="panel">
            <div class="panel-head">
              <div><h3>${entry.hotel.name}</h3>${entry.hotel.address ? rhtml`<p class="muted">${entry.hotel.address}</p>` : ''}</div>
              ${locked ? '' : rhtml`<div class="actions">
                <button type="button" class="small" data-room="${entry.id}">Novo quarto</button>
                ${entry.rooms.length ? '' : rhtml`<button type="button" class="small danger" data-unlink="${entry.id}">Remover hotel</button>`}
              </div>`}
            </div>
            ${entry.rooms.length
              ? rhtml`<div class="rooms">${entry.rooms.map((room) => rhtml`
                  <article class="room ${room.occupants.length >= room.capacity ? 'full' : ''}">
                    <h3><span>Quarto ${room.identifier}</span><span class="muted" style="font-size:var(--step--1)">${room.occupants.length}/${room.capacity}</span></h3>
                    <ul>
                      ${room.occupants.map((o) => rhtml`<li><a href="#/participacoes/${o.participationId}">${o.personName}</a></li>`)}
                      ${Array.from({ length: Math.max(room.capacity - room.occupants.length, 0) }, () => rhtml`<li class="free">vaga livre</li>`)}
                    </ul>
                    ${locked ? '' : rhtml`<div class="inline-list" style="margin-top:.6rem">
                      ${room.occupants.length < room.capacity ? rhtml`<button type="button" class="small" data-assign="${room.id}" data-name="${room.identifier}">Colocar hóspede</button>` : ''}
                      <button type="button" class="small secondary" data-edit-room="${room.id}" data-identifier="${room.identifier}" data-capacity="${room.capacity}" data-cost="${room.cost}">Editar</button>
                    </div>`}
                  </article>`)}</div>`
              : rhtml`<p class="muted">Nenhum quarto cadastrado neste hotel.</p>`}
          </section>`)}</div>`
      : empty('Nenhum hotel nesta excursão', 'Adicione o hotel e cadastre os quartos com capacidade e custo.')}
    ${withoutRoom.length
      ? rhtml`<section class="panel" style="margin-top:1.25rem"><h2>Sem quarto (${withoutRoom.length})</h2>
          <ul style="margin:.6rem 0 0;padding-left:1.1rem">${withoutRoom.map((p) => rhtml`<li><a href="#/participacoes/${p.id}">${p.person.fullName}</a></li>`)}</ul></section>`
      : ''}`;

  const refreshWith = (message) => (done) => {
    if (done) {
      toast(message);
      context.refresh();
    }
  };

  section.querySelector('[data-link]')?.addEventListener('click', async () => {
    const linked = new Set(accommodation.hotels.map((h) => h.hotel.id));
    const available = hotels.filter((h) => !linked.has(h.id));
    formDialog({
      title: 'Adicionar hotel',
      submitLabel: 'Adicionar',
      body: html`
        ${available.length ? field({ name: 'hotelId', label: 'Hotel cadastrado', options: [['', 'Cadastrar um novo hotel'], ...available.map((h) => [h.id, h.name])] }) : ''}
        <div data-new-hotel>
          ${field({ name: 'name', label: 'Nome do novo hotel', attrs: 'maxlength="150"' })}
          ${field({ name: 'address', label: 'Endereço', attrs: 'maxlength="255"' })}
          ${field({ name: 'phone', label: 'Telefone', attrs: 'maxlength="20" inputmode="tel"' })}
        </div>`,
      onOpen(form) {
        const toggle = () => {
          const creating = !form.hotelId || !form.hotelId.value;
          form.querySelector('[data-new-hotel]').hidden = !creating;
          form.name.required = creating;
        };
        form.hotelId?.addEventListener('change', toggle);
        toggle();
      },
      async onSubmit(data) {
        let hotelId = data.hotelId;
        if (!hotelId) {
          const hotel = await api.post('/hotels', {
            name: data.name,
            address: data.address || undefined,
            phone: data.phone || undefined,
          });
          hotelId = hotel.id;
        }
        return api.post(`/excursions/${excursion.id}/hotels`, { hotelId });
      },
    }).then(refreshWith('Hotel adicionado.'));
  });

  section.querySelectorAll('[data-unlink]').forEach((button) =>
    button.addEventListener('click', () =>
      confirmDialog({
        title: 'Remover hotel',
        text: 'O hotel sai desta excursão. O cadastro do hotel continua disponível.',
        confirmLabel: 'Remover',
        onConfirm: () => api.delete(`/excursion-hotels/${button.dataset.unlink}`),
      }).then(refreshWith('Hotel removido.')),
    ),
  );

  const roomFields = (room = {}) => html`
    ${field({ name: 'identifier', label: 'Quarto', value: room.identifier, required: true, attrs: 'maxlength="30" placeholder="101"' })}
    <div class="row">
      ${field({ name: 'capacity', label: 'Capacidade', type: 'number', value: room.capacity ?? 2, required: true, attrs: 'min="1" max="20"' })}
      ${field({ name: 'cost', label: 'Custo no hotel (R$)', value: moneyInput(room.cost), required: true, attrs: 'inputmode="decimal"', hint: 'O que a Ciso paga. Não é cobrado do passageiro.' })}
    </div>`;
  const roomBody = (data) => {
    const cost = parseMoney(data.cost);
    if (!cost) throw new Error('Informe o custo no formato 300,00.');
    return { identifier: data.identifier, capacity: Number(data.capacity), cost };
  };

  section.querySelectorAll('[data-room]').forEach((button) =>
    button.addEventListener('click', () =>
      formDialog({
        title: 'Novo quarto',
        submitLabel: 'Cadastrar quarto',
        body: roomFields(),
        onSubmit: (data) => api.post(`/excursion-hotels/${button.dataset.room}/rooms`, roomBody(data)),
      }).then(refreshWith('Quarto cadastrado.')),
    ),
  );

  section.querySelectorAll('[data-edit-room]').forEach((button) =>
    button.addEventListener('click', () =>
      formDialog({
        title: `Quarto ${button.dataset.identifier}`,
        body: roomFields(button.dataset),
        onSubmit: (data) => api.patch(`/rooms/${button.dataset.editRoom}`, roomBody(data)),
      }).then(refreshWith('Quarto atualizado.')),
    ),
  );

  section.querySelectorAll('[data-assign]').forEach((button) =>
    button.addEventListener('click', () => {
      const candidates = [...withoutRoom, ...active.filter((p) => p.roomId && p.roomId !== button.dataset.assign)];
      if (!candidates.length) {
        toast('Não há passageiros para colocar neste quarto.', 'error');
        return;
      }
      formDialog({
        title: `Quarto ${button.dataset.name}`,
        submitLabel: 'Colocar no quarto',
        body: field({
          name: 'participationId',
          label: 'Hóspede',
          required: true,
          options: candidates.map((p) => [p.id, p.roomId ? `${p.person.fullName} (hoje no quarto ${p.room.identifier})` : p.person.fullName]),
          hint: 'Quem ainda não tem quarto aparece primeiro.',
        }),
        onSubmit: (data) => api.patch(`/participations/${data.participationId}/room`, { roomId: button.dataset.assign }),
      }).then(refreshWith('Hóspede colocado no quarto.'));
    }),
  );
}

// ---------------------------------------------------------------- activities

async function activitiesTab(section, excursion, context) {
  const [activities, demand, purchases, suppliers] = await Promise.all([
    api.get(`/excursions/${excursion.id}/activities`),
    api.get(`/excursions/${excursion.id}/ticket-demand`),
    api.get(`/excursions/${excursion.id}/supplier-purchases`),
    api.get('/suppliers'),
  ]);
  if (!context.isCurrent()) return;
  const locked = isFinal(excursion.status);

  section.innerHTML = html`
    <div class="panel-head">
      <h2>Atividades</h2>
      ${locked ? '' : rhtml`<button type="button" data-activity>Nova atividade</button>`}
    </div>
    ${activities.length
      ? rhtml`<div class="grid-2">${activities.map((activity) => rhtml`
          <section class="panel">
            <div class="panel-head">
              <div>
                <h3>${activity.name}</h3>
                <p class="muted">${activity.isOptional ? 'Opcional' : 'Incluída para todos'}${activity.description ? `: ${activity.description}` : ''}</p>
              </div>
              ${locked ? '' : rhtml`<button type="button" class="small" data-ticket="${activity.id}">Novo ingresso</button>`}
            </div>
            ${activity.ticketTypes.length
              ? rhtml`<table><tbody>${activity.ticketTypes.map((t) => rhtml`
                  <tr><td>${t.name}</td><td class="num">${money(t.currentPrice)}</td>
                  <td class="num">${locked ? '' : rhtml`<button type="button" class="link-button" data-price="${t.id}" data-name="${t.name}" data-current="${t.currentPrice}">Alterar preço</button>`}</td></tr>`)}
                </tbody></table>`
              : rhtml`<p class="muted">Sem ingressos. Atividade gratuita ou ainda sem preço.</p>`}
          </section>`)}</div>`
      : empty('Nenhuma atividade', 'Cadastre passeios e eventos, como uma visita à quadra da escola de samba, e os tipos de ingresso.')}

    <section class="panel" style="margin-top:1.5rem">
      <h2>Quantos ingressos comprar</h2>
      <p class="muted" style="margin:.3rem 0 1rem">Pedidos dos passageiros comparados com o que já foi comprado dos fornecedores.</p>
      ${demand.length
        ? rhtml`<div class="table-wrap"><table class="responsive">
            <thead><tr><th>Ingresso</th><th class="num">Pedidos</th><th class="num">Comprados</th><th class="num">Falta comprar</th><th class="num">Vendido</th><th class="num">Custo</th><th></th></tr></thead>
            <tbody>${demand.map((line) => rhtml`<tr>
              <td class="primary" data-label="Ingresso">${line.activityName}: ${line.ticketTypeName}</td>
              <td class="num" data-label="Pedidos">${line.requested}</td>
              <td class="num" data-label="Comprados">${line.purchasedFromSuppliers}</td>
              <td class="num" data-label="Falta comprar">${line.toPurchase > 0 ? badge(line.toPurchase, 'yellow') : badge('0', 'green')}</td>
              <td class="num" data-label="Vendido">${money(line.salesTotal)}</td>
              <td class="num" data-label="Custo">${money(line.supplierCost)}</td>
              <td class="num" data-label="">${rhtml`<button type="button" class="small secondary" data-buy="${line.ticketTypeId}" data-name="${line.activityName}: ${line.ticketTypeName}" data-missing="${line.toPurchase}">Registrar compra</button>`}</td>
            </tr>`)}</tbody></table></div>`
        : rhtml`<p class="muted">Cadastre ingressos para acompanhar a demanda.</p>`}
    </section>

    ${purchases.length ? rhtml`<section class="panel">
      <h2>Compras feitas aos fornecedores</h2>
      <div class="table-wrap"><table class="responsive" style="margin-top:.8rem">
        <thead><tr><th>Data</th><th>Fornecedor</th><th>Ingresso</th><th class="num">Qtd.</th><th class="num">Total</th></tr></thead>
        <tbody>${purchases.map((p) => rhtml`<tr>
          <td data-label="Data">${date(p.purchaseDate)}</td><td class="primary" data-label="Fornecedor">${p.supplierName}</td>
          <td data-label="Ingresso">${p.activityName}: ${p.ticketTypeName}</td><td class="num" data-label="Qtd.">${p.quantity}</td>
          <td class="num" data-label="Total">${money(p.total)}</td></tr>`)}</tbody></table></div>
    </section>` : ''}`;

  const done = (message) => (result) => {
    if (result) {
      toast(message);
      context.refresh();
    }
  };

  section.querySelector('[data-activity]')?.addEventListener('click', () =>
    formDialog({
      title: 'Nova atividade',
      submitLabel: 'Cadastrar atividade',
      body: html`
        ${field({ name: 'name', label: 'Nome', required: true, attrs: 'maxlength="150"' })}
        ${field({ name: 'description', label: 'Descrição', type: 'textarea', attrs: 'maxlength="500"' })}
        <label class="checkbox"><input type="checkbox" name="isOptional" checked> Opcional (cada passageiro decide se vai)</label>`,
      onSubmit: (data) =>
        api.post(`/excursions/${excursion.id}/activities`, {
          name: data.name,
          description: data.description || undefined,
          isOptional: data.isOptional === 'on',
        }),
    }).then(done('Atividade cadastrada.')),
  );

  const ticketBody = (data) => {
    const currentPrice = parseMoney(data.currentPrice);
    if (!currentPrice) throw new Error('Informe o preço no formato 100,00 (use 0 para gratuito).');
    return currentPrice;
  };

  section.querySelectorAll('[data-ticket]').forEach((button) =>
    button.addEventListener('click', () =>
      formDialog({
        title: 'Novo tipo de ingresso',
        submitLabel: 'Cadastrar ingresso',
        body: html`
          ${field({ name: 'name', label: 'Nome', required: true, attrs: 'maxlength="100" placeholder="Inteira, Meia, Camarote…"' })}
          ${field({ name: 'currentPrice', label: 'Preço de venda (R$)', required: true, attrs: 'inputmode="decimal"' })}`,
        onSubmit: (data) =>
          api.post(`/activities/${button.dataset.ticket}/ticket-types`, { name: data.name, currentPrice: ticketBody(data) }),
      }).then(done('Ingresso cadastrado.')),
    ),
  );

  section.querySelectorAll('[data-price]').forEach((button) =>
    button.addEventListener('click', () =>
      formDialog({
        title: `Preço de ${button.dataset.name}`,
        body: field({
          name: 'currentPrice',
          label: 'Novo preço (R$)',
          value: moneyInput(button.dataset.current),
          required: true,
          attrs: 'inputmode="decimal"',
          hint: 'Vale só para vendas novas. Quem já comprou mantém o preço pago.',
        }),
        onSubmit: (data) => api.patch(`/ticket-types/${button.dataset.price}`, { currentPrice: ticketBody(data) }),
      }).then(done('Preço atualizado.')),
    ),
  );

  section.querySelectorAll('[data-buy]').forEach((button) =>
    button.addEventListener('click', () => {
      if (!suppliers.length) {
        toast('Cadastre um fornecedor em Cadastros antes.', 'error');
        location.hash = '#/cadastros/fornecedores';
        return;
      }
      formDialog({
        title: 'Compra ao fornecedor',
        submitLabel: 'Registrar compra',
        body: html`
          <p><strong>${button.dataset.name}</strong></p>
          ${field({ name: 'supplierId', label: 'Fornecedor', required: true, options: suppliers.map((s) => [s.id, s.name]) })}
          <div class="row">
            ${field({ name: 'quantity', label: 'Quantidade', type: 'number', value: Math.max(Number(button.dataset.missing), 1), required: true, attrs: 'min="1"' })}
            ${field({ name: 'unitCost', label: 'Custo unitário (R$)', required: true, attrs: 'inputmode="decimal"' })}
          </div>
          ${field({ name: 'purchaseDate', label: 'Data da compra', type: 'date', value: today(), required: true })}`,
        onSubmit(data) {
          const unitCost = parseMoney(data.unitCost);
          if (!unitCost) throw new Error('Informe o custo no formato 70,00.');
          return api.post(`/ticket-types/${button.dataset.buy}/supplier-purchases`, {
            supplierId: data.supplierId,
            quantity: Number(data.quantity),
            unitCost,
            purchaseDate: data.purchaseDate,
          });
        },
      }).then(done('Compra registrada.'));
    }),
  );
}

// ------------------------------------------------------------------- finance

async function financeTab(section, excursion, context) {
  const [summary, expenses] = await Promise.all([
    api.get(`/excursions/${excursion.id}/financial-summary`),
    api.get(`/excursions/${excursion.id}/expenses`),
  ]);
  if (!context.isCurrent()) return;

  const lines = (rows) =>
    raw(`<div class="money-lines">${rows.map(([label, value, cls = '']) => html`<div class="${cls}"><span>${label}</span><strong>${money(value)}</strong></div>`).join('')}</div>`);
  const realized = Number(summary.result.realized);

  section.innerHTML = html`
    <div class="signs">
      ${signFigure(money(summary.cash.netReceived), 'recebido (já descontadas devoluções)')}
      ${signFigure(money(summary.cash.receivable), 'a receber', Number(summary.cash.receivable) > 0)}
      ${signFigure(money(summary.expenses.total), 'despesas lançadas')}
      ${signFigure(money(summary.result.realized), realized >= 0 ? 'lucro até agora' : 'prejuízo até agora', realized < 0)}
    </div>
    <div class="grid-2">
      <section class="panel">
        <h2>Receitas</h2>
        <div style="margin-top:.8rem">${lines([
          ['Pacotes combinados', summary.revenue.packagesContracted],
          ['Ingressos vendidos', summary.revenue.ticketsSold],
          ['Retido de cancelamentos', summary.revenue.retainedFromCancellations],
          ['Receita prevista', summary.revenue.expected, 'total'],
        ])}</div>
        <h3 style="margin-top:1.4rem">Caixa</h3>
        <div style="margin-top:.5rem">${lines([
          ['Pagamentos recebidos', summary.cash.received],
          ['Devoluções', summary.cash.refunded],
          ['Recebido líquido', summary.cash.netReceived, 'total'],
        ])}</div>
      </section>
      <section class="panel">
        <h2>Resultado</h2>
        <div style="margin-top:.8rem">${lines([
          ['Recebido líquido', summary.cash.netReceived],
          ['Despesas', `-${summary.expenses.total}`],
          ['Resultado realizado', summary.result.realized, 'total'],
        ])}</div>
        <p class="muted" style="margin-top:1rem">Se todos pagarem o que falta, o resultado será <strong>${money(summary.result.projected)}</strong>.</p>
        <h3 style="margin-top:1.4rem">Custos já conhecidos</h3>
        <p class="muted" style="margin:.3rem 0 .6rem">Para planejar. Entram no resultado quando lançados como despesa.</p>
        ${lines([
          ['Quartos (hotel)', summary.plannedCosts.rooms],
          ['Ingressos comprados de fornecedores', summary.plannedCosts.ticketsFromSuppliers],
        ])}
      </section>
    </div>

    <section class="panel" style="margin-top:1.25rem">
      <div class="panel-head">
        <h2>Despesas</h2>
        ${excursion.status === 'CANCELLED' ? '' : rhtml`<button type="button" data-expense>Lançar despesa</button>`}
      </div>
      ${expenses.length
        ? rhtml`<div class="table-wrap"><table class="responsive">
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th><th></th></tr></thead>
            <tbody>${expenses.map((e) => rhtml`<tr>
              <td data-label="Data">${date(e.expenseDate)}</td>
              <td class="primary" data-label="Descrição">${e.description}</td>
              <td data-label="Categoria">${CATEGORY[e.category]}</td>
              <td class="num" data-label="Valor">${money(e.amount)}</td>
              <td class="num" data-label=""><span class="inline-list" style="justify-content:flex-end">
                <button type="button" class="link-button" data-edit-expense="${e.id}">Editar</button>
                <button type="button" class="link-button" data-delete-expense="${e.id}">Excluir</button></span></td>
            </tr>`)}</tbody></table></div>`
        : empty('Nenhuma despesa lançada', 'Lance fretamento, hotel, seguro, alimentação e outros custos para ver o resultado real.')}
    </section>`;

  const expenseForm = (expense) =>
    formDialog({
      title: expense ? 'Editar despesa' : 'Lançar despesa',
      submitLabel: expense ? 'Salvar' : 'Lançar despesa',
      body: html`
        ${field({ name: 'description', label: 'Descrição', value: expense?.description, required: true, attrs: 'maxlength="255" placeholder="Fretamento do ônibus"' })}
        <div class="row">
          ${field({ name: 'category', label: 'Categoria', value: expense?.category ?? 'TRANSPORT', options: Object.entries(CATEGORY) })}
          ${field({ name: 'amount', label: 'Valor (R$)', value: moneyInput(expense?.amount), required: true, attrs: 'inputmode="decimal"' })}
        </div>
        ${field({ name: 'expenseDate', label: 'Data', type: 'date', value: expense?.expenseDate ?? today(), required: true })}`,
      onSubmit(data) {
        const amount = parseMoney(data.amount);
        if (!amount || Number(amount) <= 0) throw new Error('Informe um valor maior que zero, no formato 1200,00.');
        const body = { ...data, amount };
        return expense ? api.patch(`/expenses/${expense.id}`, body) : api.post(`/excursions/${excursion.id}/expenses`, body);
      },
    });

  const after = (message) => (result) => {
    if (result) {
      toast(message);
      context.refresh();
    }
  };

  section.querySelector('[data-expense]')?.addEventListener('click', () => expenseForm().then(after('Despesa lançada.')));
  section.querySelectorAll('[data-edit-expense]').forEach((button) =>
    button.addEventListener('click', () =>
      expenseForm(expenses.find((e) => e.id === button.dataset.editExpense)).then(after('Despesa atualizada.')),
    ),
  );
  section.querySelectorAll('[data-delete-expense]').forEach((button) =>
    button.addEventListener('click', () =>
      confirmDialog({
        title: 'Excluir despesa',
        text: 'A despesa será removida do resultado da excursão.',
        confirmLabel: 'Excluir',
        onConfirm: () => api.delete(`/expenses/${button.dataset.deleteExpense}`),
      }).then(after('Despesa excluída.')),
    ),
  );
}

// ------------------------------------------------------------------- reports

async function reportsTab(section, excursion, context) {
  const [passengers, participations] = await Promise.all([
    api.get(`/excursions/${excursion.id}/reports/passengers`),
    api.get(`/excursions/${excursion.id}/participations`),
  ]);
  if (!context.isCurrent()) return;

  const active = participations.filter((p) => p.status === 'ACTIVE');
  const pending = active.filter((p) => Number(p.financial.balance) > 0);

  section.innerHTML = html`
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Lista de passageiros</h2>
          <p class="muted">Para o embarque, o hotel e o seguro viagem.</p>
        </div>
        <div class="actions">
          <a class="button secondary" href="/excursions/${excursion.id}/reports/passengers?format=csv" download>Baixar planilha (seguro)</a>
          <button type="button" data-print>Imprimir</button>
        </div>
      </div>
      ${passengers.length
        ? rhtml`<div class="table-wrap"><table class="responsive">
            <thead><tr><th>Nome</th><th>CPF</th><th>RG</th><th>Nascimento</th><th class="num">Idade</th><th>Telefone</th><th>Ônibus</th><th>Quarto</th></tr></thead>
            <tbody>${passengers.map((p) => rhtml`<tr>
              <td class="primary" data-label="Nome">${p.fullName}</td>
              <td data-label="CPF">${p.document}</td>
              <td data-label="RG">${p.rg ? `${p.rg}${p.rgIssuer ? ` ${p.rgIssuer}` : ''}` : '—'}</td>
              <td data-label="Nascimento">${date(p.birthDate)}</td>
              <td class="num" data-label="Idade">${p.ageAtDeparture}</td>
              <td data-label="Telefone">${p.phone ?? '—'}</td>
              <td data-label="Ônibus">${p.vehicle ? `${p.vehicle}${p.seatNumber ? `, poltrona ${p.seatNumber}` : ''}` : '—'}</td>
              <td data-label="Quarto">${p.room ? `${p.room} (${p.hotel})` : '—'}</td>
            </tr>`)}</tbody></table></div>`
        : empty('Sem passageiros ativos', 'A lista aparece aqui quando houver passageiros na excursão.')}
    </section>

    <section class="panel">
      <h2>Quem ainda deve</h2>
      ${pending.length
        ? rhtml`<div class="table-wrap"><table class="responsive" style="margin-top:.8rem">
            <thead><tr><th>Nome</th><th>Telefone</th><th class="num">Combinado</th><th class="num">Pago</th><th class="num">Falta</th></tr></thead>
            <tbody>${pending.sort((a, b) => Number(b.financial.balance) - Number(a.financial.balance)).map((p) => rhtml`<tr class="clickable" data-href="#/participacoes/${p.id}">
              <td class="primary" data-label="Nome"><a href="#/participacoes/${p.id}">${p.person.fullName}</a></td>
              <td data-label="Telefone">${p.person.phone ?? '—'}</td>
              <td class="num" data-label="Combinado">${money(p.contractedAmount)}</td>
              <td class="num" data-label="Pago">${money(p.financial.netPaid)}</td>
              <td class="num" data-label="Falta"><strong>${money(p.financial.balance)}</strong></td>
            </tr>`)}</tbody></table></div>`
        : rhtml`<p class="muted" style="margin-top:.4rem">Todos os passageiros ativos estão quitados.</p>`}
    </section>`;

  section.querySelector('[data-print]').addEventListener('click', () => window.print());
  section.querySelectorAll('tr[data-href]').forEach((row) =>
    row.addEventListener('click', () => (location.hash = row.dataset.href)),
  );
}
