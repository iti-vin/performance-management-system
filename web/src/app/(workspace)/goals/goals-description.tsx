import { getCurrentUser } from "@/features/auth/services/current-user";

const DESCRIPTIONS = {
  USER: "View your performance goals and update your accomplishments.",
  MANAGER: "View your team's performance goals and verify submitted accomplishments.",
  ADMIN: "View employee performance goals and accomplishments.",
} as const;

/** What Goals holds for the signed-in account. */
export async function GoalsDescription() {
  const user = await getCurrentUser();
  return user ? DESCRIPTIONS[user.role] : null;
}
