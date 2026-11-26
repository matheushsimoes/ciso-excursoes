#!/usr/bin/env node
/**
 * Imports an excursion from Ciso's "HOTEL GERAL" spreadsheet (exported as CSV
 * with ";" separators, Windows-1252 or UTF-8), through the public API, so
 * every business rule and validation is applied.
 *
 * It creates or reuses: people (matched by CPF), the bus type, the hotel.
 * It creates: the excursion, its buses (without seats), the hotel link, one
 * room per group of the sheet, the participations, room assignments and
 * activities (without ticket types).
 *
 * The CSV holds personal data (CPF, RG, addresses). Keep it in backend/data/
 * (ignored by git) and never commit it: the repository is public.
 *
 * Usage (with the application running):
 *   node scripts/import-hotel-sheet.mjs scripts/imports/rio-2027.json data/rio-2027.csv [--dry-run]
 *
 * The package price depends on the room type (config.packagePrices: SGL,
 * DBL, TWIN, TPL). Courtesy rooms (config.courtesyRoomGroups, or "CORTESIA"
 * in the sheet) are free. --price overrides the excursion reference price.
 */
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const [value] = args.splice(index, 2).slice(1);
  return value;
};
const dryRun = args.includes('--dry-run');
if (dryRun) args.splice(args.indexOf('--dry-run'), 1);
const priceArgument = flag('--price');
const [configPath, csvPath] = args;
if (!configPath || !csvPath) {
  console.error('Usage: node scripts/import-hotel-sheet.mjs <config.json> <sheet.csv> [--price 2500.00] [--dry-run]');
  process.exit(1);
}

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const warnings = new Set();
const warn = (message) => warnings.add(message);

// ------------------------------------------------------------------ parsing

function decode(buffer) {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}

