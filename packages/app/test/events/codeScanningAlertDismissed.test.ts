import {jest} from '@jest/globals';
import payload from './../fixtures/code_scanning_alert/closed_by_user.json';
import {Severity} from '../../src/config/types.js';
import {getConfigurableMockServices} from '../utils/services.js';

const PAYLOAD_FIXTURE = {name: 'code_scanning_alert.closed_by_user', payload};

describe('When code scanning alerts are received', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let api: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let probot: any;

  beforeEach(async () => {
    const services = await getConfigurableMockServices();
    api = services.api;
    config = services.config;
    probot = services.probot;
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test.each(['maintainer', 'member'])(
    `ignores alerts closed by a %s in the approving team`,
    async (role: string) => {
      const mock = api
        .mockGitHubApiRequests()
        .canRetrieveAccessToken()
        .isInApprovingTeam(role)
        .toNock();

      await probot.receive(PAYLOAD_FIXTURE);
      expect(mock.pendingMocks()).toStrictEqual([]);
    }
  );

  test('opens alerts closed by non-member of the approving team', async () => {
    const mock = api
      .mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isNotInApprovingTeam()
      .withAlertState('code-scanning', 'open')
      .toNock();

    await probot.receive(PAYLOAD_FIXTURE);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test('opens alerts that are above a threshold', async () => {
    const originalConfig = config.getConfiguration();
    const configuration = jest
      .spyOn(config, 'getConfiguration')
      .mockImplementation(() => {
        return {
          ...originalConfig,
          ...{codeScanningMinimumSeverity: Severity.LOW}
        };
      });
    const mock = api
      .mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isNotInApprovingTeam()
      .withAlertState('code-scanning', 'open')
      .toNock();

    // Payload is medium security
    await probot.receive(PAYLOAD_FIXTURE);

    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(configuration).toHaveBeenCalled();
  });

  test('allows alerts that are below a threshold', async () => {
    const originalConfig = config.getConfiguration();
    const configuration = jest
      .spyOn(config, 'getConfiguration')
      .mockReturnValueOnce({
        ...originalConfig,
        ...{codeScanningMinimumSeverity: Severity.HIGH}
      });

    const mock = api.mockGitHubApiRequests().toNock();

    // Payload is medium security
    await probot.receive(PAYLOAD_FIXTURE);

    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(configuration).toHaveBeenCalled();
  });

  test('allows alerts when threshold is NONE', async () => {
    const originalConfig = config.getConfiguration();
    const configuration = jest
      .spyOn(config, 'getConfiguration')
      .mockReturnValueOnce({
        ...originalConfig,
        ...{codeScanningMinimumSeverity: Severity.NONE}
      });

    const mock = api.mockGitHubApiRequests().toNock();

    await probot.receive(PAYLOAD_FIXTURE);

    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(configuration).toHaveBeenCalled();
  });

  test('opens alerts if membership request returns a 500 error', async () => {
    const mock = api
      .mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .errorRetrievingTeamMembership(500)
      .withAlertState('code-scanning', 'open')
      .toNock();

    await probot.receive(PAYLOAD_FIXTURE);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(async () => {
    api.resetNetworkMonitoring();
  });
});
