import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ParseVersionPipe } from './parse-version.pipe.js';

describe('ParseVersionPipe', () => {
  const pipe = new ParseVersionPipe();

  it.each([
    ['1', 1],
    ['42', 42],
    ['2147483647', 2147483647],
  ])('reads the version %s', (value, expected) => {
    expect(pipe.transform(value)).toBe(expected);
  });

  it.each(['0', '-1', '1.5', 'abc', '', '01', '1e3', '2147483648', '99999999999999999999'])(
    'answers 400 for %j, which no integer column holds as a version (CWE-20)',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    },
  );
});
