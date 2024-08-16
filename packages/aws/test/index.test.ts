import {createAlertClosedFixtureMessage} from './utils/fixtures.js';

describe('AWS Lambda handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let api: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambda: any;

  beforeEach(async () => {
    api = await import('../../app/test/utils/helpers.js');
    const {app, ProbotHandler} = await import('../../app/src/index.js');
    const probot = api.getTestableProbot();
    const handler = ProbotHandler.create(probot, app);
    lambda = await import('../src/index.js');
    lambda.setHandler(handler);
  });

  afterEach(async () => {
    api.resetNetworkMonitoring();
  });

  test('Can receive message', async () => {
    const mock = api
      .mockGitHubApiRequests()
      .canRetrieveAccessToken()
      .isNotInApprovingTeam()
      .withAlertState('code-scanning', 'open')
      .toNock()
      .persist();

    const payload = await createAlertClosedFixtureMessage();

    const response = await lambda.process(payload, payload.requestContext);
    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(response.statusCode).toBe(200);
  });
});
