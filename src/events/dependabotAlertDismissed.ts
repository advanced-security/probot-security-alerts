import { isUserInApproverTeam } from "./approvingTeam";
import { DependabotAlertContext } from "./types";

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
        
        // Not yet supported
        //context.octokit.dependabot.updateAlert({owner, repo, alert_number, state: "open "});

        await updateDependabotAlert(context, 
            {
                owner,
                repo,
                alert_number,
                state: "open"
            }
        );
    }
};

/**
 * Updates an alert status
 * @param context the message context
 * @param parameters.owner the repository owner
 * @param parameters.repo the repository name
 * @param parameters.alert_number the alert number
 * @param parameters.state the state of the alert
 * @returns the method reponse
 */
function updateDependabotAlert(context: DependabotAlertContext, parameters: { owner: string, repo: string, alert_number: number, state: "dismissed" | "open"}){
    const params = { state: parameters.state }
    return context.octokit.request({
        method: 'PATCH',
        headers: { accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        url: `/repos/${parameters.owner}/${parameters.repo}/dependabot/alerts/${parameters.alert_number}`,
        ...params
    })
}

