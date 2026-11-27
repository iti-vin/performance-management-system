import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEvent } from '../../common/entities/audit-event.entity.js';
import { CycleHistoryController } from './controllers/cycle-history.controller.js';
import { CycleHistoryService } from './services/cycle-history.service.js';
import { CycleAttentionController } from './controllers/cycle-attention.controller.js';
import { CycleAttentionService } from './services/cycle-attention.service.js';
import { User } from '../auth/entities/user.entity.js';
import { EmployeeModule } from '../employees/employees.module.js';
import { AdminRoleGuard } from '../employees/guards/admin-role.guard.js';
import { KpiGoalsModule } from '../kpi-goals/kpi-goals.module.js';
import { ReviewCyclesController } from './controllers/review-cycles.controller.js';
import { ResultsController } from './controllers/results.controller.js';
import { ReviewsController } from './controllers/reviews.controller.js';
import { CycleResultVisibility } from './entities/cycle-result-visibility.entity.js';
import { CyclePeerEvaluator } from './entities/cycle-peer-evaluator.entity.js';
import { EvaluationSnapshot } from './entities/evaluation-snapshot.entity.js';
import { CycleActivationService } from './services/cycle-activation.service.js';
import { ResultsService } from './services/results.service.js';
import { AccomplishmentsController } from './controllers/accomplishments.controller.js';
import { KpiIndicatorMatrixCell } from '../kpi-goals/entities/kpi-indicator-matrix-cell.entity.js';
import { KpiIndicatorMatrixColumn } from '../kpi-goals/entities/kpi-indicator-matrix-column.entity.js';
import { KpiIndicatorMatrixRow } from '../kpi-goals/entities/kpi-indicator-matrix-row.entity.js';
import { KpiIndicatorScale } from '../kpi-goals/entities/kpi-indicator-scale.entity.js';
import { KpiIndicator } from '../kpi-goals/entities/kpi-indicator.entity.js';
import { AccomplishmentActual } from './entities/accomplishment-actual.entity.js';
import { AccomplishmentVersion } from './entities/accomplishment-version.entity.js';
import { AccomplishmentsService } from './services/accomplishments.service.js';
import { BehavioralTemplateVersion } from '../behavioral-assessment/entities/behavioral-template-version.entity.js';
import { BehavioralTemplate } from '../behavioral-assessment/entities/behavioral-template.entity.js';
import { EmployeeDomain } from '../employees/entities/employee-domain.entity.js';
import { KpiGoalTemplate } from '../kpi-goals/entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from '../kpi-goals/entities/kpi-template-version.entity.js';
import { Assignment } from './entities/assignment.entity.js';
import { ManagerAssignment } from './entities/manager-assignment.entity.js';
import { CycleParticipant } from './entities/cycle-participant.entity.js';
import { CycleStage } from './entities/cycle-stage.entity.js';
import { Cycle } from './entities/cycle.entity.js';
import { ReviewCyclesService } from './services/review-cycles.service.js';
import { ReviewsService } from './services/reviews.service.js';
import { BehavioralChoiceOption } from '../behavioral-assessment/entities/behavioral-choice-option.entity.js';
import { BehavioralQuestion } from '../behavioral-assessment/entities/behavioral-question.entity.js';
import { BehavioralSection } from '../behavioral-assessment/entities/behavioral-section.entity.js';
import { Accomplishment } from './entities/accomplishment.entity.js';
import { AssignmentResponse } from './entities/assignment-response.entity.js';
import { ReviewAssessmentService } from './services/review-assessment.service.js';

@Module({
  imports: [
    EmployeeModule,
    // CompanyResolver comes from here: the cycles take their company and actor from the account too.
    KpiGoalsModule,
    // The entities of the other modules are read only here, and every query filters by company.
    TypeOrmModule.forFeature([
      User,
      Cycle,
      CycleParticipant,
      CycleStage,
      Assignment,
      ManagerAssignment,
      AuditEvent,
      EmployeeDomain,
      KpiGoalTemplate,
      KpiTemplateVersion,
      BehavioralTemplate,
      BehavioralTemplateVersion,
      BehavioralSection,
      BehavioralQuestion,
      BehavioralChoiceOption,
      AssignmentResponse,
      Accomplishment,
      AccomplishmentActual,
      AccomplishmentVersion,
      EvaluationSnapshot,
      CyclePeerEvaluator,
      CycleResultVisibility,
      KpiIndicator,
      KpiIndicatorScale,
      KpiIndicatorMatrixRow,
      KpiIndicatorMatrixColumn,
      KpiIndicatorMatrixCell,
    ]),
  ],
  controllers: [ReviewCyclesController, ReviewsController, AccomplishmentsController, ResultsController, CycleHistoryController, CycleAttentionController],
  providers: [CycleHistoryService, CycleAttentionService, ReviewCyclesService, ReviewsService, ReviewAssessmentService, AccomplishmentsService, ResultsService, CycleActivationService, AdminRoleGuard],
  exports: [ReviewCyclesService],
})
export class ReviewCyclesModule {}
