import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it } from 'vitest';
import { ParseVersionPipe } from './common/pipes/parse-version.pipe.js';
import { BehavioralAssessmentController } from './modules/behavioral-assessment/controllers/behavioral-assessment.controller.js';
import { KpiGoalsController } from './modules/kpi-goals/controllers/kpi-goals.controller.js';

describe('the version routes of the templates', () => {
  it.each([
    ['KPI', KpiGoalsController],
    ['behavioral', BehavioralAssessmentController],
  ])('reads the version of the %s version route', (_name, controller) => {
    const parameters = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, 'getVersion') as Record<string, { data?: string; pipes: unknown[] }>;
    const version = Object.values(parameters).find((parameter) => parameter.data === 'version');

    expect(version?.pipes.map((used) => (typeof used === 'function' ? used : (used as object).constructor))).toEqual([ParseVersionPipe]);
  });
});
