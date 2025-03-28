import * as bot from 'probot';
import {app, ProbotHandler, WebhookEventRequest} from '../../app/src/index.js';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context
} from 'aws-lambda';
import {default as node_process} from 'node:process';
import axios from 'axios';
import type {} from '../../app/src/config/process.js';

// Create an instance of the Probot application and handler
// This ensures a single instance will be created for processing events
let botHandler: Promise<ProbotHandler> | undefined;

/**
 * Configures the handler instance. Private method exported
 * to support testing.
 */
export function setHandler(handler: Promise<ProbotHandler>) {
  botHandler = handler;
}

/**
 * The Lambda function entry point
 */
export async function process(
  event: APIGatewayProxyEventV2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  logDebug('Acquire instance');
  const processor = await getHandlerInstance();
  logDebug('Processing request');
  const response = await processor.process(event as WebhookEventRequest);
  logDebug(`Returning status ${response.status}`);
  return {
    statusCode: response.status,
    body: response.body
  };
}

// The public implementation, which delegates requests to the handler instance
export const securityWatcher = process;

/**
 * Logs a debug-level message unless running under Jest.
 * @param message The message to log
 */
function logDebug(message: string) {
  /*istanbul ignore next: no need to test the logging */
  if (node_process.env.NODE_ENV !== 'test') {
    console.debug(message);
  }
}

/**
 * Logs an error-level message unless running under Jest.
 * @param message The message to log
 */
function logError(message: string) {
  console.error(message);
}

/**
 * Retrieves the PEM file from the environment or AWS Secrets Manager.
 * @returns the PEM file contents or undefined if there is no value configured
 */
export async function retrievePemSecret() {
  logDebug('Retrieving PEM from Secrets Manager');
  const secret = await retrieveAwsSecret(node_process.env.PRIVATE_KEY_ARN);
  const result = secret ?? node_process.env.PRIVATE_KEY;
  return result;
}

/**
 * Creates a custom environment object for configuring Probot that includes
 * the private key for the GitHub App from AWS Secrets Manager.
 * @returns the modified environment
 */
async function createLocalEnv() {
  const currentEnv = node_process.env;
  const updatedEnv: Partial<NodeJS.ProcessEnv> = {
    ...currentEnv,
    PRIVATE_KEY: await retrievePemSecret()
  };

  return updatedEnv;
}

/**
 * Retrieves the PEM file secret from AWS secret manager (if available).
 * @param arn The ARN for the secrets resource
 * @returns the secret, or null if the secret could not be retrieved
 */
async function retrieveAwsSecret(
  arn: string | undefined
): Promise<string | null> {
  const PARAMETERS_SECRETS_EXTENSION_HTTP_PORT = 2773;
  logDebug('Retrieving secret from Secrets Manager');
  if (arn) {
    logDebug('ARN provided for retrieving secret');
    const token = node_process.env.AWS_SESSION_TOKEN;
    if (token) {
      logDebug('Retrieving secret from cache');
      const headers = {
        'X-Aws-Parameters-Secrets-Token': token
      };

      const http = axios.create({
        baseURL: `http://localhost:${PARAMETERS_SECRETS_EXTENSION_HTTP_PORT}`,
        timeout: 5000
      });

      try {
        // Avoid leaking handles by allowing time for axios to prepare calls
        await Promise.resolve(node_process.nextTick(() => { /* Do nothing */ }));

        const response = await http.get(`/secretsmanager/get?secretId=${arn}`, {
          headers: headers
        });

        if (response.status == 200) {
          logDebug('Successfully retrieved PEM from secrets');
          return response.data.SecretString;
        }
      } catch (error) {
        /* istanbul ignore next: no value in testing conversion of message to string */
        const message = error instanceof Error ? error.message : String(error);
        logError(`Error retrieving secret: ${message}`);
      }
    }
  }

  // Avoid leaking handles by allowing axios to do error handling cleanup
  await Promise.resolve(node_process.nextTick(() => { /* Do nothing */ }));

  logDebug('Unable to retrieve PEM from Secrets Manager.');
  return null;
}

/**
 * Initializes the handler instance as a singleton. This ensures
 * the Probot application is only created once per Lambda instance
 * For testing, it ensures that the application isn't loaded
 * automatically as part of the module import.
 */
async function getHandlerInstance() {
  /* istanbul ignore next: no integration test to confirm  */
  if (!botHandler) {
    const probotOptions = {
      overrides: {},
      defaults: {},
      env: await createLocalEnv()
    };
    botHandler = ProbotHandler.create(bot.createProbot(probotOptions), app);
  }
  return await botHandler;
}
