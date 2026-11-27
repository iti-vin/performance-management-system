import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { STORABLE_TEXT, STORABLE_TEXT_MESSAGE } from './storable-text.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CancelReviewCycleDto {
  @ApiProperty({ maxLength: 2000, example: 'Budget freeze' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Matches(STORABLE_TEXT, { message: STORABLE_TEXT_MESSAGE })
  reason: string;
}
