/**
 * Define the configuration values that are available in the environment.
 */
declare global {
  declare namespace NodeJS {
    interface ProcessEnv {
      SECURITY_ALERT_CLOSE_TEAM?: string;
      DEPENDABOT_APPROVER_TEAM?: string;
      DEPENDABOT_MIN_SEVERITY?: string;
      CODE_SCANNING_APPROVER_TEAM?: string;
      CODE_SCANNING_MIN_SEVERITY?: string;
      SECRET_SCANNING_APPROVER_TEAM?: string;
      PRIVATE_KEY?: string;
    }
  }
}
