import { CancelReviewCycleDto } from './cancel-review-cycle.dto.js';

/** A reopening takes the same body as a cancellation: one reason. */
export class ReopenReviewDto extends CancelReviewCycleDto {}
