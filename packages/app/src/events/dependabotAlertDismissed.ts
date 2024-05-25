import { isUserInApproverTeam } from "./approvingTeam.js";
import { Context } from "probot";

/**
 * Handles the code scanning alert event
 * @param context the event context
 */
export async function dependabotAlertDismissed(context: Context<"dependabot_alert.dismissed">) {
    context.log.info("Dependabot alert event received.");
    const owner = context.payload.repository.owner.login;
    const user = context.payload.alert.dismissed_by?.login;
    const isMemberApproved = await isUserInApproverTeam(context, owner, user);

    if (isMemberApproved) {
        context.log.info("Alert close request approved.");
    }
    else {
        context.log.info("Alert close request not approved. Re-opening the alert.");

        const repo = context.payload.repository.name;
        const alertNumber = context.payload.alert.number;

        await context.octokit.dependabot.updateAlert({ owner, repo, alert_number: alertNumber, state: "open" });
    }
}
