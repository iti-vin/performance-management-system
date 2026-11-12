import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BehavioralQuestion } from './behavioral-question.entity.js';

@Entity({ name: 'behavioral_sections', schema: 'pms' })
export class BehavioralSection {
  @ApiProperty()
  @PrimaryColumn({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @ApiProperty()
  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @ApiProperty()
  @Column({ type: 'text' })
  title: string;

  @ApiProperty()
  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder: number;

  @ApiProperty({ isArray: true })
  @OneToMany(() => BehavioralQuestion, (question) => question.sectionId)
  questions: BehavioralQuestion[];
}
