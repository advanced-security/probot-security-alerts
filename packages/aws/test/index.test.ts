import {createAlertClosedFixtureMessage} from './utils/fixtures.js';

/**
 * Verifies Lambda processing behavior using mocked handler.
 */
describe('AWS Lambda mocked handler', () => {
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

/**
 * Verifies code paths using the default handler
 */
describe('AWS Lambda default handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambda: any;

  beforeEach(async () => {
    lambda = await import('../src/index.js');

    // Ensure the handler is reset between tests
    lambda.setHandler(undefined);
  });

  /**
   * Test failure case to ensure a handler is created.
   */
  test('Handler is created', async () => {
    const payload = await createAlertClosedFixtureMessage();

    // Clear the payload to ensure that no API calls are made if the next
    // line fails.
    payload.body = undefined;

    // This message would be the result of the default handler being created
    // without the necessary environment variables. It indicates the default
    // handler was created by the code path without exporting that variable.
    expect(lambda.process(payload, payload.requestContext)).rejects.toThrow(
      '[@octokit/auth-app] appId option is required'
    );
  });
});
