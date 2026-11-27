import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  MATRIX_KINDS,
  MATRIX_LIMITS,
  SCALE_BOUNDS,
  type MatrixKind,
  type ScaleBound,
} from '@pms/shared-types';
import { IndicatorDirectionValues } from '../entities/kpi-indicator.entity.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * One row of a numeric threshold scale. On a minimum scale it has `lowerBound`.
 * On a maximum scale it has `upperBound`, and the final row has neither. The
 * order of the rows, the labels and the scores are checked by the matrix rules
 * in `@pms/shared-types`, before anything is written.
 */
export class ScaleDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Minimum actual, inclusive. For a minimum scale.',
  })
  @IsOptional()
  @IsNumber()
  lowerBound?: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Maximum actual, inclusive. For a maximum scale. The final row has none.',
  })
  @IsOptional()
  @IsNumber()
  upperBound?: number | null;

  @ApiProperty({ example: 'Target met', maxLength: MATRIX_LIMITS.labelLength })
  @IsString()
  @MaxLength(MATRIX_LIMITS.labelLength)
  label: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Up to two decimal places.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  score: number;
}

export class MatrixColumnDto {
  @ApiProperty({ example: 'Criteria', maxLength: MATRIX_LIMITS.labelLength })
  @IsString()
  @MaxLength(MATRIX_LIMITS.labelLength)
  label: string;
}

/** A row of a reference table: one cell of text for each column, in column order. */
export class MatrixRowDto {
  @ApiProperty({ type: [String], maxItems: MATRIX_LIMITS.tableColumns })
  @IsArray()
  @ArrayMaxSize(MATRIX_LIMITS.tableColumns)
  @IsString({ each: true })
  @MaxLength(MATRIX_LIMITS.cellLength, { each: true })
  cells: string[];
}

export class IndicatorDto {
  @ApiProperty({ description: 'Optional. Kept only when it names an indicator of the draft that is saved. Anything else gets a new id.' })
  @IsOptional()
  @IsUUID('all')
  indicatorId?: string;

  @ApiProperty({ example: 'Deadline adherence' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  @Matches(/\S/, { message: 'name must not be blank' })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'hours' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  target?: number | null;

  @ApiProperty({ enum: IndicatorDirectionValues })
  @IsIn([...IndicatorDirectionValues])
  direction: (typeof IndicatorDirectionValues)[number];

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  weight: number;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Up to two decimal places.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  scoreTargetMet: number;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Up to two decimal places.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  scoreBelowTarget: number;

  @ApiProperty({ enum: MATRIX_KINDS, default: 'none', required: false })
  @IsOptional()
  @IsIn([...MATRIX_KINDS])
  matrixKind?: MatrixKind;

  @ApiProperty({ required: false, nullable: true, maxLength: MATRIX_LIMITS.titleLength })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MATRIX_LIMITS.titleLength)
  matrixTitle?: string | null;

  @ApiProperty({ enum: SCALE_BOUNDS, required: false, nullable: true })
  @IsOptional()
  @IsIn([...SCALE_BOUNDS])
  scaleBound?: ScaleBound | null;

  @ApiProperty({
    default: false,
    required: false,
    description: 'True: the scale sets the score. Only a numeric threshold scale may score.',
  })
  @IsOptional()
  @IsBoolean()
  useForScoring?: boolean;

  @ApiProperty({ required: false, type: [ScaleDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MATRIX_LIMITS.scaleRows)
  @ValidateNested({ each: true })
  @Type(() => ScaleDto)
  scales?: ScaleDto[];

  @ApiProperty({ required: false, type: [MatrixColumnDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MATRIX_LIMITS.tableColumns)
  @ValidateNested({ each: true })
  @Type(() => MatrixColumnDto)
  matrixColumns?: MatrixColumnDto[];

  @ApiProperty({ required: false, type: [MatrixRowDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MATRIX_LIMITS.tableRows)
  @ValidateNested({ each: true })
  @Type(() => MatrixRowDto)
  matrixRows?: MatrixRowDto[];
}
