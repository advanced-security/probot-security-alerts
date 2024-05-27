import { isUserInApproverTeam } from "./approvingTeam.js";
import { Context } from "probot";
import { getConfiguration } from "../config/index.js";
import { Severity, toSeverity } from "../config/types.js";

/**
 * Handles the code scanning alert event
 * @param context the event context
 */
export async function dependabotAlertDismissed(context: Context<"dependabot_alert.dismissed">) {
    context.log.info("Dependabot alert event received.");
    const owner = context.payload.repository.owner.login;
    const user = context.payload.alert.dismissed_by?.login;
    const config = getConfiguration();
    const approver = config.dependabotApproverTeam;
    const minimumSeverity = config.dependabotMinimumSeverity;
    const alertSeverity = Math.max(toSeverity(context.payload.alert.security_advisory.severity, Severity.UNKNOWN), toSeverity(context.payload.alert.security_vulnerability.severity, Severity.UNKNOWN));

    if (alertSeverity < minimumSeverity) {
      context.log.info(`Alert close request allowed. Severity '${Severity[alertSeverity]}' is below minimum severity '${Severity[minimumSeverity]}'.`);
      return;
    }
    const isMemberApproved = await isUserInApproverTeam(context, approver, owner, user);

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
