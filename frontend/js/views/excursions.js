import { api } from '../api.js';
import { EXCURSION_TYPE, moneyInput, parseMoney } from '../format.js';
import { empty, field, formDialog, html, raw, toast } from '../ui.js';
import { excursionTicket, pageHead } from './shared.js';

/** Create or edit an excursion. Resolves with the saved excursion or null. */
export function excursionForm(excursion) {
  const editing = Boolean(excursion);
  return formDialog({
    title: editing ? 'Editar excursão' : 'Nova excursão',
    submitLabel: editing ? 'Salvar alterações' : 'Criar excursão',
    body: html`
      ${field({ name: 'name', label: 'Nome', value: excursion?.name, required: true, attrs: 'maxlength="150" placeholder="Carnaval no Rio 2027"' })}
      ${field({ name: 'destination', label: 'Destino', value: excursion?.destination, required: true, attrs: 'maxlength="150"' })}
      ${field({
        name: 'type',
        label: 'Tipo de viagem',
        value: excursion?.type ?? 'OVERNIGHT',
        options: Object.entries(EXCURSION_TYPE),
        hint: 'Bate-volta não tem hospedagem; com hospedagem exige quarto para cada passageiro antes de confirmar.',
      })}
      <div class="row">
        ${field({ name: 'startDate', label: 'Ida', type: 'date', value: excursion?.startDate, required: true })}
        ${field({ name: 'endDate', label: 'Volta', type: 'date', value: excursion?.endDate, required: true })}
      </div>
      ${field({
        name: 'referencePrice',
        label: 'Preço do pacote (R$)',
        value: moneyInput(excursion?.referencePrice),
        required: true,
        attrs: 'inputmode="decimal" placeholder="1500,00"',
        hint: 'Valor sugerido para cada passageiro. Pode ser negociado individualmente.',
      })}`,
    onOpen(form) {
      // A day trip starts and ends on the same day: copy the date to save typing.
      form.startDate.addEventListener('change', () => {
        if (!form.endDate.value || form.endDate.value < form.startDate.value) {
          form.endDate.value = form.startDate.value;
        }
      });
    },
    async onSubmit(data) {
      const referencePrice = parseMoney(data.referencePrice);
      if (!referencePrice) throw new Error('Informe o preço no formato 1500,00.');
      const body = { ...data, referencePrice };
      const saved = editing
        ? await api.patch(`/excursions/${excursion.id}`, body)
        : await api.post('/excursions', body);
      toast(editing ? 'Excursão atualizada.' : 'Excursão criada.');
      return saved;
    },
  });
}

export async function excursionsView(main, _params, { isCurrent, query }) {
  const data = await api.get('/dashboard');
  if (!isCurrent()) return;

  main.innerHTML = html`
    ${raw(pageHead({
      title: 'Excursões',
      sub: 'Todas as viagens, da mais próxima à mais distante.',
      actions: html`<button type="button" data-new>Nova excursão</button>`,
    }))}
    ${data.excursions.length
      ? raw(`<div class="tickets">${data.excursions.map((e) => excursionTicket(e).value).join('')}</div>`)
      : empty('Nenhuma excursão cadastrada', 'Comece pela próxima viagem: destino, datas e preço do pacote.')}
  `;

  const create = async () => {
    const saved = await excursionForm();
    if (saved) location.hash = `#/excursoes/${saved.id}`;
  };
  main.querySelector('[data-new]').addEventListener('click', create);
  if (query.has('nova')) {
    history.replaceState(null, '', '#/excursoes');
    create();
  }
}
