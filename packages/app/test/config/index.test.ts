import {preparePrivateKey, getConfiguration} from '../../src/config/index.js';
import {getPrivateKey} from '../utils/helpers.js';

describe('When a private key is provided', () => {
  const OLD_ENV = process.env;
  let privateKey = '';

  beforeEach(() => {
    process.env = {...OLD_ENV};
    privateKey = getPrivateKey();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test(`extra quotes are removed`, async () => {
    // Arrange
    const key = `"${privateKey}"`;
    process.env.PRIVATE_KEY = key;

    // Act
    preparePrivateKey();

    // Assert
    expect(process.env.PRIVATE_KEY).toEqual(expect.not.stringContaining(`"`));
  });

  test(`new line escapes are removed`, async () => {
    // Arrange
    const key = privateKey.replace('\n', '\\n');
    process.env.PRIVATE_KEY = key;

    // Act
    preparePrivateKey();

    // Assert
    expect(process.env.PRIVATE_KEY).toEqual(expect.not.stringContaining(`\\n`));
  });
});

describe('The configuration settings', () => {
  const OLD_ENV = process.env;
  const DEFAULT_TEAM = 'scan-managers';

  beforeEach(() => {
    process.env = {...OLD_ENV};
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test(`The process specified security alert team is provided`, () => {
    process.env.SECURITY_ALERT_CLOSE_TEAM = 'test-team';
    const config = getConfiguration();
    expect(config.securityAlertCloseTeam).toEqual('test-team');
  });

  test(`Default security alert team is 'scan-managers'`, () => {
    const config = getConfiguration();
    expect(config.securityAlertCloseTeam).toEqual(DEFAULT_TEAM);
  });

  test('No default private key is provided', () => {
    const config = getConfiguration();
    expect(config.privateKey).toEqual(undefined);
  });

  test.each`
    defaultTeam   | configuredTeam   | result
    ${null}       | ${null}          | ${DEFAULT_TEAM}
    ${undefined}  | ${undefined}     | ${DEFAULT_TEAM}
    ${null}       | ${'super-users'} | ${'super-users'}
    ${'everyone'} | ${null}          | ${'everyone'}
    ${'everyone'} | ${'super-users'} | ${'super-users'}
    ${'scans'}    | ${DEFAULT_TEAM}  | ${DEFAULT_TEAM}
  `(
    'specifying `$configuredTeam` for code scanning approvers with default team `$defaultTeam` will use $result',
    async ({defaultTeam, configuredTeam, result}) => {
      process.env.SECURITY_ALERT_CLOSE_TEAM = defaultTeam;
      process.env.CODE_SCANNING_APPROVER_TEAM = configuredTeam;
      const config = getConfiguration();
      expect(config.codeScanningApproverTeam).toEqual(result);
    }
  );

  test.each`
    defaultTeam   | configuredTeam   | result
    ${null}       | ${null}          | ${DEFAULT_TEAM}
    ${undefined}  | ${undefined}     | ${DEFAULT_TEAM}
    ${null}       | ${'super-users'} | ${'super-users'}
    ${'everyone'} | ${null}          | ${'everyone'}
    ${'everyone'} | ${'super-users'} | ${'super-users'}
    ${'scans'}    | ${DEFAULT_TEAM}  | ${DEFAULT_TEAM}
  `(
    'specifying `$configuredTeam` for dependabot scanning approvers with default team `$defaultTeam` will match $result',
    async ({defaultTeam, configuredTeam, result}) => {
      process.env.SECURITY_ALERT_CLOSE_TEAM = defaultTeam;
      process.env.DEPENDABOT_APPROVER_TEAM = configuredTeam;
      const config = getConfiguration();
      expect(config.dependabotApproverTeam).toEqual(result);
    }
  );
  test.each`
    defaultTeam   | configuredTeam   | result
    ${null}       | ${null}          | ${DEFAULT_TEAM}
    ${undefined}  | ${undefined}     | ${DEFAULT_TEAM}
    ${null}       | ${'super-users'} | ${'super-users'}
    ${'everyone'} | ${null}          | ${'everyone'}
    ${'everyone'} | ${'super-users'} | ${'super-users'}
    ${'scans'}    | ${DEFAULT_TEAM}  | ${DEFAULT_TEAM}
  `(
    'specifying `$configuredTeam` for secret scanning approvers with default team `$defaultTeam` will use $result',
    async ({defaultTeam, configuredTeam, result}) => {
      process.env.SECURITY_ALERT_CLOSE_TEAM = defaultTeam;
      process.env.SECRET_SCANNING_APPROVER_TEAM = configuredTeam;
      const config = getConfiguration();
      expect(config.secretScanningApproverTeam).toEqual(result);
    }
  );
});
