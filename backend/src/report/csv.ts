/**
 * CSV for spreadsheet tools used in Brazil: `;` separator (`,` is the decimal
 * separator there) and a UTF-8 BOM so accents open correctly in Excel.
 */
export function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const escape = (value: string | number | null) => {
    const text = value === null ? '' : String(value);
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}
