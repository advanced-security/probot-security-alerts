// For implementation details, see https://probot.github.io/docs/README/
import type { Probot } from "probot";
import codeScanningAlertDismissed from "./events/codeScanningAlertDismissed"

export = (app: Probot) => {

  // Log the start
  app.log.info("Started monitoring process");

  // Display any errors
  app.onError(async (evt) => {
    app.log.error(evt.message);
  });

  // Log incoming events
  app.onAny(async (context) => {
    app.log.info(`Received event: ${context.name}`);
  });

  app.on("code_scanning_alert", async (context) => {
    app.log.info(`Processing code_scanning_alert with action ${context.payload.action}`);
  });

  // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#installation
  app.on("installation", async (context) => {
    app.log.info(`Processing installation with action ${context.payload.action}`);
  });

  // Implement event handle
  // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#code_scanning_alert
  app.on("code_scanning_alert.closed_by_user", codeScanningAlertDismissed);
};
