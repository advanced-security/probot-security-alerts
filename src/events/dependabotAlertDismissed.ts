import { ProbotOctokit, Logger } from "probot";
import { isUserInApproverTeam } from "./approvingTeam";

/**
 * Interface to replace the missing context for dependabot
 * alerts.
 */
export interface DependabotAlertContext {
    octokit: InstanceType<typeof ProbotOctokit>;
    log: Logger;
    payload: {
        repository: {
            owner: {
                login: string
            },
            name: string
        },
        alert: {
            dismissed_by: {
                login: string
            } | undefined,
            number: number
        }
    };
}

/**
 * Handles the code scanning alert event
 * @param context the event context
 */
export async function dependabotAlertDismissed(context: DependabotAlertContext) {
    context.log.info("Dependabot alert event received.");
    const owner = context.payload.repository.owner.login;
    const user = context.payload.alert.dismissed_by?.login;
    var isMemberApproved = await isUserInApproverTeam(context, owner, user);

    if (isMemberApproved) {
        context.log.info("Alert close request approved.");
    }
    else {
        context.log.info("Alert close request not approved. Re-opening the alert.");

        const repo = context.payload.repository.name;
        const alert_number = context.payload.alert.number;
        
        await dependabot_updateAlert(context, 
            owner,
            repo,
            alert_number,
            "open"
        );
    }
};

/**
 * Updates an alert status
 * @param context the message context
 * @param owner the repository owner
 * @param repo the repository name
 * @param alert_number the alert number
 * @param state the state of the alert
 * @returns the method reponse
 */
function dependabot_updateAlert(context: DependabotAlertContext, owner: string, repo: string, alert_number: number, state: "dismissed" | "fixed" | "open"){
    const params = { "state": state }
    return context.octokit.request({
    method: 'PATCH',
    headers: { accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    url: `/repos/${owner}/${repo}/dependabot/alerts/${alert_number}`,
    ...params
    })
}

