// Formatting helpers. Money stays a decimal string end to end (ADR 0003);
// Number is used only to display it.

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function money(value) {
  return currency.format(Number(value ?? 0));
}

/** "1.500,50" | "1500,5" | "1500.50" → "1500.50" (null when invalid). */
export function parseMoney(input) {
  let text = String(input ?? '').trim().replace(/\s|R\$/g, '');
  if (!text) return null;
  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text)) return null;
  const [integer, decimal = ''] = text.split('.');
  return `${integer.replace(/^0+(?=\d)/, '')}.${decimal.padEnd(2, '0')}`;
}

/** Shows a money string in the Brazilian input format: "1500.50" → "1500,50". */
export function moneyInput(value) {
  return value ? String(value).replace('.', ',') : '';
}

/** "2027-02-10" → "10/02/2027" (no Date object: no time zone drift, ADR 0002). */
export function date(value) {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function period(start, end) {
  const [sy, sm, sd] = start.split('-');
  const [ey, em, ed] = end.split('-');
  if (start === end) return `${Number(sd)} ${months[sm - 1]} ${sy}`;
  if (sy === ey && sm === em) return `${Number(sd)} a ${Number(ed)} ${months[sm - 1]} ${sy}`;
  if (sy === ey) return `${Number(sd)} ${months[sm - 1]} a ${Number(ed)} ${months[em - 1]} ${sy}`;
  return `${date(start)} a ${date(end)}`;
}

export function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function daysUntil(day) {
  const [y, m, d] = day.split('-').map(Number);
  const [ty, tm, td] = today().split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}

export const EXCURSION_STATUS = {
  DRAFT: { label: 'Em planejamento', tone: 'grey' },
  OPEN: { label: 'Vendas abertas', tone: 'green' },
  CONFIRMED: { label: 'Confirmada', tone: 'green' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'yellow' },
  FINISHED: { label: 'Finalizada', tone: 'grey' },
  CANCELLED: { label: 'Cancelada', tone: 'red' },
};

/** Transitions offered in the interface, mirroring the backend table (RN55). */
export const NEXT_STATUS = {
  DRAFT: [['OPEN', 'Abrir vendas'], ['CANCELLED', 'Cancelar excursão']],
  OPEN: [['CONFIRMED', 'Confirmar excursão'], ['CANCELLED', 'Cancelar excursão']],
  CONFIRMED: [['IN_PROGRESS', 'Iniciar viagem'], ['CANCELLED', 'Cancelar excursão']],
  IN_PROGRESS: [['FINISHED', 'Finalizar excursão']],
  FINISHED: [],
  CANCELLED: [],
};

export const EXCURSION_TYPE = { DAY_TRIP: 'Bate-volta', OVERNIGHT: 'Com hospedagem' };

export const SITUATION = {
  PAID: { label: 'Quitado', tone: 'green' },
  PARTIAL: { label: 'Pagando', tone: 'yellow' },
  PENDING: { label: 'Sem pagamento', tone: 'red' },
  CANCELLED: { label: 'Cancelado', tone: 'grey' },
};

export const METHOD = { PIX: 'Pix', CASH: 'Dinheiro', CARD: 'Cartão' };

export const CATEGORY = {
  TRANSPORT: 'Transporte',
  ACCOMMODATION: 'Hospedagem',
  TICKET: 'Ingressos',
  FOOD: 'Alimentação',
  SOUVENIR: 'Brindes',
  INSURANCE: 'Seguro',
  OTHER: 'Outras',
};

export function isFinal(status) {
  return status === 'FINISHED' || status === 'CANCELLED';
}
