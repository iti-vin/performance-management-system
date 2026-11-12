import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpiGoalsController } from './controllers/kpi-goals.controller.js';
import { KpiGoalsService } from './services/kpi-goals.service.js';
import { KpiGoalTemplate } from './entities/kpi-goal-template.entity.js';
import { KpiTemplateVersion } from './entities/kpi-template-version.entity.js';
import { KpiIndicator } from './entities/kpi-indicator.entity.js';
import { KpiIndicatorScale } from './entities/kpi-indicator-scale.entity.js';
import { KpiIndicatorMatrixRow } from './entities/kpi-indicator-matrix-row.entity.js';
import { KpiIndicatorMatrixColumn } from './entities/kpi-indicator-matrix-column.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KpiGoalTemplate,
      KpiTemplateVersion,
      KpiIndicator,
      KpiIndicatorScale,
      KpiIndicatorMatrixRow,
      KpiIndicatorMatrixColumn,
    ]),
  ],
  controllers: [KpiGoalsController],
  providers: [KpiGoalsService],
  exports: [KpiGoalsService],
})
export class KpiGoalsModule {}
