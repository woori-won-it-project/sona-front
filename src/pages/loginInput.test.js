import { describe, expect, it } from 'vitest';
import { hasValidLoginFormat, normalizeEmployeeNumber } from './loginInput';

describe('normalizeEmployeeNumber', () => {
  it('keeps only the first eight digits when text is pasted', () => {
    expect(normalizeEmployeeNumber('A1 02-48가12345')).toBe('10248123');
  });

  it('preserves an empty input', () => {
    expect(normalizeEmployeeNumber('')).toBe('');
  });
});

describe('hasValidLoginFormat', () => {
  const samplePassword = 'Example9!';

  it.each(['32403332', '42403331'])('accepts a valid employee number %s', (employeeNumber) => {
    expect(hasValidLoginFormat(employeeNumber, samplePassword)).toBe(true);
  });

  it.each(['A10248', '22403333', '32413331', '32403333'])(
    'rejects invalid employee number %s',
    (value) => {
      expect(hasValidLoginFormat(value, samplePassword)).toBe(false);
    },
  );

  it.each(['Ab1!', 'example9!', 'EXAMPLE9!', 'Example!!', 'Example9?'])(
    'rejects a password that does not meet the documented format',
    (password) => {
      expect(hasValidLoginFormat('32403332', password)).toBe(false);
    },
  );
});
