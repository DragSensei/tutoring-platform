export const STUDENT_IMPORT_MAX_BYTES = 1_048_576;
export const STUDENT_IMPORT_MAX_ROWS = 500;
export const STUDENT_IMPORT_MAX_COLUMNS = 50;

export type StudentImportField = 'name' | 'email' | 'phone';
export type ParsedCsv = { headers: string[]; rows: Array<{ rowNumber: number; values: string[] }> };

export function parseCsv(text: string): ParsedCsv {
  if (new TextEncoder().encode(text).byteLength > STUDENT_IMPORT_MAX_BYTES) throw new Error('CSV file must be 1 MB or smaller');
  const source = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let recordNumber = 1;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += char;
      }
      continue;
    }
    if (afterQuote && char !== ',' && char !== '\n' && char !== '\r') {
      throw new Error(`Unexpected character after closing quote in CSV record ${recordNumber}`);
    }
    if (char === '"') {
      if (field.length > 0) throw new Error(`Unexpected quote near CSV record ${recordNumber}`);
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
      afterQuote = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) records.push(row);
      row = [];
      field = '';
      afterQuote = false;
      recordNumber += 1;
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('CSV has an unterminated quoted field');
  row.push(field);
  if (row.some((value) => value.trim() !== '')) records.push(row);
  if (records.length === 0) throw new Error('CSV must include a header row');

  const headers = records[0].map((header) => header.trim());
  if (!headers.length || headers.some((header) => !header)) throw new Error('CSV headers must not be blank');
  if (headers.length > STUDENT_IMPORT_MAX_COLUMNS) throw new Error(`CSV may have at most ${STUDENT_IMPORT_MAX_COLUMNS} columns`);
  const normalizedHeaders = headers.map((header) => header.toLocaleLowerCase('en'));
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) throw new Error('CSV headers must be unique');

  const dataRows = records.slice(1);
  if (dataRows.length > STUDENT_IMPORT_MAX_ROWS) throw new Error(`CSV may have at most ${STUDENT_IMPORT_MAX_ROWS} data rows`);
  return {
    headers,
    rows: dataRows.map((values, index) => {
      if (values.length > headers.length && values.slice(headers.length).some((value) => value.trim() !== '')) {
        throw new Error(`CSV record ${index + 2} has more fields than the header`);
      }
      return { rowNumber: index + 2, values: [...values.slice(0, headers.length), ...Array(Math.max(0, headers.length - values.length)).fill('')] };
    }),
  };
}

export function normalizeImportPhone(phone: string) {
  return phone.replace(/\D/g, '');
}
