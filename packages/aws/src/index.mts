import * as bot from 'probot';
import { app, ProbotHandler, WebhookEventRequest } from "../../app/src/index.js";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';

// Create an instance of the Probot application and handler
// This ensures a single instance will be created for processing events
const botHandler = ProbotHandler.create(bot.createProbot(), app);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function process(event: APIGatewayProxyEventV2, _context: Context) : Promise<APIGatewayProxyStructuredResultV2> {
    const processor = await botHandler;
    const resp = await processor.process(event as WebhookEventRequest);
    return {
        statusCode: resp.status,
        body: resp.body
    };
}

// The public implementation, which delegates requests to the handler instance
export const securityWatcher = process;

