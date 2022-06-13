import type { Context } from "probot";

/**
 * Handles the code scanning alert event
 * @param context the event context
 */
export default async function codeScanningAlertDismissed(context: Context<"code_scanning_alert">) {
    context.log.info("Code scanning alert event received.");

    var isMemberApproved = await isUserApproved(context);

    if (isMemberApproved) {
        context.log.info("Alert close request approved.");
    }
    else {
        context.log.info("Alert close request not approved. Re-opening the alert.");

        const owner = context.payload.repository.owner.login;
        const repo = context.payload.repository.name;
        const alert_number = context.payload.alert.number;
        
        await context.octokit.codeScanning.updateAlert({
            owner,
            repo,
            alert_number,
            state: "open"
        });
    }
};

/**
  * Returns a value indicating if the user is a member of the approving
  * team in the organization.
  * @param context the current execution context
  * @returns 
  */
async function isUserApproved(context: Context<"code_scanning_alert">) {
    const owner = context.payload.repository.owner.login;
    const user = context.payload.alert.dismissed_by?.login;
    const approvingTeamName = 'approving-alerters';

    if (user != null) {
        try {
            const memberships = await context.octokit.teams.getMembershipForUserInOrg({
                org: owner,
                team_slug: approvingTeamName,
                username: user
            });

            const role = memberships.data.role;
            context.log.info(JSON.stringify(`The user ${user} has the role \"${role}\" in the team \"${approvingTeamName}\".`));
            // The role will be "maintainer" if the user is an organization owner
            // (whether or not they are explicitly in the team). The role will be "member" 
            // if the user is explicitly included in the team. If the code has reached this
            // step, the user is in one of these two roles in the team.
            return true;
        }
        catch (e) {
            // A 404 status is returned if the user is not in the team. If there's an error
            // resolving the user or a 404, default to not allowing the user to probeed
            context.log.info(`The user ${user} is not part of the team \"${approvingTeamName}\".`)
        }
    }

    return false;
}

