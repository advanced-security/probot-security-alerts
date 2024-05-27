import { type Config, toSeverity } from './types.js';

export const DEFAULT_APPROVING_TEAM = 'scan-managers'

// When this module is loaded, patch the private key variable
// to replace escaped newlines and remove quotes. This prevents
// errors from Octokit when the value is directly used.
export function preparePrivateKey() {
  if (process.env.PRIVATE_KEY !== undefined) {
    process.env.PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '',);
  }
}

/**
 * Gets the configuration settings for the application.
 * @returns The configuration settings
 */
export function getConfiguration() : Config {
  preparePrivateKey();
  const defaultApproverTeam = process.env.SECURITY_ALERT_CLOSE_TEAM || DEFAULT_APPROVING_TEAM;
  const dependabotApproverTeam = process.env.DEPENDABOT_APPROVER_TEAM || defaultApproverTeam;
  const dependabotMinimumSeverity = toSeverity(process.env.DEPENDABOT_MIN_SEVERITY);
  const codeScanningApproverTeam = process.env.CODE_SCANNING_APPROVER_TEAM || defaultApproverTeam;
  const codeScanningMinimumSeverity = toSeverity(process.env.CODE_SCANNING_MIN_SEVERITY);
  const secretScanningApproverTeam = process.env.SECRET_SCANNING_APPROVER_TEAM || defaultApproverTeam;

  return {
    securityAlertCloseTeam: defaultApproverTeam,
    privateKey: process.env.PRIVATE_KEY,
    dependabotApproverTeam: dependabotApproverTeam,
    dependabotMinimumSeverity: dependabotMinimumSeverity,
    codeScanningApproverTeam: codeScanningApproverTeam,
    codeScanningMinimumSeverity: codeScanningMinimumSeverity,
    secretScanningApproverTeam: secretScanningApproverTeam
  };
}

