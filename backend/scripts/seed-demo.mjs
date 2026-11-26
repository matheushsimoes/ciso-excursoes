#!/usr/bin/env node
/**
 * Fills an empty database with a realistic demo, through the public API, so
 * every business rule is applied: two excursions, passengers, buses, rooms,
 * tickets, payments, a cancellation with refund and expenses.
 *
 * Usage (with the application running):
 *   node scripts/seed-demo.mjs            # http://localhost:3000
 *   BASE_URL=http://localhost:3100 node scripts/seed-demo.mjs
 */
const base = process.env.BASE_URL ?? 'http://localhost:3000';

async function call(method, path, body) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
const post = (path, body) => call('POST', path, body);
const patch = (path, body) => call('PATCH', path, body);

const people = [
  ['Ana Paula Ferreira', '1985-03-14', '13991230001'],
  ['Benedito Santos', '1952-11-02', '13991230002'],
  ['Carla Mendes', '1990-07-21', '13991230003'],
  ['Daniel Oliveira', '1988-01-30', '13991230004'],
  ['Elaine Costa', '1979-09-09', '13991230005'],
  ['Fábio Ribeiro', '1995-05-17', '13991230006'],
  ['Gabriela Lima', '2001-12-05', '13991230007'],
  ['Hélio Nascimento', '1960-04-25', '13991230008'],
  ['Iracema Souza', '1948-08-13', '13991230009'],
  ['João Pedro Alves', '2010-02-28', '13991230010'],
  ['Kátia Rocha', '1983-06-11', '13991230011'],
  ['Luiz Carlos Prado', '1970-10-19', '13991230012'],
];

const existing = await call('GET', '/excursions');
if (existing.length) {
  console.log('The database already has excursions: seed skipped.');
  process.exit(0);
}

const persons = [];
for (const [index, [fullName, birthDate, phone]] of people.entries()) {
  persons.push(
    await post('/persons', {
      fullName,
      birthDate,
      phone,
      document: String(31000000000 + index * 7919),
    }),
  );
}

// ---------------------------------------------------------------- Carnaval
const rio = await post('/excursions', {
  name: 'Carnaval no Rio 2027',
  destination: 'Rio de Janeiro, RJ',
  type: 'OVERNIGHT',
  startDate: '2027-02-05',
  endDate: '2027-02-09',
  referencePrice: '1650.00',
});
const doubleDeck = await post('/bus-types', { name: 'Double-Deck', capacity: 24, description: 'Leito no piso inferior' });
await post('/bus-types', { name: 'Executivo', capacity: 46 });
const transport = await post(`/excursions/${rio.id}/buses`, { busTypeId: doubleDeck.id, quantity: 1 });
const vehicle = transport.buses[0].vehicles[0];

const hotel = await post('/hotels', { name: 'Hotel Atlântico Copacabana', address: 'Rua Barata Ribeiro, 100', phone: '2135550100' });
const linked = await post(`/excursions/${rio.id}/hotels`, { hotelId: hotel.id });
const excursionHotel = linked.hotels[0].id;
const rooms = [];
for (const [identifier, capacity] of [['101', 2], ['102', 3], ['103', 2], ['201', 4]]) {
  rooms.push(await post(`/excursion-hotels/${excursionHotel}/rooms`, { identifier, capacity, cost: String(capacity * 380) }));
}

const salgueiro = await post(`/excursions/${rio.id}/activities`, {
  name: 'Ensaio na quadra do Salgueiro',
  description: 'Sábado à noite, com transporte do hotel',
});
const inteira = await post(`/activities/${salgueiro.id}/ticket-types`, { name: 'Inteira', currentPrice: '120.00' });
await post(`/activities/${salgueiro.id}/ticket-types`, { name: 'Meia-entrada', currentPrice: '60.00' });
const desfile = await post(`/excursions/${rio.id}/activities`, { name: 'Desfile no Sambódromo' });
const arquibancada = await post(`/activities/${desfile.id}/ticket-types`, { name: 'Arquibancada setor 9', currentPrice: '280.00' });

