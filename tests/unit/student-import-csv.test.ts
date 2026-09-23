import { describe, expect, it } from 'vitest';
import { parseCsv } from '@/features/accounts/csv/parse-student-csv';

describe('Student CSV parser', () => {
  it('parses BOM, quoted commas, escaped quotes, and embedded newlines', () => {
    expect(parseCsv('\uFEFFName,Email,Phone\r\n"Ali, A.",ali@example.com,0123\r\n"Line one\nLine two","a""b@example.com",\r\n')).toEqual({
      headers: ['Name', 'Email', 'Phone'],
      rows: [
        { rowNumber: 2, values: ['Ali, A.', 'ali@example.com', '0123'] },
        { rowNumber: 3, values: ['Line one\nLine two', 'a"b@example.com', ''] },
      ],
    });
  });

  it('rejects ambiguous, malformed, and oversized inputs', () => {
    expect(() => parseCsv('Name,name\na,b')).toThrow('unique');
    expect(() => parseCsv('Name,Email\n"Ali,ali@example.com')).toThrow('unterminated');
    expect(() => parseCsv('Name\n"Ali"x')).toThrow('after closing quote');
    expect(() => parseCsv(`Name\n${'a'.repeat(1_048_577)}`)).toThrow('1 MB');
  });
});
