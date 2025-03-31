/// <reference lib="es2022" />
import {createHmac, BinaryLike} from 'node:crypto';
import type {APIGatewayProxyEventV2} from 'aws-lambda';
import fixture from '../../../app/test/fixtures/code_scanning_alert/closed_by_user.json';
import template from '../fixtures/event-template.json';
import {WEBHOOK_SECRET} from '../../../app/test/utils/helpers.js';

/**
 * Signs the payload using the secret and returns the signature.
 * @param secret The secret to use for signing
 * @param payload The payload to signa
 * @returns The HMAC (SHA-256) signature
 */
async function sign(secret: BinaryLike, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Creates a message payload for the alert closed fixture.
 * @param host The host to use for the message body
 * @param port The port to use for the message body
 * @returns The message payload for a Lambda API Gateway
 */
export async function createLocalAlertClosedFixtureMessage(
  host: string,
  port: number
) {
  const message = await createMessage(getLocalCallMockFixture(host, port));
  return message;
}

/**
 * Creates a message payload for the alert closed fixture.
 * @returns The message payload for a Lambda API Gateway
 */
export async function createAlertClosedFixtureMessage() {
  const message = await createMessage(fixture);
  return message;
}

/**
 * Creates a message payload for the given fixture.
 * @param fixture The fixture to use for the message body
 * @param secret The secret to use for signing
 * @returns The message payload
 */
export async function createMessage(
  fixture: object | string,
  secret: string = WEBHOOK_SECRET
) {
  const contents =
    typeof fixture === 'string' ? fixture : JSON.stringify(fixture);
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
  return payload;
}

/**
 * Gets a mock that sends GitHub API calls to the specified host and port.
 * @param host the target server
 * @param port the target port
 * @returns a message payload for the alert closed fixture with the host and port
 */
function getLocalCallMockFixture(host: string, port: number) {
  const fixtureData = JSON.stringify(fixture).replaceAll(
    'https://api.github.com',
    `http://${host}:${port}/api/v3`
  );
  return fixtureData;
}
