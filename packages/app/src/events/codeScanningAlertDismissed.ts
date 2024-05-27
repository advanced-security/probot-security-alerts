import { Context } from "probot";
import { isUserInApproverTeam } from "./approvingTeam.js";
import { getConfiguration } from "../config/index.js";
import { Severity, toSeverity } from "../config/config.js";
import { CodeScanningSecurityRule } from "./types.js";

/**
 * Handles the code scanning alert event
 * @param context the event context
 */
export default async function codeScanningAlertDismissed(context: Context<"code_scanning_alert">) {
    context.log.info("Code scanning alert event received.");

    const owner = context.payload.repository.owner.login;
    const user = context.payload.alert.dismissed_by?.login;
    const config = getConfiguration();
    const approver = config.codeScanningApproverTeam;
    
    const minimumSeverity = config.codeScanningMinimumSeverity;
    const rule = context.payload.alert.rule as CodeScanningSecurityRule;
    const alertSeverity = toSeverity(rule.security_severity_level, Severity.UNKNOWN);
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

        await context.octokit.codeScanning.updateAlert({
            owner,
            repo,
            alert_number: alertNumber,
            state: "open"
        });
    }
}
