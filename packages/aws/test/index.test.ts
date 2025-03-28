import {createAlertClosedFixtureMessage} from './utils/fixtures.js';
import nock from 'nock';
import {jest} from '@jest/globals';

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
    jest.resetAllMocks();
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

/**
 * Verifies the process for retrieving the PEM secret
 **/
describe('Lambda Secret handling', () => {
  let originalEnvironment: NodeJS.ProcessEnv;
  let retrievePemSecret: () => Promise<string | undefined>;
  const SECRET = '---BEGIN PRIVATE KEY---';
  const SECRET_TOKEN = 'SECRET_TOKEN';
  const SECRET_ARN = 'arn:test';

  beforeEach(async () => {
    originalEnvironment = {...process.env};
    process.env = {
      NODE_ENV: 'test'
    };
    const handler = await import('../src/index.js');
    retrievePemSecret = handler.retrievePemSecret;
    nock.disableNetConnect();
  });

  afterEach(() => {
    process.env = originalEnvironment;
    nock.cleanAll();
    nock.enableNetConnect();
    jest.resetAllMocks();
    jest.resetModules();
  });

  test('Secrets are loaded from PEM secret', async () => {
    process.env.PRIVATE_KEY = SECRET;
    const result = await retrievePemSecret();
    expect(result).toEqual(SECRET);
  });

  test('No secret is returned without the env settings', async () => {
    const result = await retrievePemSecret();
    expect(result).toBeUndefined();
  });

  test('Secrets are loaded from the parameter cache service', async () => {
    process.env.PRIVATE_KEY_ARN = SECRET_ARN;
    process.env.AWS_SESSION_TOKEN = SECRET_TOKEN;

    const api = nock('http://localhost:2773', {
      reqheaders: {
        'X-Aws-Parameters-Secrets-Token': (value: string) =>
          value === SECRET_TOKEN
      }
    });
    const scope = api
      .get('/secretsmanager/get?secretId=arn:test')
      .reply(200, {SecretString: SECRET});

    const result = await retrievePemSecret();
    expect(result).toEqual(SECRET);
    expect(scope.isDone()).toBe(true);
  });

  test('Service error returns empty string', async () => {
    process.env.PRIVATE_KEY_ARN = SECRET_ARN;
    process.env.AWS_SESSION_TOKEN = SECRET_TOKEN;
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {
      /* Do nothing */
    });
    const api = nock('http://localhost:2773', {
      reqheaders: {
        'X-Aws-Parameters-Secrets-Token': (value: string) =>
          value === SECRET_TOKEN
      }
    });

    const scope = api
      .get('/secretsmanager/get?secretId=arn:test')
      .reply(400, {message: 'Something went wrong'});

    const result = await retrievePemSecret();
    expect(result).toBeUndefined();
    expect(scope.isDone()).toBe(true);
    expect(errorLog.mock.calls[0][0]).toContain(
      'status code 400'
    );
  });

  test('Errors calling parameter cache service are logged', async () => {
    process.env.PRIVATE_KEY_ARN = SECRET_ARN;
    process.env.AWS_SESSION_TOKEN = SECRET_TOKEN;

    // No nocks are set up, so the request will fail
    // because of nock disconnecting the network in beforeEach
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {
      /* Do nothing */
    });
    const result = await retrievePemSecret();
    expect(result).toBeUndefined();
    expect(errorLog.mock.calls[0][0]).toContain(
      'Nock: Disallowed net connect for "localhost:2773'
    );
  });
});
