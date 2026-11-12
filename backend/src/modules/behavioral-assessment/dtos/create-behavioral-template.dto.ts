import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SectionDto } from './behavioral-section.dto.js';

export class CreateBehavioralTemplateDto {
  @ApiProperty({ format: 'uuid', description: 'Existing pms.companies row' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ type: [SectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];
}
