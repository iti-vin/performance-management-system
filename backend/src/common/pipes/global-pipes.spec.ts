import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { globalPipes } from './global-pipes.js';

// PostgreSQL stores no NUL character: every route refuses it before the database sees it.
describe('globalPipes', () => {
  const pass = async (value: unknown, type: ArgumentMetadata['type']) => {
    let current = value;
    for (const pipe of globalPipes()) current = await pipe.transform(current, { type, metatype: Object });
    return current;
  };

  it.each([
    ['a body field', { name: 'a\u0000b' }, 'body', 'name'],
    ['a nested body field', { sections: [{ title: 'a\u0000' }] }, 'body', 'sections.0.title'],
    ['a key of a body', { ['a\u0000']: 'x' }, 'body', 'body'],
    ['a query value', { q: '\u0000' }, 'query', 'q'],
  ] as const)('refuses a NUL character in %s with 400 and the field', async (_what, value, type, field) => {
    const error = await pass(value, type).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      details: [{ field, code: 'INVALID_CHARACTER', message: 'Remove the character that cannot be saved.' }],
    });
  });

  it('refuses a deeply nested body without running out of stack', async () => {
    let deep: unknown = 'a\u0000';
    for (let level = 0; level < 40_000; level += 1) deep = [deep];

    await expect(pass(deep, 'body')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('leaves clean input and the signed-in user alone', async () => {
    const body = { name: 'Fine', count: 2, none: null };

    expect(await pass(body, 'body')).toEqual(body);
    expect(await pass('a\u0000', 'custom')).toBe('a\u0000');
  });
});
