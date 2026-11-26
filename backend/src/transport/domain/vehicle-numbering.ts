/**
 * Vehicles of an excursion are numbered "Ônibus 1", "Ônibus 2"... across all
 * bus types, so the operator can refer to them unambiguously (RN12).
 */
export const VEHICLE_PREFIX = 'Ônibus';

export function nextVehicleNumbers(existingIdentifiers: string[], count: number): string[] {
  const used = new Set(
    existingIdentifiers
      .map((identifier) => identifier.match(/(\d+)$/)?.[1])
      .filter((value): value is string => value !== undefined)
      .map(Number),
  );

  const identifiers: string[] = [];
  let number = 1;
  while (identifiers.length < count) {
    if (!used.has(number)) {
      identifiers.push(`${VEHICLE_PREFIX} ${number}`);
    }
    number++;
  }
  return identifiers;
}

/** Vehicle number used to choose which vehicles to remove first (highest number). */
export function vehicleNumber(identifier: string): number {
  return Number(identifier.match(/(\d+)$/)?.[1] ?? 0);
}
