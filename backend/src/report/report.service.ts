import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { fromCents, toCents } from '../common/money.js';
import { ExcursionService } from '../excursion/excursion.service.js';
import { ageOn } from './age.js';
import { toCsv } from './csv.js';

export interface PassengerLine {
  participationId: string;
  fullName: string;
  document: string;
  birthDate: string;
  ageAtDeparture: number;
  phone: string | null;
  email: string | null;
  vehicle: string | null;
  seatNumber: number | null;
  hotel: string | null;
  room: string | null;
  balance: string;
}

export interface Dashboard {
  totals: {
    persons: number;
    activeExcursions: number;
    activeParticipants: number;
    receivable: string;
    netReceived: string;
  };
  excursions: Array<{
    id: string;
    name: string;
    destination: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    activeParticipants: number;
    seats: number;
    beds: number;
    netReceived: string;
    receivable: string;
  }>;
}

/** UC40 – UC45: operational reports built with aggregate SQL. */
@Injectable()
export class ReportService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly excursionService: ExcursionService,
  ) {}

  /** UC40 — Passenger list, also used for the travel insurance export (RN49). */
  async passengers(excursionId: string): Promise<PassengerLine[]> {
    const excursion = await this.excursionService.findById(excursionId);
    const rows: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT p.id, per.full_name, per.document, per.birth_date::text AS birth_date,
              per.phone, per.email, v.identifier AS vehicle, p.seat_number,
              h.name AS hotel, r.identifier AS room,
              (p.contracted_amount
                 - coalesce((SELECT sum(amount) FROM payment WHERE participation_id = p.id), 0)
                 + coalesce((SELECT sum(rf.amount) FROM refund rf JOIN payment pm ON pm.id = rf.payment_id
                              WHERE pm.participation_id = p.id), 0))::text AS balance
         FROM participation p
         JOIN person per ON per.id = p.person_id
         LEFT JOIN excursion_vehicle v ON v.id = p.excursion_vehicle_id
         LEFT JOIN room r ON r.id = p.room_id
         LEFT JOIN excursion_hotel eh ON eh.id = r.excursion_hotel_id
         LEFT JOIN hotel h ON h.id = eh.hotel_id
        WHERE p.excursion_id = $1 AND p.status = 'ACTIVE'
        ORDER BY per.full_name ASC`,
      [excursionId],
    );

    return rows.map((row) => ({
      participationId: row.id,
      fullName: row.full_name,
      document: row.document,
      birthDate: row.birth_date,
      ageAtDeparture: ageOn(row.birth_date, excursion.startDate),
      phone: row.phone,
      email: row.email,
      vehicle: row.vehicle,
      seatNumber: row.seat_number,
      hotel: row.hotel,
      room: row.room,
      balance: fromCents(Math.max(toCents(row.balance), 0)),
    }));
  }

  async passengersCsv(excursionId: string): Promise<{ filename: string; content: string }> {
    const excursion = await this.excursionService.findById(excursionId);
    const lines = await this.passengers(excursionId);
    const formatDate = (date: string) => date.split('-').reverse().join('/');

    const content = toCsv(
      [
        'Nome completo',
        'Documento',
        'Data de nascimento',
        'Idade na partida',
        'Telefone',
        'E-mail',
        'Ônibus',
        'Poltrona',
        'Hotel',
        'Quarto',
        'Saldo devedor (R$)',
      ],
      lines.map((line) => [
        line.fullName,
        line.document,
        formatDate(line.birthDate),
        line.ageAtDeparture,
        line.phone,
        line.email,
        line.vehicle,
        line.seatNumber,
        line.hotel,
        line.room,
        line.balance.replace('.', ','),
      ]),
    );

    const slug = excursion.name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    return { filename: `passageiros-${slug || excursion.id}.csv`, content };
  }

  /** Home screen: what needs attention across all excursions. */
  async dashboard(): Promise<Dashboard> {
    const excursions: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT e.id, e.name, e.destination, e.type, e.status,
              e.start_date::text AS start_date, e.end_date::text AS end_date,
              (SELECT count(*) FROM participation p
                WHERE p.excursion_id = e.id AND p.status = 'ACTIVE')::int AS active,
              (SELECT coalesce(sum(bt.capacity), 0) FROM excursion_vehicle v
                 JOIN excursion_bus eb ON eb.id = v.excursion_bus_id
                 JOIN bus_type bt ON bt.id = eb.bus_type_id
                WHERE eb.excursion_id = e.id)::int AS seats,
              (SELECT coalesce(sum(r.capacity), 0) FROM room r
                 JOIN excursion_hotel eh ON eh.id = r.excursion_hotel_id
                WHERE eh.excursion_id = e.id)::int AS beds,
              fin.net_received::text AS net_received, fin.receivable::text AS receivable
         FROM excursion e
         LEFT JOIN LATERAL (
           -- Same rules as the excursion financial summary: package and ticket
           -- payments both count, so the home screen and the excursion agree.
           SELECT coalesce(sum(x.paid - x.refunded), 0) AS net_received,
                  coalesce(sum(greatest(x.due - (x.paid - x.refunded), 0))
                           FILTER (WHERE x.counts_as_due), 0) AS receivable
             FROM (
               SELECT p.status = 'ACTIVE' AS counts_as_due, p.contracted_amount AS due,
                      coalesce((SELECT sum(amount) FROM payment WHERE participation_id = p.id), 0) AS paid,
                      coalesce((SELECT sum(rf.amount) FROM refund rf JOIN payment pm ON pm.id = rf.payment_id
                                 WHERE pm.participation_id = p.id), 0) AS refunded
                 FROM participation p WHERE p.excursion_id = e.id
               UNION ALL
               SELECT true, tp.quantity * tp.sold_price,
                      coalesce((SELECT sum(amount) FROM payment WHERE ticket_purchase_id = tp.id), 0),
                      coalesce((SELECT sum(rf.amount) FROM refund rf JOIN payment pm ON pm.id = rf.payment_id
                                 WHERE pm.ticket_purchase_id = tp.id), 0)
                 FROM ticket_purchase tp
                 JOIN participation p ON p.id = tp.participation_id
                WHERE p.excursion_id = e.id
             ) x
         ) fin ON true
        ORDER BY (e.status IN ('FINISHED', 'CANCELLED')) ASC, e.start_date ASC`,
    );
    const [persons] = await this.dataSource.query('SELECT count(*)::int AS total FROM person');

    const open = excursions.filter((row) => !['FINISHED', 'CANCELLED'].includes(row.status));
    const sum = (rows: Array<Record<string, any>>, field: string) =>
      fromCents(rows.reduce((total, row) => total + toCents(row[field]), 0));

    return {
      totals: {
        persons: persons.total,
        activeExcursions: open.length,
        activeParticipants: open.reduce((total, row) => total + row.active, 0),
        receivable: sum(open, 'receivable'),
        netReceived: sum(excursions, 'net_received'),
      },
      excursions: excursions.map((row) => ({
        id: row.id,
        name: row.name,
        destination: row.destination,
        type: row.type,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        activeParticipants: row.active,
        seats: row.seats,
        beds: row.beds,
        netReceived: fromCents(toCents(row.net_received)),
        receivable: fromCents(toCents(row.receivable)),
      })),
    };
  }
}
