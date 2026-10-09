import { DataSource } from 'typeorm';

export async function resetDatabase(dataSource: DataSource) {
  await dataSource.query(`TRUNCATE TABLE 
      ticket_purchase,
      ticket_supplier_purchase,
      payment,
      refund,
      expense,
      participation,
      ticket_type,
      activity,
      room,
      excursion_vehicle,
      excursion_hotel,
      excursion_bus,
      supplier,
      hotel,
      bus_type,
      excursion,
      person
    RESTART IDENTITY CASCADE;`); // mesma lista atual
}
