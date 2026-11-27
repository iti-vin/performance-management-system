import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

/** The largest value of a PostgreSQL `integer`, the type of a version column. */
const MAX_VERSION = 2_147_483_647;

/** A version number of a route: a whole number from 1 that the column can hold. */
@Injectable()
export class ParseVersionPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const version = Number(value);
    if (!/^[1-9]\d*$/.test(value) || version > MAX_VERSION) {
      throw new BadRequestException('Validation failed (a version number is expected)');
    }
    return version;
  }
}
