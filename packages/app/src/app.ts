// For implementation details, see https://probot.github.io/docs/README/
import {Probot, ApplicationFunction, ApplicationFunctionOptions} from 'probot';
import codeScanningAlertDismissed from './events/codeScanningAlertDismissed.js';
import {dependabotAlertDismissed} from './events/dependabotAlertDismissed.js';
import secretScanningAlertDismissed from './events/secretScanningAlertDismissed.js';
import {CustomWebhookEventContext} from './events/types.js';
import {preparePrivateKey} from './config/index.js';

export const app: ApplicationFunction = probotApplicationFunction;

// Ensure the private key (if provided) is in the proper format.
preparePrivateKey();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function probotApplicationFunction(
  app: Probot,
  _options: ApplicationFunctionOptions
) {
  // Log the start
  app.log.info('Started monitoring process');

  // Display any errors
  app.onError(async evt => {
    app.log.error(evt.message);
  });

  // Log incoming events
  app.onAny(async context => {
    const ctx = context as CustomWebhookEventContext;
    const eventName = `${ctx.name}.${ctx.payload.action}`;
    app.log.info(`Received event: ${eventName}`);
  });

  app.on('code_scanning_alert', async context => {
    app.log.info(
      `Processing code_scanning_alert with action ${context.payload.action}`
    );
  });

  // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#installation
  app.on('installation', async context => {
    app.log.info(
      `Processing installation with action ${context.payload.action}`
    );
  });

  // Implement event handlers

  // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#code_scanning_alert
  app.on('code_scanning_alert.closed_by_user', codeScanningAlertDismissed);

  app.on('secret_scanning_alert.resolved', secretScanningAlertDismissed);

  app.on('dependabot_alert.dismissed', dependabotAlertDismissed);
}
