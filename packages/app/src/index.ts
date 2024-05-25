/**
 * Provides the module exports
 */
export { app } from './app.js';
export { ProbotHandler, type WebhookEventRequest, type WebhookEventResponse } from './handler.js';

// When this module is loaded, patch the private key variable
// to replace escaped newlines and remove quotes. This prevents
// errors that would only show up when using Octokit.
if (process.env.PRIVATE_KEY?.length ?? -1 > 0) {
  process.env.PRIVATE_KEY = process.env.PRIVATE_KEY?.replace(/\\n/g, '\n').replace('"', '');
}
