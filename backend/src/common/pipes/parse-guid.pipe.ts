import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';

/**
 * Accepts any GUID of 8-4-4-4-12 hex digits, like the shared `idSchema`. The stock
 * `ParseUUIDPipe` also demands a version digit, so it refuses the dev ids such as
 * 00000000-0000-0000-0000-000000000141 that the seeds use.
 */
@Injectable()
export class ParseGuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUUID(value, 'loose')) {
      throw new BadRequestException('Validation failed (a GUID is expected)');
    }
    return value;
  }
}
