/**
 * Interface for retrieving strongly-typed application
 * configuration settings.
 */
export interface Config {
  /** The team responsible for closing security alerts */
  securityAlertCloseTeam: string;
  privateKey: string | undefined;
  dependabotApproverTeam: string,
  dependabotMinimumSeverity: Severity,
  codeScanningApproverTeam: string
  codeScanningMinimumSeverity: Severity,
  secretScanningApproverTeam: string
};

/** The alert severiy level */
export enum Severity { 
  ALL = 0,
  NOTE = 20,
  WARNING = 40,
  ERROR = 60,
  LOW = 100,
  MEDIUM = 200,
  HIGH = 300,
  CRITICAL = 400,
  UNKNOWN = 900,
  NONE = 1000
};

/**
 * Converts a string value to a severity level.
 * @param value The string value to convert
 * @param defaultSeverity The default severity level to return if the value is invalid
 * @returns The severity level, or ALL if an invalid value is provided
 */
export function toSeverity(value?: string, defaultSeverity = Severity.ALL): Severity {
  return Severity[(value ?? 'ALL').toUpperCase() as keyof typeof Severity] ?? defaultSeverity;
}