const rioParticipants = [];
for (const [index, person] of persons.slice(0, 9).entries()) {
  const participation = await post(`/excursions/${rio.id}/participations`, {
    personId: person.id,
    contractedAmount: index === 1 ? '1500.00' : undefined,
  });
  rioParticipants.push(participation);
  await patch(`/participations/${participation.id}/transport`, {
    excursionVehicleId: vehicle.id,
    seatNumber: index + 1,
  });
}
const roomPlan = [0, 0, 1, 1, 1, 2, 2, 3];
for (const [index, roomIndex] of roomPlan.entries()) {
  await patch(`/participations/${rioParticipants[index].id}/room`, { roomId: rooms[roomIndex].id });
}

const pay = (target, amount, method, paymentDate) =>
  post('/payments', { ...target, amount, method, paymentDate });
await pay({ participationId: rioParticipants[0].id }, '1650.00', 'PIX', '2026-10-02');
await pay({ participationId: rioParticipants[1].id }, '500.00', 'CASH', '2026-10-05');
await pay({ participationId: rioParticipants[1].id }, '500.00', 'CASH', '2026-11-05');
await pay({ participationId: rioParticipants[2].id }, '825.00', 'CARD', '2026-10-20');
await pay({ participationId: rioParticipants[3].id }, '1650.00', 'PIX', '2026-11-01');
await pay({ participationId: rioParticipants[5].id }, '300.00', 'PIX', '2026-11-10');

for (const index of [0, 2, 3, 6]) {
  const purchase = await post(`/participations/${rioParticipants[index].id}/ticket-purchases`, {
    ticketTypeId: index === 6 ? inteira.id : arquibancada.id,
    quantity: 1,
  });
  if (index !== 6) await pay({ ticketPurchaseId: purchase.id }, purchase.total, 'PIX', '2026-11-12');
}
const liesa = await post('/suppliers', { name: 'Central de Ingressos Rio', phone: '2130000000' });
await post(`/ticket-types/${arquibancada.id}/supplier-purchases`, {
  supplierId: liesa.id,
  quantity: 2,
  unitCost: '210.00',
  purchaseDate: '2026-11-15',
});

// Someone gave up: cancelled with a partial refund.
const giveUp = rioParticipants[8];
const payment = await pay({ participationId: giveUp.id }, '600.00', 'PIX', '2026-10-15');
await post(`/participations/${giveUp.id}/cancel`, { reason: 'Problema de saúde na família' });
await post(`/payments/${payment.id}/refunds`, { amount: '450.00', refundDate: '2026-11-18', reason: 'Desistência: devolução de 75%' });

await post(`/excursions/${rio.id}/expenses`, { description: 'Sinal do fretamento do ônibus', category: 'TRANSPORT', amount: '4200.00', expenseDate: '2026-10-10' });
await post(`/excursions/${rio.id}/expenses`, { description: 'Sinal do hotel', category: 'ACCOMMODATION', amount: '2500.00', expenseDate: '2026-10-12' });
await post(`/excursions/${rio.id}/expenses`, { description: 'Seguro viagem do grupo', category: 'INSURANCE', amount: '360.00', expenseDate: '2026-11-20' });
await patch(`/excursions/${rio.id}/status`, { status: 'OPEN' });

// --------------------------------------------------------------- Aparecida
const aparecida = await post('/excursions', {
  name: 'Romaria a Aparecida',
  destination: 'Aparecida, SP',
  type: 'DAY_TRIP',
  startDate: '2027-03-14',
  endDate: '2027-03-14',
  referencePrice: '190.00',
});
const executive = (await call('GET', '/bus-types')).find((type) => type.name === 'Executivo');
const aparecidaBus = await post(`/excursions/${aparecida.id}/buses`, { busTypeId: executive.id, quantity: 1 });
for (const [index, person] of [persons[1], persons[8], persons[9], persons[10], persons[11]].entries()) {
  const participation = await post(`/excursions/${aparecida.id}/participations`, { personId: person.id });
  await patch(`/participations/${participation.id}/transport`, {
    excursionVehicleId: aparecidaBus.buses[0].vehicles[0].id,
    seatNumber: index + 1,
  });
  if (index < 3) await pay({ participationId: participation.id }, '190.00', 'CASH', '2026-11-22');
}
await patch(`/excursions/${aparecida.id}/status`, { status: 'OPEN' });

console.log(`Demo data created: ${persons.length} people, 2 excursions. Open ${base}`);
