// Thin client for the REST API. Errors are translated to Portuguese for the
// person using the system; the API itself speaks English.

const translations = [
  [/already has a participation/i, 'Esta pessoa já está nesta excursão.'],
  [/Person with this document already exists/i, 'Já existe uma pessoa cadastrada com este documento.'],
  [/Person not found/i, 'Pessoa não encontrada.'],
  [/Excursion not found/i, 'Excursão não encontrada.'],
  [/Participation not found/i, 'Participação não encontrada.'],
  [/Participation is cancelled/i, 'Esta participação está cancelada.'],
  [/can no longer be changed|Cannot edit an excursion/i, 'Esta excursão já foi finalizada ou cancelada e não pode mais ser alterada.'],
  [/Cannot change excursion status from (\w+) to (\w+)/i, 'Essa mudança de situação não é permitida.'],
  [/Cannot confirm the excursion: (\d+)/i, (m) => `Não é possível confirmar: ${m[1]} passageiro(s) ainda sem quarto.`],
  [/endDate must be on or after startDate/i, 'A data de volta não pode ser anterior à data de ida.'],
  [/Remove the hotels of this excursion before/i, 'Remova os hotéis da excursão antes de transformá-la em bate-volta.'],
  [/Contracted amount cannot be lower/i, 'O valor combinado não pode ficar abaixo do que já foi pago. Registre uma devolução.'],
  [/replacement must be a different person/i, 'Escolha outra pessoa para a substituição.'],
  [/Seat (\d+) is already taken/i, (m) => `A poltrona ${m[1]} já está ocupada.`],
  [/Seat (\d+) does not exist/i, (m) => `A poltrona ${m[1]} não existe neste ônibus.`],
  [/(.+) is full \(RN19\)/i, (m) => `${m[1]} está lotado.`],
  [/A seat requires a vehicle/i, 'Escolha o ônibus antes da poltrona.'],
  [/vehicle does not belong/i, 'Este ônibus é de outra excursão.'],
  [/bus type is already in the excursion/i, 'Este tipo de ônibus já está na excursão: altere a quantidade.'],
  [/reallocate (them|passengers)/i, 'Há passageiros nesses ônibus. Mude-os de ônibus antes.'],
  [/more passengers or a higher seat number/i, 'Há ônibus deste tipo com mais passageiros (ou poltronas) do que a nova capacidade.'],
  [/Day trips have no accommodation/i, 'Excursões bate-volta não têm hospedagem.'],
  [/hotel is already linked/i, 'Este hotel já está na excursão.'],
  [/Remove the rooms of this hotel/i, 'Remova os quartos deste hotel antes.'],
  [/Room (.+) is full/i, (m) => `O quarto ${m[1]} está cheio.`],
  [/room does not belong/i, 'Este quarto é de outra excursão.'],
  [/already a room with this identifier/i, 'Já existe um quarto com esse nome neste hotel.'],
  [/capacity cannot be lower/i, 'O quarto tem mais ocupantes do que a nova capacidade.'],
  [/This room has occupants/i, 'O quarto tem ocupantes. Mude-os de quarto antes.'],
  [/already has a ticket for "(.+)"/i, (m) => `Este passageiro já tem ingresso para "${m[1]}".`],
  [/ticket type belongs to another excursion/i, 'Este ingresso é de outra excursão.'],
  [/already an activity with this name/i, 'Já existe uma atividade com esse nome.'],
  [/already a ticket type with this name/i, 'Já existe um tipo de ingresso com esse nome.'],
  [/already a supplier with this document/i, 'Já existe um fornecedor com este documento.'],
  [/Payment exceeds the outstanding balance of ([\d.]+)/i, (m) => `O valor passa do saldo devedor (${brl(m[1])}).`],
  [/Refund exceeds the refundable amount of ([\d.]+)/i, (m) => `A devolução passa do valor disponível (${brl(m[1])}).`],
  [/excursion was cancelled: register refunds/i, 'A excursão foi cancelada: registre devoluções em vez de pagamentos.'],
  [/Idempotency-Key was already used/i, 'Este pagamento já foi enviado com outros dados. Abra o formulário novamente.'],
  [/amount must be greater than zero/i, 'O valor precisa ser maior que zero.'],
];

function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function translate(status, raw) {
  const message = Array.isArray(raw) ? raw.join(' ') : String(raw ?? '');
  for (const [pattern, text] of translations) {
    const match = message.match(pattern);
    if (match) return typeof text === 'function' ? text(match) : text;
  }
  if (status === 400) return 'Confira os campos do formulário.';
  if (status === 404) return 'Registro não encontrado.';
  if (status === 409) return 'Não foi possível concluir: a situação atual não permite esta operação.';
  return 'Algo deu errado. Tente novamente em instantes.';
}

async function request(method, path, body, headers = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique se o sistema está ligado.');
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, translate(response.status, data?.message));
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body, headers) => request('POST', path, body ?? {}, headers),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
