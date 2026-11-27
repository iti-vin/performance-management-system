import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { MAX_CYCLE_STAGES } from '@pms/shared-types';
import { GUID, IsInstant } from './create-review-cycle.dto.js';
import { STORABLE_TEXT, STORABLE_TEXT_MESSAGE } from './storable-text.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ExtendedStageDto {
  @ApiProperty({ format: 'uuid' })
  @Matches(GUID)
  stageId: string;

  @ApiProperty({ example: '2027-04-21T17:00:00+08:00' })
  @IsInstant()
  deadline: string;
}

export class ExtendReviewCycleDto {
  @ApiProperty({ maxLength: 2000, example: 'Holiday week' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Matches(STORABLE_TEXT, { message: STORABLE_TEXT_MESSAGE })
  reason: string;

  @ApiPropertyOptional({ example: '2027-04-28T17:00:00+08:00' })
  @IsOptional()
  @IsInstant()
  verificationDeadline?: string;

  @ApiPropertyOptional({ example: '2027-04-21T23:59:59+08:00' })
  @IsOptional()
  @IsInstant()
  accomplishmentDeadline?: string;

  @ApiPropertyOptional({ type: [ExtendedStageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CYCLE_STAGES)
  @ValidateNested({ each: true })
  @Type(() => ExtendedStageDto)
  stages?: ExtendedStageDto[];
}
