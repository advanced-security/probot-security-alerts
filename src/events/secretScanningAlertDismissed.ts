import { Context } from "probot";
import { isUserInApproverTeam } from "./approvingTeam";

/**
 * Handles the code scanning alert event
 * @param context the event context
 */
export default async function secretScanningAlertDismissed(context: Context<"secret_scanning_alert">) {
    context.log.info("Secret scanning alert event received.");
    const owner = context.payload.repository.owner.login;
    const user = context.payload.alert?.resolved_by?.login;
    var isMemberApproved =  await isUserInApproverTeam(context, owner, user);

    if (isMemberApproved) {
        context.log.info("Alert close request approved.");
    }
    else {
        context.log.info("Alert close request not approved. Re-opening the alert.");

        const repo = context.payload.repository.name;
        const alert_number = context.payload.alert.number;
        
        await context.octokit.secretScanning.updateAlert({
            owner,
            repo,
            alert_number,
            state: "open"
        });
    }
};
