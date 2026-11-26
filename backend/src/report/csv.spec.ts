import { toCsv } from './csv.js';

describe('toCsv', () => {
  it('should use ; as separator, CRLF line breaks and a BOM', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a;b\r\n1;x\r\n');
  });

  it('should quote values containing separators, quotes or line breaks', () => {
    expect(toCsv(['name'], [['Silva; "Zé"']])).toBe('﻿name\r\n"Silva; ""Zé"""\r\n');
  });

  it('should write null as an empty cell', () => {
    expect(toCsv(['a', 'b'], [[null, 'x']])).toBe('﻿a;b\r\n;x\r\n');
  });
});
