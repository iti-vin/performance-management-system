import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ParseGuidPipe } from './parse-guid.pipe.js';

describe('ParseGuidPipe', () => {
  const pipe = new ParseGuidPipe();

  it.each([
    ['a random v4 GUID', '284ddc9e-ebe4-468d-945f-fb18af72e622'],
    ['a dev fixture id that has no version digit', '00000000-0000-0000-0000-000000000141'],
  ])('passes %s through', (_label, id) => {
    expect(pipe.transform(id)).toBe(id);
  });

  it.each([
    ['text', 'cycle'],
    ['a GUID with a missing group', '00000000-0000-0000-000000000141'],
    ['an empty value', ''],
    ['a GUID with a trailing character', '00000000-0000-0000-0000-000000000141x'],
  ])('answers 400 for %s', (_label, id) => {
    expect(() => pipe.transform(id)).toThrow(BadRequestException);
  });
});
