import type {APIGatewayProxyEventV2, Context} from 'aws-lambda';
import fixture from '../../app/test/fixtures/code_scanning_alert/closed_by_user.json';
import template from './fixtures/event-template.json';
import {createHmac} from 'node:crypto';

/**
 * Signs the payload using the secret and returns the signature.
 * @param secret The secret to use for signing
 * @param payload The payload to sign
 * @returns The HMAC (SHA-256) signature
 */
async function sign(secret: string, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Creates a message payload for the given fixture.
 * @param secret The secret to use for signing
 * @param fixture The fixture to use for the message body
 * @returns The message payload
 */
async function createMessage(secret: string, fixture: object) {
  const contents = JSON.stringify(fixture);
  const sig = await sign(secret, contents);

  const payload = {
    ...template,
    body: contents,
    headers: {
      'X-GitHub-Hook-ID': '123456',
      'X-GitHub-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
      'X-GitHub-Event': 'code_scanning_alert',
      'X-Hub-Signature-256': `sha256=${sig}`,
      'X-GitHub-Hook-Installation-Target-ID': '79929171',
      'X-GitHub-Hook-Installation-Target-Type': 'repository',
      'Content-Type': 'application/json'
    },
    version: '2.0',
    rawPath: '/',
    rawQueryString: '',
    cookies: [],
    queryStringParameters: {},
    pathParameters: {},
    stageVariables: {},
    isBase64Encoded: false
  } as APIGatewayProxyEventV2;
  console.log(payload);
  return payload;
}

describe('AWS Lambda handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let api: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lambda: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let secret: any;

  beforeEach(async () => {
    api = await import('../../app/test/utils/helpers.js');
    const module = await import('../../app/src/index.js');
    const probot = api.getTestableProbot();
    secret = api.IDENTIFIERS.secret;
    const app = module.app;
    const handler = module.ProbotHandler.create(probot, app);
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

    const payload = await createMessage(secret, fixture);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await lambda.process(payload, {} as any as Context);
    expect(mock.pendingMocks()).toStrictEqual([]);
    expect(response.statusCode).toBe(200);
  });
});
