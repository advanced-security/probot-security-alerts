import {Context} from 'probot';
import {isUserInApproverTeam} from './approvingTeam.js';
import {getConfiguration} from '../config/index.js';

/**
 * These resolutions indicate changes to a custom-defined secret. These
 * events do not require special approval.
 */
const CUSTOM_PATTERN_RESOLUTIONS = ['pattern_edited', 'pattern_deleted'];

/**
 * Handles the secret scanning alert event
 * @param context the event context
 */
export default async function secretScanningAlertDismissed(
  context: Context<'secret_scanning_alert'>
) {
  context.log.info('Secret scanning alert event received.');
  const owner = context.payload.repository.owner.login;
  const user = context.payload.alert?.resolved_by?.login;
  const config = getConfiguration();
  const approver = config.secretScanningApproverTeam;
  const isMemberApproved = await isUserInApproverTeam(
    context,
    approver,
    owner,
    user
  );

  const resolution = context.payload.alert?.resolution as string;
  const closedByCustomPattern = CUSTOM_PATTERN_RESOLUTIONS.includes(resolution);

  if (isMemberApproved || closedByCustomPattern) {
    context.log.info('Alert close request approved.');
    if (closedByCustomPattern) {
      context.log.info(`Closed by custom pattern change: ${resolution}`);
    }
  } else {
    context.log.info('Alert close request not approved. Re-opening the alert.');

    const repo = context.payload.repository.name;
    const alertNumber = context.payload.alert.number;

    await context.octokit.secretScanning.updateAlert({
      owner,
      repo,
      alert_number: alertNumber,
      state: 'open'
    });
  }
}
