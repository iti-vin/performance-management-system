import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it } from 'vitest';
import { ParseGuidPipe } from './common/pipes/parse-guid.pipe.js';
import { BehavioralAssessmentController } from './modules/behavioral-assessment/controllers/behavioral-assessment.controller.js';
import { KpiGoalsController } from './modules/kpi-goals/controllers/kpi-goals.controller.js';
import { CycleHistoryController } from './modules/review-cycles/controllers/cycle-history.controller.js';

type Parameter = { data?: string; pipes: unknown[] };

/** The pipe classes of every `:id` parameter of a controller, by method. */
function idPipesOf(controller: { prototype: object }): [string, string[]][] {
  return Object.getOwnPropertyNames(controller.prototype).flatMap((method) => {
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, method) as Record<string, Parameter> | undefined;
    return Object.values(metadata ?? {})
      .filter((parameter) => parameter.data === 'id')
      .map((parameter): [string, string[]] => [
        method,
        parameter.pipes.map((pipe) => (typeof pipe === 'function' ? pipe : (pipe as object).constructor).name),
      ]);
  });
}

describe('record ids of the review module routes', () => {
  it.each([
    ['KPI templates', KpiGoalsController],
    ['behavioral templates', BehavioralAssessmentController],
    ['cycle history', CycleHistoryController],
  ])('accepts any GUID on the %s routes, the seed ids included', (_name, controller) => {
    const routes = idPipesOf(controller);

    expect(routes.length).toBeGreaterThan(0);
    for (const [method, pipes] of routes) expect([method, pipes]).toEqual([method, [ParseGuidPipe.name]]);
  });
});
