import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as bot from 'probot';
import { app as probotApp, ProbotHandler, WebhookEventRequest } from "../../app/src/index.js";

// Create an instance of the Probot application and handler
// This ensures a single instance will be created for processing events
const botHandler = ProbotHandler.create(bot.createProbot(), probotApp);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function securityWatcher(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const processor = await botHandler;
    const event : WebhookEventRequest = {
        headers: request.headers,
        body: request.text()
    };
    const resp = await processor.process(event);
    return { body: resp.body, status: resp.status };
}

// Register the function name
app.http('securityWatcher', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: securityWatcher
});