const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di']);
function titleCase(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

function parseCpf(raw, name) {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length !== 11) {
    warn(`${name}: CPF "${raw}" não tem 11 dígitos; mantido como está.`);
    return raw.trim();
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function parseBirthDate(raw, name) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((raw ?? '').trim());
  if (!match) throw new Error(`${name}: data de nascimento inválida "${raw}"`);
  let [, day, month, year] = match;
  if (Number(year) > new Date().getFullYear()) {
    const fixed = String(Number(year) - 100);
    warn(`${name}: nascimento ${raw} está no futuro; importado como ${day}/${month}/${fixed}. Confira.`);
    year = fixed;
  }
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parsePhone(raw) {
  const match = /\(?(\d{2})\)?\s*(\d{4,5})-?(\d{4})/.exec(raw ?? '');
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : undefined;
}

function parseEmail(raw, name) {
  const email = (raw ?? '').trim().toLowerCase();
  if (!email) return undefined;
  if (!/^[^\s@#]+@[^\s@]+\.[a-z]{2,}$/.test(email)) {
    warn(`${name}: e-mail "${raw.trim()}" inválido; não importado.`);
    return undefined;
  }
  return email;
}

function parseAddress(raw) {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim();
  const match = /^(.*?)\s*-\s*([^-]+?)\s*\/\s*([A-Za-z]{2})\s*$/.exec(text);
  if (!match) return { address: text ? titleCase(text) : undefined };
  return { address: titleCase(match[1]), city: titleCase(match[2]), state: match[3].toUpperCase() };
}

function parsePostalCodeAndNeighborhood(raw, name) {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim();
  const match = /(\d{4,5})-?(\d{3})/.exec(text);
  const rest = text.replace(/\d{4,5}-?\d{3}/, '').replace(/^[\s/-]+|[\s/-]+$/g, '');
  let postalCode;
  if (match && match[1].length === 5) postalCode = `${match[1]}-${match[2]}`;
  else if (match) warn(`${name}: CEP "${match[0]}" incompleto; não importado.`);
  return { postalCode, neighborhood: rest ? titleCase(rest) : undefined };
}

function parseRgIssuer(raw) {
  const text = (raw ?? '').trim().toUpperCase().replace(/\s/g, '');
  if (!text) return undefined;
  return /^[A-Z]{2,4}[A-Z]{2}$/.test(text) && !text.includes('/') ? `${text.slice(0, -2)}/${text.slice(-2)}` : text;
}

const CAPACITY = { SGL: 1, DBL: 2, TWIN: 2, TPL: 3 };
const BUS_ONLY = /\/\s*S[OÓ]\s+[OÔ]NIBUS/i;
const isBusOnly = (row) => BUS_ONLY.test(row[1] ?? '');

function parseSheet(text) {
  const rows = text.split(/\r?\n/).map((line) => line.split(';'));
  const headerIndex = rows.findIndex((row) => row[0]?.trim().toUpperCase() === 'QUARTOS' && row[2]?.trim().toUpperCase() === 'NOME');
  if (headerIndex === -1) throw new Error('Cabeçalho "QUARTOS;APELIDO;NOME" não encontrado.');

  const groups = [];
  let current = null;
  for (const row of rows.slice(headerIndex + 1)) {
    const [groupCell = '', nickname = '', fullName = ''] = row;
    if (groupCell.trim().toUpperCase().startsWith('QUARTOS COM')) break;
    // Drivers stay in the courtesy room set in the configuration (extraRooms).
    if (!fullName.trim() || nickname.trim().toUpperCase() === 'MOTORISTA') continue;
    const group = groupCell.trim();
    if (/^\d+$/.test(group) || !current) {
      current = { number: group || String(groups.length + 1), type: null, courtesy: false, people: [] };
      groups.push(current);
    } else if (group.toUpperCase() === 'CORTESIA') {
      current.courtesy = true;
    }
    const roomType = (row[11] ?? '').trim().toUpperCase();
    if (!current.type && CAPACITY[roomType]) current.type = roomType;
    current.people.push(row);
  }
  // "SÓ ÔNIBUS" in the nickname: travels with the group but has no bed.
  for (const group of groups) {
    group.busOnly = group.people.filter((row) => isBusOnly(row));
    group.people = group.people.filter((row) => !isBusOnly(row));
  }
  return groups;
}

function toPerson(row) {
  const name = titleCase(row[2]);
  const person = {
    fullName: name,
    nickname: row[1].replace(BUS_ONLY, '').trim() ? titleCase(row[1].replace(BUS_ONLY, '')) : undefined,
    document: parseCpf(row[9], name),
    birthDate: parseBirthDate(row[10], name),
    phone: parsePhone(row[5]),
    email: parseEmail(row[6], name),
    rg: row[7]?.trim() || undefined,
    rgIssuer: parseRgIssuer(row[8]),
    ...parseAddress(row[3]),
    ...parsePostalCodeAndNeighborhood(row[4], name),
  };
  if (!person.rg) warn(`${name}: sem RG na planilha.`);
  for (const key of Object.keys(person)) if (person[key] === undefined) delete person[key];
  return person;
}

// --------------------------------------------------------------------- API

async function call(method, path, body) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
const get = (path) => call('GET', path);
const post = (path, body) => call('POST', path, body);
const patch = (path, body) => call('PATCH', path, body);

async function findOrCreatePerson(person) {
  try {
    return { person: await post('/persons', person), created: true };
  } catch (error) {
    if (error.status !== 409) throw error;
    const [existing] = (await get(`/persons?search=${encodeURIComponent(person.document)}`)).filter(
      (candidate) => candidate.document === person.document,
    );
    if (!existing) throw error;
    const { document: _document, ...details } = person;
    return { person: await patch(`/persons/${existing.id}`, details), created: false };
  }
}

// -------------------------------------------------------------------- main

const config = JSON.parse(await readFile(configPath, 'utf8'));
const groups = parseSheet(decode(await readFile(csvPath)));
const referencePrice = priceArgument ?? config.excursion.referencePrice;
if (!referencePrice || !/^\d{1,10}(\.\d{1,2})?$/.test(referencePrice)) {
  console.error('Informe o preço de referência: excursion.referencePrice no arquivo de configuração ou --price 1690.00.');
  process.exit(1);
}
const courtesy = new Set(config.courtesyRoomGroups ?? []);

const people = groups.flatMap((group) =>
  [...group.people, ...group.busOnly].map((row) => ({ group, person: toPerson(row) })),
);
for (const group of groups) {
  for (const row of group.busOnly) {
    warn(`${titleCase(row[2])}: só ônibus, sem quarto; entra com o valor do quarto da família. Confira o valor combinado.`);
  }
}
const documents = new Map();
for (const { person } of people) {
  if (documents.has(person.document)) throw new Error(`CPF repetido: ${person.document} (${person.fullName} e ${documents.get(person.document)})`);
  documents.set(person.document, person.fullName);
}
for (const group of groups) {
  if (!group.type) {
    group.type = ['SGL', 'DBL', 'TPL'][Math.min(group.people.length, 3) - 1];
    warn(`Quarto ${group.number}: tipo não informado; considerado ${group.type}.`);
  }
  if (group.people.length > CAPACITY[group.type]) {
    warn(`Quarto ${group.number} (${group.type}) tem ${group.people.length} pessoas.`);
  }
}

console.log(`${people.length} pessoas em ${groups.length} quartos.`);
if (dryRun) {
  for (const group of groups) {
    console.log(`  ${group.number.padStart(2, '0')} ${group.type}${courtesy.has(group.number) || group.courtesy ? ' (cortesia)' : ''}: ${group.people.map((row) => titleCase(row[2])).join(', ')}`);
  }
  warnings.forEach((message) => console.log(`! ${message}`));
  process.exit(0);
}

const existing = (await get('/excursions')).find((excursion) => excursion.name === config.excursion.name);
if (existing) {
  console.error(`A excursão "${config.excursion.name}" já existe. Nada foi alterado.`);
  process.exit(1);
}

const excursion = await post('/excursions', { ...config.excursion, referencePrice });

if (config.buses) {
  const { busType, quantity } = config.buses;
  const known = (await get('/bus-types')).find((type) => type.name === busType.name && type.capacity === busType.capacity);
  const type = known ?? (await post('/bus-types', busType));
  await post(`/excursions/${excursion.id}/buses`, { busTypeId: type.id, quantity });
}

const knownHotel = (await get('/hotels')).find((hotel) => hotel.name === config.hotel.name);
const hotel = knownHotel ?? (await post('/hotels', config.hotel));
const overview = await post(`/excursions/${excursion.id}/hotels`, { hotelId: hotel.id });
const link = overview.hotels.find((entry) => (entry.hotelId ?? entry.hotel?.id) === hotel.id);

let createdPeople = 0;
for (const group of groups) {
  const isCourtesy = courtesy.has(group.number) || group.courtesy;
  const room = await post(`/excursion-hotels/${link.id}/rooms`, {
    identifier: `${group.number.padStart(2, '0')} ${group.type}`,
    capacity: Math.max(CAPACITY[group.type], group.people.length),
    cost: isCourtesy ? '0.00' : config.roomCosts[group.type],
  });
  for (const row of [...group.people, ...group.busOnly]) {
    const { person, created } = await findOrCreatePerson(toPerson(row));
    if (created) createdPeople += 1;
    const participation = await post(`/excursions/${excursion.id}/participations`, {
      personId: person.id,
      contractedAmount: isCourtesy ? '0.00' : (config.packagePrices?.[group.type] ?? referencePrice),
    });
    if (!isBusOnly(row)) await patch(`/participations/${participation.id}/room`, { roomId: room.id });
  }
}
for (const room of config.extraRooms ?? []) {
  await post(`/excursion-hotels/${link.id}/rooms`, room);
}
for (const activity of config.activities ?? []) {
  await post(`/excursions/${excursion.id}/activities`, activity);
}

console.log(`Excursão "${excursion.name}" importada: ${people.length} passageiros (${createdPeople} pessoas novas), ${groups.length + (config.extraRooms?.length ?? 0)} quartos.`);
if (warnings.size) {
  console.log(`\nConfira na tela (${warnings.size} avisos):`);
  warnings.forEach((message) => console.log(`! ${message}`));
}
