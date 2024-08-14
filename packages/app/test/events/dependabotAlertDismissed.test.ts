import {jest} from '@jest/globals';
import event from '../fixtures/dependabot_alert/dismissed.json';
import {Severity} from '../../src/config/types.js';
import {getConfigurableMockServices} from '../utils/services.js';

const PAYLOAD_FIXTURE = {name: 'dependabot_alert', payload: event.payload};

describe('When Dependabot alerts are received', () => {
  // Use the any type to avoid issues with additional fields in the payload that Probot cannot recognize
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

      // Receive a webhook event
      await probot.receive(PAYLOAD_FIXTURE);

      expect(mock.pendingMocks()).toStrictEqual([]);
    }
  );

  test(`opens alerts closed by non-member of the approving team`, async () => {
    const mock = api
      .mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isNotInApprovingTeam()
      .withAlertState('dependabot', 'open')
      .toNock();

    // Receive a webhook event
    await probot.receive(PAYLOAD_FIXTURE);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test('allows alerts when threshold is NONE', async () => {
    const originalConfig = config.getConfiguration();
    const configuration = jest
      .spyOn(config, 'getConfiguration')
      .mockReturnValueOnce({
        ...originalConfig,
        ...{dependabotMinimumSeverity: Severity.NONE}
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
      .withAlertState('dependabot', 'open')
      .toNock();

    await probot.receive(PAYLOAD_FIXTURE);

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    api.resetNetworkMonitoring();
  });
});
