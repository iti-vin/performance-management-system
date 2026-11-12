import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IndicatorDto } from './kpi-indicator.dto.js';

export class CreateKpiGoalTemplateDto {
  @ApiProperty({ format: 'uuid', description: 'Existing pms.companies row' })
  @IsUUID()
  companyId: string;

  @ApiProperty({
    required: false,
    nullable: true,
    format: 'uuid',
    description: 'Optional position scope. Null means company-wide.',
  })
  @IsOptional()
  @IsUUID()
  positionId?: string | null;

  @ApiProperty({ type: [IndicatorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IndicatorDto)
  indicators: IndicatorDto[];
}
