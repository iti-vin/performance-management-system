import type { Repository } from 'typeorm';
import { ADMIN_ROLE_ID } from '../../auth/entities/user-role.entity.js';
import type { User } from '../../auth/entities/user.entity.js';
import type { CompanyResolver, ResolvedAccount } from '../../kpi-goals/services/company-resolver.service.js';
import type { Cycle } from '../entities/cycle.entity.js';

/**
 * The cycle states in which a participant who is not an HR administrator reads their own work:
 * their reviews, their report, and the report of their current team. Every write still needs an
 * active cycle (PRD 8.3, Rev-007). A cancelled cycle is read by HR only (PRD 6.3).
 */
export const PARTICIPANT_CYCLE_STATES: readonly Cycle['state'][] = ['active', 'completed'];

/** One review and the people it is about, as the scope rules need them. */
export interface ReviewSubject {
  cycleState: Cycle['state'];
  subjectId: string | undefined;
  /** The employees whom the viewer manages today. */
  team: ReadonlySet<string>;
}

/** The viewer is the subject, or the current manager of the subject. */
function isAbout(actorId: string | null, { subjectId, team }: Pick<ReviewSubject, 'subjectId' | 'team'>): boolean {
  return subjectId !== undefined && (subjectId === actorId || team.has(subjectId));
}

/**
 * Whether a person who does not administer the company sees the row of a review (PRD Rev-001,
 * decisions D3 and D5): the evaluator, the subject, or the current manager of the subject, in a
 * running or finished cycle. Seeing the row says nothing about reading the review.
 */
export function isListed(actorId: string | null, review: ReviewSubject & { evaluatorId: string }): boolean {
  if (!actorId || !PARTICIPANT_CYCLE_STATES.includes(review.cycleState)) return false;
  return review.evaluatorId === actorId || isAbout(actorId, review);
}

/**
 * A review names the department of its subject as it is today. Outside an active cycle only an
 * HR administrator, the subject, and the current manager read it: a former manager keeps a
 * finished review, and learns nothing newer from it (PRD Rev-007, decision D11).
 */
export function departmentFor(
  { isAdmin, actorId }: Pick<Viewer, 'isAdmin' | 'actorId'>,
  { department, ...review }: ReviewSubject & { department: string | null },
): string | null {
  return isAdmin || review.cycleState === 'active' || isAbout(actorId, review) ? department : null;
}

/** Who asks for a review: the company, the employee GUID, and whether the account is an HR administrator. */
export interface Viewer extends ResolvedAccount {
  isAdmin: boolean;
}

/** Reads the viewer from the signed-in account, never from the request. */
export async function viewerOf(users: Repository<User>, companies: CompanyResolver, userId: string): Promise<Viewer> {
  const account = await companies.resolveAccount(userId);
  const user = await users.findOne({ where: { id: userId } });
  return { ...account, isAdmin: user?.userRoleId === ADMIN_ROLE_ID };
}
