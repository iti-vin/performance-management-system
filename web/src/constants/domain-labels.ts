import type {
  AccomplishmentStatus,
  BehavioralQuestionType,
  BehavioralReviewType,
  BehavioralTemplateCategory,
  CycleStatus,
  EvaluationStatus,
  EvaluatorType,
  GoalStatus,
  KpiDirection,
  MatrixKind,
  NteStatus,
  PipStatus,
  ReviewType,
  ScaleBound,
  TemplateVersionStatus,
} from "@pms/shared-types";

import type { ReviewTone } from "@/constants/review-tones";

/**
 * Display text and badge tones for the codes in @pms/shared-types. The codes go
 * over the wire and into the database. These maps are the only place a code
 * becomes words. Each map must list every code: `satisfies Record<...>` makes the
 * build fail when a code is added to the package and not here.
 */

export const CYCLE_STATUS_LABELS = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
} as const satisfies Record<CycleStatus, string>;

export const CYCLE_STATUS_TONES = {
  draft: "neutral",
  scheduled: "queued",
  active: "active",
  completed: "complete",
  cancelled: "alert",
} as const satisfies Record<CycleStatus, ReviewTone>;

export const EVALUATION_STATUS_LABELS = {
  locked: "Locked",
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  completed: "Completed",
} as const satisfies Record<EvaluationStatus, string>;

export const EVALUATION_STATUS_TONES = {
  locked: "neutral",
  not_started: "neutral",
  in_progress: "active",
  submitted: "queued",
  completed: "complete",
} as const satisfies Record<EvaluationStatus, ReviewTone>;

export const TEMPLATE_VERSION_STATUS_LABELS = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
} as const satisfies Record<TemplateVersionStatus, string>;

export const TEMPLATE_VERSION_STATUS_TONES = {
  draft: "neutral",
  published: "complete",
  archived: "neutral",
} as const satisfies Record<TemplateVersionStatus, ReviewTone>;

export const NTE_STATUS_LABELS = {
  draft: "Draft",
  issued: "Issued",
  responded: "Responded",
  closed: "Closed",
  cancelled: "Cancelled",
} as const satisfies Record<NteStatus, string>;

export const NTE_STATUS_TONES = {
  draft: "neutral",
  issued: "active",
  responded: "queued",
  closed: "complete",
  cancelled: "alert",
} as const satisfies Record<NteStatus, ReviewTone>;

export const PIP_STATUS_LABELS = {
  awaiting_planning: "Awaiting Planning",
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  not_met: "Not Met",
  cancelled: "Cancelled",
} as const satisfies Record<PipStatus, string>;

export const PIP_STATUS_TONES = {
  awaiting_planning: "queued",
  draft: "neutral",
  active: "active",
  completed: "complete",
  not_met: "alert",
  cancelled: "alert",
} as const satisfies Record<PipStatus, ReviewTone>;

export const GOAL_STATUS_LABELS = {
  active: "Active",
  pending_approval: "Pending Approval",
  completed: "Completed",
} as const satisfies Record<GoalStatus, string>;

export const GOAL_STATUS_TONES = {
  active: "active",
  pending_approval: "queued",
  completed: "complete",
} as const satisfies Record<GoalStatus, ReviewTone>;

export const ACCOMPLISHMENT_STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  returned: "Returned",
  verified: "Verified",
} as const satisfies Record<AccomplishmentStatus, string>;

export const ACCOMPLISHMENT_STATUS_TONES = {
  draft: "queued",
  submitted: "active",
  returned: "alert",
  verified: "complete",
} as const satisfies Record<AccomplishmentStatus, ReviewTone>;

/** The status of one reported value: a sent value waits for the manager. */
export const INDICATOR_STATUS_LABELS = {
  draft: "Draft",
  submitted: "Pending verification",
  returned: "Returned",
  verified: "Verified",
} as const satisfies Record<AccomplishmentStatus, string>;

export const TARGET_RESULT_LABELS = { met: "Target met", below: "Below target" } as const;

/** What each rating of a behavioral question means (PRD Tpl-B-002). */
export const RATING_LABELS = { 1: "Never", 2: "Rarely", 3: "Sometimes", 4: "Often", 5: "Always" } as const;
export const NOT_OBSERVED_LABEL = "Not Observed";

export const KPI_DIRECTION_LABELS = {
  higher_is_better: "Higher is better",
  lower_is_better: "Lower is better",
} as const satisfies Record<KpiDirection, string>;

export const MATRIX_KIND_LABELS = {
  none: "No matrix",
  table: "Custom reference table",
  scale: "Numeric threshold scale",
} as const satisfies Record<MatrixKind, string>;

export const SCALE_BOUND_LABELS = {
  minimum: "Minimum actual (inclusive)",
  maximum: "Maximum actual (inclusive)",
} as const satisfies Record<ScaleBound, string>;

export const BEHAVIORAL_QUESTION_TYPE_LABELS = {
  rating_scale: "Rating (1 to 5)",
  multiple_choice: "Multiple choice",
  short_answer: "Short answer",
  paragraph: "Long answer",
} as const satisfies Record<BehavioralQuestionType, string>;

/** Others is a label only: it has no text of its own. */
export const BEHAVIORAL_TEMPLATE_CATEGORY_LABELS = {
  general_performance: "General Performance",
  self_assessment: "Self-Assessment",
  manager_evaluation: "Manager Evaluation",
  peer_feedback: "Peer Feedback",
  feedback_360: "360° Feedback",
  probationary_evaluation: "Probationary Evaluation",
  others: "Others",
} as const satisfies Record<BehavioralTemplateCategory, string>;

export const BEHAVIORAL_REVIEW_TYPE_LABELS = {
  self: "Self",
  manager: "Manager",
  peer: "Peer",
  upward: "Upward",
  hr: "HR",
  others: "Others",
} as const satisfies Record<BehavioralReviewType, string>;

/** The review type of a cycle (`pms.cycles.review_type`), not of a behavioral template. */
export const REVIEW_TYPE_LABELS = {
  standard: "Standard Performance Review",
  "360": "360° Feedback",
  probationary: "Probationary Review",
  project_based: "Project-Based Review",
} as const satisfies Record<ReviewType, string>;

export const EVALUATOR_TYPE_LABELS = {
  self: "Self",
  manager: "Manager",
  hr: "HR",
  peer: "Peer",
  upward: "Upward",
} as const satisfies Record<EvaluatorType, string>;
