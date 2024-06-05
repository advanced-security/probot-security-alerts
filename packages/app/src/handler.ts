import * as bot from 'probot';
import { WebhookEventName } from '@octokit/webhooks-types';

// Minimum required headers. We are forcing x-hub-signature-256 to be present, even though it's optional 
// if no secret is configured. If we make this optional, then we will need to skip the signature verification below if
// the secret is not configured.
const requiredHeaders = ["x-github-event", "x-github-delivery", "x-hub-signature-256"];

/**
 * Manages the Probot instance and Lambda function.
 */
export class ProbotHandler {

    /** The probot instance */
    private instance : bot.Probot;

    /**
     * Creates an instance of the handler
     * @param instance the Probot instance
     */
    constructor(instance: bot.Probot) {
        this.instance = instance;
    }

    /**
     * Factory method for creating a handler instance
     * @param instance the probot instance
     * @param application the application definition
     * @returns an instance of the handler
     */
    public static async create(instance: bot.Probot, application: bot.ApplicationFunction) {
        await instance.load(application);
        const processor = new ProbotHandler(instance);
        return processor;
    }

    /**
     * Serverless implementation for processing the webhook event
     * @param event the event instance
     * @returns the results of the request
     */
    public async process(event: WebhookEventRequest): Promise<WebhookEventResponse> {

        if (!event || event.body === undefined || event.body === '' || !event.headers || Object.keys(event.headers).length === 0) {
            return {
                status: 400,
                body: "Missing event body or headers"
            };
        }

        const entries = Object.entries(event.headers).map(([key, value]) => [key.toLowerCase(), value ?? ""]);
        const headers: Record<string,string> = Object.fromEntries(entries);

        if (!requiredHeaders.every(header => headers[header])) {
          return {
            status: 400,
              body: "Missing required headers"
          };
        }

        try {
            await this.instance.webhooks.verifyAndReceive({
                id: headers["x-github-delivery"],
                name: headers["x-github-event"] as WebhookEventName,
                signature: headers["x-hub-signature-256"],
                payload: event.body,
            });
        }
        catch (error: unknown) {
            return {
                status: 400,
                body: JSON.stringify({ message: ProbotHandler.getMessage(error) })
            };
        }

        return {
            status: 200,
            body: JSON.stringify({ ok: true }),
        };
    }

    /**
    * Gets the error message string
    * @param error The error instance
    * @returns A string message
    */
    private static getMessage(error: unknown) {
        return (error instanceof Error) ? error.message : String(error);
    }
}

/**
 * Represents an HTTP webhook request
 */
export interface WebhookEventRequest {
    body: string | undefined;
    headers: Record<string, string> | Record<string, string | undefined>;
}

/**
 * Represents an HTTP webhook response
 */
export interface WebhookEventResponse {
    status: number;
    body: string;
}
