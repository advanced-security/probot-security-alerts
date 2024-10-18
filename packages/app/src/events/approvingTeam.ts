import {type OctokitContext} from './types.js';
import {RequestError} from '@octokit/request-error';

/**
 * Returns a value indicating if the user is a member of the approving
 * team in the organization.
 * @param context the event context
 * @param approvingTeamName the name of the team required to approve the request
 * @param owner the repository owner
 * @param user the user to evaluate
 * @returns true if the user is either an owner of the organization or
 * a member of the approving team; otherwise, false.
 */
export async function isUserInApproverTeam(
  context: OctokitContext,
  approvingTeamName: string,
  owner: string,
  user: string | undefined
): Promise<boolean> {
  if (owner && user && context) {
    try {
      const memberships = await context.octokit.teams.getMembershipForUserInOrg(
        {
          org: owner,
          team_slug: approvingTeamName,
          username: user
        }
      );

      const role = memberships.data.role;
      context.log.info(
        JSON.stringify(
          `The user ${user} has the role "${role}" in the team "${approvingTeamName}".`
        )
      );
      // The role will be "maintainer" if the user is an organization owner
      // (whether or not they are explicitly in the team). The role will be "member"
      // if the user is explicitly included in the team. If the code has reached this
      // step, the user is in one of these two roles in the team.
      return true;
    } catch (e) {
      // A 404 status is returned if the user is not in the team. If there's an error
      // resolving the user or a 404, default to not allowing the user to probeed
      if (e instanceof RequestError && e.status === 404) {
        context.log.info(
          `The user ${user} is not part of the team "${approvingTeamName}"`
        );
      } else {
        context.log.error(
          e,
          `Unexpected error checking if user ${user} is in the team "${approvingTeamName}"`
        );
      }

      return false;
    }
  }

  return false;
}
