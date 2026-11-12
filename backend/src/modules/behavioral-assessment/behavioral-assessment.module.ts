import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BehavioralAssessmentController } from './controllers/behavioral-assessment.controller.js';
import { BehavioralAssessmentService } from './services/behavioral-assessment.service.js';
import { BehavioralTemplate } from './entities/behavioral-template.entity.js';
import { BehavioralTemplateVersion } from './entities/behavioral-template-version.entity.js';
import { BehavioralSection } from './entities/behavioral-section.entity.js';
import { BehavioralQuestion } from './entities/behavioral-question.entity.js';
import { BehavioralChoiceOption } from './entities/behavioral-choice-option.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BehavioralTemplate,
      BehavioralTemplateVersion,
      BehavioralSection,
      BehavioralQuestion,
      BehavioralChoiceOption,
    ]),
  ],
  controllers: [BehavioralAssessmentController],
  providers: [BehavioralAssessmentService],
  exports: [BehavioralAssessmentService],
})
export class BehavioralAssessmentModule {}
