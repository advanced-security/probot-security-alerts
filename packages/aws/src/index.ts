import * as bot from 'probot';
import {app, ProbotHandler, WebhookEventRequest} from '../../app/src/index.js';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context
} from 'aws-lambda';

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
 * Initializes the handler instance as a singleton. This ensures
 * the Probot application is only created once per Lambda instance
 * For testing, it ensures that the application isn't loaded
 * automatically as part of the module import.
 */
function getHandlerInstance() {
  if (botHandler) {
    return botHandler;
  }
  botHandler = ProbotHandler.create(bot.createProbot(), app);
  return botHandler;
}

/**
 * The Lambda function entry point
 */
export async function process(
  event: APIGatewayProxyEventV2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: Context
): Promise<APIGatewayProxyStructuredResultV2> {
  const processor = await getHandlerInstance();
  const resp = await processor.process(event as WebhookEventRequest);
  return {
    statusCode: resp.status,
    body: resp.body
  };
}

// The public implementation, which delegates requests to the handler instance
export const securityWatcher = process;
