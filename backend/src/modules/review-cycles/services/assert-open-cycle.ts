import { ConflictException } from '@nestjs/common';
import type { Cycle } from '../entities/cycle.entity.js';

/** Deadlines and reviews change only while a cycle runs and no result is final (PRD Rec-001, Rec-005). */
export function assertOpenCycle(cycle: Cycle): void {
  if (cycle.state !== 'active' || cycle.finalizedAt || cycle.releasedAt) {
    throw new ConflictException('Only an active cycle that is not finalized or released can be changed.');
  }
}
