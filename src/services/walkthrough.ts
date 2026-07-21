import type { Queryable } from '../db/pool.js';
import { getTeamReportsForPeriod, getTeamRoster } from '../db/dashboard.js';
import { profileLabelFor, profileSortIndex } from '../dashboard/profiles.js';
import type { RosterMember, TeamReportInput, WalkthroughEntry } from '../dashboard/types.js';

/**
 * Pure: orders a team's roster for presenter mode. Submitted reports come first
 * (grouped by profile, then display name); anyone who hasn't submitted yet is
 * flagged and pushed to the end, in the same profile/name order.
 */
export function computeWalkthrough(roster: RosterMember[], reports: TeamReportInput[]): WalkthroughEntry[] {
  const reportByUser = new Map(reports.map((r) => [r.userId, r]));
  const submitted: WalkthroughEntry[] = [];
  const pending: WalkthroughEntry[] = [];

  for (const member of roster) {
    const report = reportByUser.get(member.userId);
    const isSubmitted = report?.submittedAt != null;
    const entry: WalkthroughEntry = {
      user: { id: member.userId, displayName: member.displayName },
      profile: { code: member.profileCode, label: profileLabelFor(member.profileCode) },
      status: isSubmitted ? 'submitted' : 'not_submitted',
      workload: isSubmitted ? report!.workload : null,
      deliveredCnt: isSubmitted ? report!.deliveredCnt : null,
      inflightCnt: isSubmitted ? report!.inflightCnt : null,
      reportId: isSubmitted ? report!.id : null,
    };
    (isSubmitted ? submitted : pending).push(entry);
  }

  const byProfileThenName = (a: WalkthroughEntry, b: WalkthroughEntry): number => {
    const profileDiff = profileSortIndex(a.profile.code) - profileSortIndex(b.profile.code);
    if (profileDiff !== 0) return profileDiff;
    return (a.user.displayName ?? '').localeCompare(b.user.displayName ?? '');
  };

  submitted.sort(byProfileThenName);
  pending.sort(byProfileThenName);

  return [...submitted, ...pending];
}

export async function getTeamWalkthrough(
  db: Queryable,
  teamId: string,
  periodId: number,
): Promise<WalkthroughEntry[]> {
  const [roster, reports] = await Promise.all([
    getTeamRoster(db, teamId),
    getTeamReportsForPeriod(db, teamId, periodId),
  ]);
  return computeWalkthrough(roster, reports);
}
