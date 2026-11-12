import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IndicatorDirectionValues } from '../entities/kpi-indicator.entity.js';

export class ScaleDto {
  @ApiProperty({ description: 'Inclusive lower bound.' })
  @IsNumber()
  lowerBound: number;

  @ApiProperty({
    description: 'Inclusive upper bound. NULL means unbounded.',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  upperBound?: number | null;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;
}

export class MatrixRowDto {
  @ApiProperty({ example: 'Meets expectations' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  rowLabel: string;
}

export class MatrixColumnDto {
  @ApiProperty({ example: 'Q1' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  colLabel: string;
}

export class IndicatorDto {
  @ApiProperty({ description: 'Optional. Generated on create when missing.' })
  @IsOptional()
  @IsString()
  indicatorId?: string;

  @ApiProperty({ example: 'Deadline adherence' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
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

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  scoreTargetMet: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  scoreBelowTarget: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  useForScoring?: boolean;

  @ApiProperty({ required: false, type: [ScaleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScaleDto)
  scales?: ScaleDto[];

  @ApiProperty({ required: false, type: [MatrixRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatrixRowDto)
  matrixRows?: MatrixRowDto[];

  @ApiProperty({ required: false, type: [MatrixColumnDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatrixColumnDto)
  matrixColumns?: MatrixColumnDto[];
}
