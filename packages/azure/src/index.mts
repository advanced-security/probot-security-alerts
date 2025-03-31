import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext
} from '@azure/functions';
import * as bot from 'probot';
import {
  app as probotApp,
  ProbotHandler,
  WebhookEventRequest
} from '../../app/src/index.js';

// Create an instance of the Probot application and handler
// This ensures a single instance will be created for processing events
const botHandler = ProbotHandler.create(bot.createProbot(), probotApp);

export async function securityWatcher(
  request: HttpRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: InvocationContext
): Promise<HttpResponseInit> {
  const processor = await botHandler;
  const event: WebhookEventRequest = {
    headers: Object.fromEntries(request.headers),
    body: await request.text()
  };
  const resp = await processor.process(event);
  return {body: resp.body, status: resp.status};
}

// Register the function name
app.http('securityWatcher', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: securityWatcher
});

app.http('checkConfig', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _request: HttpRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: InvocationContext
  ): Promise<HttpResponseInit> {
    const requiredEnvVars = ['APP_ID', 'PRIVATE_KEY', 'WEBHOOK_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(
      envVar => !process.env[envVar]
    );

    return {
      status: 200,
      body: JSON.stringify({
        config:
          missingEnvVars.length > 0 ? `NOK ${missingEnvVars.length}` : 'OK'
      })
    };
  }
});
