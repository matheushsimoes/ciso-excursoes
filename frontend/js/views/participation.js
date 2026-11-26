import { api } from '../api.js';
import {
  EXCURSION_TYPE,
  METHOD,
  SITUATION,
  date,
  isFinal,
  money,
  moneyInput,
  parseMoney,
  today,
} from '../format.js';
import { badge, confirmDialog, empty, field, formDialog, html, raw, rhtml, toast } from '../ui.js';
import { choosePersonDialog } from './persons.js';
import { pageHead } from './shared.js';

export async function participationView(main, [id], context) {
  const participation = await api.get(`/participations/${id}`);
  const [statement, purchases, transport, accommodation, activities] = await Promise.all([
    api.get(`/participations/${id}/statement`),
    api.get(`/participations/${id}/ticket-purchases`),
    api.get(`/excursions/${participation.excursionId}/transport`),
    participation.excursion.type === 'OVERNIGHT'
      ? api.get(`/excursions/${participation.excursionId}/accommodation`)
      : Promise.resolve(null),
    api.get(`/excursions/${participation.excursionId}/activities`),
  ]);
  if (!context.isCurrent()) return;

  const active = participation.status === 'ACTIVE';
  const editable = active && !isFinal(participation.excursion.status);
  const situation = SITUATION[participation.financial.situation];
  const back = `#/excursoes/${participation.excursionId}/passageiros`;

  main.innerHTML = html`
    ${raw(pageHead({
      title: participation.person.fullName,
      crumbs: html`<a href="#/excursoes">Excursões</a> / <a href="${back}">${participation.excursion.name}</a>`,
      sub: html`${badge(situation.label, situation.tone)} ${participation.status === 'CANCELLED' ? raw(html`Cancelado em ${date(String(participation.cancelledAt).slice(0, 10))}${participation.cancellationReason ? `: ${participation.cancellationReason}` : ''}`) : ''}`,
      actions: html`
        <a class="button secondary" href="#/pessoas/${participation.personId}">Ver cadastro</a>
        ${editable ? rhtml`<button type="button" class="secondary" data-replace>Substituir passageiro</button>
        <button type="button" class="danger" data-cancel>Cancelar participação</button>` : ''}`,
    }))}

    <div class="grid-2">
      <section class="panel">
        <div class="panel-head">
          <h2>Pagamento do pacote</h2>
          ${editable ? rhtml`<button type="button" class="small secondary" data-amount>Alterar valor combinado</button>` : ''}
        </div>
        <div class="money-lines">
          <div><span>Valor combinado</span><strong>${money(statement.package.contracted)}</strong></div>
          <div><span>Pago</span><strong>${money(statement.package.paid)}</strong></div>
          <div><span>Devolvido</span><strong>${money(statement.package.refunded)}</strong></div>
          <div class="total"><span>Falta pagar</span><strong class="${Number(statement.package.balance) > 0 ? 'negative' : 'positive'}">${money(statement.package.balance)}</strong></div>
        </div>
        ${active && Number(statement.package.balance) > 0
          ? rhtml`<button type="button" style="margin-top:1rem;width:100%" data-pay-package>Registrar pagamento</button>`
          : ''}
      </section>

      <section class="panel">
        <h2>Viagem</h2>
        <dl class="kv" style="margin-top:.8rem">
          <dt>Ônibus</dt>
          <dd>${participation.vehicleIdentifier ? `${participation.vehicleIdentifier}${participation.seatNumber ? `, poltrona ${participation.seatNumber}` : ', sem poltrona'}` : 'Sem ônibus'}</dd>
          ${participation.excursion.type === 'OVERNIGHT'
            ? rhtml`<dt>Quarto</dt><dd>${participation.room ? `${participation.room.identifier} (${participation.room.hotelName})` : 'Sem quarto'}</dd>`
            : rhtml`<dt>Hospedagem</dt><dd>${EXCURSION_TYPE.DAY_TRIP}</dd>`}
          <dt>Telefone</dt><dd>${participation.person.phone ?? '—'}</dd>
        </dl>
        ${editable ? rhtml`<div class="actions" style="margin-top:1rem">
          <button type="button" class="small" data-transport>Escolher ônibus e poltrona</button>
          ${accommodation ? rhtml`<button type="button" class="small" data-room>Escolher quarto</button>` : ''}
        </div>` : ''}
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <h2>Ingressos</h2>
        ${editable && activities.some((a) => a.ticketTypes.length) ? rhtml`<button type="button" class="small" data-buy>Vender ingresso</button>` : ''}
      </div>
      ${statement.tickets.length
        ? rhtml`<div class="table-wrap"><table class="responsive">
            <thead><tr><th>Ingresso</th><th>Situação</th><th class="num">Total</th><th class="num">Pago</th><th class="num">Falta</th><th></th></tr></thead>
            <tbody>${statement.tickets.map((ticket) => {
              const purchase = purchases.find((p) => p.id === ticket.ticketPurchaseId);
              return rhtml`<tr>
                <td class="primary" data-label="Ingresso">${ticket.description}${purchase.quantity > 1 ? ` (${purchase.quantity}×)` : ''}</td>
                <td data-label="Situação">${purchase.status === 'CONFIRMED' ? badge('Garantido', 'green') : badge('Pedido', 'yellow')}</td>
                <td class="num" data-label="Total">${money(ticket.total)}</td>
                <td class="num" data-label="Pago">${money(ticket.netPaid)}</td>
                <td class="num" data-label="Falta">${money(ticket.balance)}</td>
                <td class="num" data-label=""><span class="inline-list" style="justify-content:flex-end">
                  ${Number(ticket.balance) > 0 ? rhtml`<button type="button" class="small" data-pay-ticket="${ticket.ticketPurchaseId}" data-balance="${ticket.balance}" data-name="${ticket.description}">Pagar</button>` : ''}
                  ${purchase.status !== 'CONFIRMED' ? rhtml`<button type="button" class="small secondary" data-confirm-ticket="${purchase.id}">Marcar como garantido</button>` : ''}
                </span></td>
              </tr>`;
            })}</tbody></table></div>`
        : rhtml`<p class="muted">Nenhum ingresso vendido para este passageiro.</p>`}
    </section>

    <section class="panel">
      <h2>Pagamentos e devoluções</h2>
      ${statement.payments.length
        ? rhtml`<div class="table-wrap"><table class="responsive" style="margin-top:.8rem">
            <thead><tr><th>Data</th><th>Referente a</th><th>Forma</th><th class="num">Valor</th><th class="num">Devolvido</th><th></th></tr></thead>
            <tbody>${statement.payments.map((payment) => rhtml`<tr>
              <td data-label="Data">${date(payment.paymentDate)}</td>
              <td class="primary" data-label="Referente a">${payment.description}
                ${payment.refunds.length ? rhtml`<details class="refunds"><summary>${payment.refunds.length} devolução(ões)</summary>
                  <ul style="margin:.4rem 0 0;padding-left:1.1rem">${payment.refunds.map((r) => rhtml`<li>${date(r.refundDate)}: ${money(r.amount)}${r.reason ? ` (${r.reason})` : ''}</li>`)}</ul></details>` : ''}</td>
              <td data-label="Forma">${METHOD[payment.method]}</td>
              <td class="num" data-label="Valor">${money(payment.amount)}</td>
              <td class="num" data-label="Devolvido">${money(payment.refunded)}</td>
              <td class="num" data-label="">${Number(payment.refundable) > 0 ? rhtml`<button type="button" class="small secondary" data-refund="${payment.id}" data-refundable="${payment.refundable}">Devolver</button>` : ''}</td>
            </tr>`)}</tbody></table></div>
          <p class="muted" style="margin-top:.8rem">Pagamentos não são editados nem apagados: para corrigir, registre uma devolução.</p>`
        : empty('Nenhum pagamento registrado', active ? 'Registre cada parcela recebida: Pix, dinheiro ou cartão.' : 'Esta participação não tem pagamentos.')}
    </section>`;

  const reload = (message) => (result) => {
    if (result) {
      toast(message);
      context.refresh();
    }
  };

  // Payments carry an Idempotency-Key created when the form opens: if the
  // request is retried (double click, unstable connection), it's charged once.
  const paymentForm = ({ title, balance, target }) => {
    const idempotencyKey = crypto.randomUUID();
    return formDialog({
      title,
      submitLabel: 'Registrar pagamento',
      body: html`
        <p class="muted">Saldo: <strong>${money(balance)}</strong></p>
        <div class="row">
          ${field({ name: 'amount', label: 'Valor recebido (R$)', value: moneyInput(balance), required: true, attrs: 'inputmode="decimal"' })}
          ${field({ name: 'method', label: 'Forma', value: 'PIX', options: Object.entries(METHOD) })}
        </div>
        ${field({ name: 'paymentDate', label: 'Data do pagamento', type: 'date', value: today(), required: true })}`,
      onSubmit(data) {
        const amount = parseMoney(data.amount);
        if (!amount || Number(amount) <= 0) throw new Error('Informe um valor maior que zero, no formato 500,00.');
        return api.post(
          '/payments',
          { ...target, amount, method: data.method, paymentDate: data.paymentDate },
          { 'Idempotency-Key': idempotencyKey },
        );
      },
    });
  };

  main.querySelector('[data-pay-package]')?.addEventListener('click', () =>
    paymentForm({
      title: 'Pagamento do pacote',
      balance: statement.package.balance,
      target: { participationId: id },
    }).then(reload('Pagamento registrado.')),
  );

  main.querySelectorAll('[data-pay-ticket]').forEach((button) =>
    button.addEventListener('click', () =>
      paymentForm({
        title: `Pagamento: ${button.dataset.name}`,
        balance: button.dataset.balance,
        target: { ticketPurchaseId: button.dataset.payTicket },
      }).then(reload('Pagamento registrado.')),
    ),
  );

  main.querySelectorAll('[data-confirm-ticket]').forEach((button) =>
    button.addEventListener('click', async () => {
      await api.post(`/ticket-purchases/${button.dataset.confirmTicket}/confirm`).catch((error) => toast(error.message, 'error'));
      reload('Ingresso garantido.')(true);
    }),
  );

  main.querySelectorAll('[data-refund]').forEach((button) =>
    button.addEventListener('click', () =>
      formDialog({
        title: 'Devolver valor',
        submitLabel: 'Registrar devolução',
        body: html`
          <p class="muted">Disponível para devolução: <strong>${money(button.dataset.refundable)}</strong></p>
          <div class="row">
            ${field({ name: 'amount', label: 'Valor devolvido (R$)', value: moneyInput(button.dataset.refundable), required: true, attrs: 'inputmode="decimal"' })}
            ${field({ name: 'refundDate', label: 'Data', type: 'date', value: today(), required: true })}
          </div>
          ${field({ name: 'reason', label: 'Motivo', attrs: 'maxlength="255" placeholder="Desistência, valor lançado errado…"' })}`,
        onSubmit(data) {
          const amount = parseMoney(data.amount);
          if (!amount || Number(amount) <= 0) throw new Error('Informe um valor maior que zero.');
          return api.post(`/payments/${button.dataset.refund}/refunds`, {
            amount,
            refundDate: data.refundDate,
            reason: data.reason || undefined,
          });
        },
      }).then(reload('Devolução registrada.')),
    ),
  );

  main.querySelector('[data-amount]')?.addEventListener('click', () =>
    formDialog({
      title: 'Valor combinado',
      body: field({
        name: 'contractedAmount',
        label: 'Novo valor (R$)',
        value: moneyInput(participation.contractedAmount),
        required: true,
        attrs: 'inputmode="decimal"',
        hint: 'Não pode ficar abaixo do que já foi pago.',
      }),
      onSubmit(data) {
        const contractedAmount = parseMoney(data.contractedAmount);
        if (!contractedAmount) throw new Error('Informe o valor no formato 1500,00.');
        return api.patch(`/participations/${id}/contracted-amount`, { contractedAmount });
      },
    }).then(reload('Valor combinado atualizado.')),
  );

  main.querySelector('[data-transport]')?.addEventListener('click', () => {
    const vehicles = transport.buses.flatMap((bus) => bus.vehicles.map((v) => ({ ...v, busType: bus.busType.name })));
    if (!vehicles.length) {
      toast('Esta excursão ainda não tem ônibus. Adicione na aba Transporte.', 'error');
      return;
    }
    formDialog({
      title: 'Ônibus e poltrona',
      body: html`
        ${field({
          name: 'excursionVehicleId',
          label: 'Ônibus',
          value: participation.excursionVehicleId ?? '',
          options: [['', 'Sem ônibus'], ...vehicles.map((v) => [v.id, `${v.identifier}: ${v.busType} (${v.occupied}/${v.capacity})`])],
        })}
        ${field({ name: 'seatNumber', label: 'Poltrona', type: 'number', value: participation.seatNumber ?? '', attrs: 'min="1"', hint: 'Deixe vazio para escolher depois. O mapa de poltronas está na aba Transporte.' })}`,
      onSubmit(data) {
        const excursionVehicleId = data.excursionVehicleId || null;
        return api.patch(`/participations/${id}/transport`, {
          excursionVehicleId,
          seatNumber: excursionVehicleId && data.seatNumber ? Number(data.seatNumber) : null,
        });
      },
    }).then(reload('Transporte atualizado.'));
  });

  main.querySelector('[data-room]')?.addEventListener('click', () => {
    const rooms = accommodation.hotels.flatMap((entry) =>
      entry.rooms.map((room) => ({ ...room, hotel: entry.hotel.name })),
    );
    if (!rooms.length) {
      toast('Esta excursão ainda não tem quartos. Cadastre na aba Hospedagem.', 'error');
      return;
    }
    formDialog({
      title: 'Quarto',
      body: field({
        name: 'roomId',
        label: 'Quarto',
        value: participation.roomId ?? '',
        options: [
          ['', 'Sem quarto'],
          ...rooms.map((room) => [room.id, `${room.hotel}, quarto ${room.identifier} (${room.occupants.length}/${room.capacity})`]),
        ],
      }),
      onSubmit: (data) => api.patch(`/participations/${id}/room`, { roomId: data.roomId || null }),
    }).then(reload('Quarto atualizado.'));
  });

  main.querySelector('[data-buy]')?.addEventListener('click', () => {
    const bought = new Set(purchases.map((p) => p.activityId));
    const options = activities
      .filter((activity) => !bought.has(activity.id))
      .flatMap((activity) => activity.ticketTypes.map((t) => [t.id, `${activity.name}: ${t.name} (${money(t.currentPrice)})`]));
    if (!options.length) {
      toast('Este passageiro já tem ingresso para todas as atividades.', 'error');
      return;
    }
    formDialog({
      title: 'Vender ingresso',
      submitLabel: 'Vender',
      body: html`
        ${field({ name: 'ticketTypeId', label: 'Ingresso', required: true, options, hint: 'Um tipo de ingresso por atividade para cada passageiro.' })}
        ${field({ name: 'quantity', label: 'Quantidade', type: 'number', value: 1, required: true, attrs: 'min="1" max="50"' })}`,
      onSubmit: (data) =>
        api.post(`/participations/${id}/ticket-purchases`, { ticketTypeId: data.ticketTypeId, quantity: Number(data.quantity) }),
    }).then(reload('Ingresso vendido.'));
  });

  main.querySelector('[data-cancel]')?.addEventListener('click', () =>
    formDialog({
      title: 'Cancelar participação',
      submitLabel: 'Cancelar participação',
      danger: true,
      body: html`
        <p>${participation.person.fullName} deixa a excursão. Poltrona e quarto ficam livres. O histórico e os pagamentos continuam guardados.</p>
        ${Number(participation.financial.netPaid) > 0
          ? rhtml`<p class="muted">Já foram pagos ${money(participation.financial.netPaid)}. Se for devolver algo, use "Devolver" em cada pagamento depois de cancelar.</p>`
          : ''}
        ${field({ name: 'reason', label: 'Motivo (opcional)', attrs: 'maxlength="255"' })}`,
      onSubmit: (data) => api.post(`/participations/${id}/cancel`, { reason: data.reason || undefined }),
    }).then(reload('Participação cancelada.')),
  );

  main.querySelector('[data-replace]')?.addEventListener('click', async () => {
    const person = await choosePersonDialog({ title: 'Quem assume a vaga?', exclude: new Set([participation.personId]) });
    if (!person) return;
    const created = await formDialog({
      title: 'Substituir passageiro',
      submitLabel: 'Substituir',
      body: html`
        <p><strong>${participation.person.fullName}</strong> será cancelado(a) e <strong>${person.fullName}</strong> entra na excursão. Ônibus, poltrona e quarto são escolhidos de novo.</p>
        ${field({ name: 'contractedAmount', label: 'Valor combinado com quem entra (R$)', value: moneyInput(participation.contractedAmount), required: true, attrs: 'inputmode="decimal"' })}`,
      onSubmit(data) {
        const contractedAmount = parseMoney(data.contractedAmount);
        if (!contractedAmount) throw new Error('Informe o valor no formato 1500,00.');
        return api.post(`/participations/${id}/replace`, { personId: person.id, contractedAmount });
      },
    });
    if (created) {
      toast(`${person.fullName} entrou na excursão.`);
      location.hash = `#/participacoes/${created.id}`;
    }
  });
}
