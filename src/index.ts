// For implementation details, see https://probot.github.io/docs/README/
import { Probot } from "probot";
import codeScanningAlertDismissed from "./events/codeScanningAlertDismissed"
import { dependabotAlertDismissed } from "./events/dependabotAlertDismissed"
import secretScanningAlertDismissed from "./events/secretScanningAlertDismissed"

export default (app: Probot) => {

  // Log the start
  app.log.info("Started monitoring process");

  // Display any errors
  app.onError(async (evt) => {
    app.log.error(evt.message);
  });

  // Log incoming events
  app.onAny(async (context) => {
    const untypedContext = context as any;
    const eventName = `${context?.name}.${untypedContext?.payload?.action}`
    app.log.info(`Received event: ${eventName}`);
    
    // Workaround to enable the new event type
    if (eventName == "dependabot_alert.dismissed"){
        await dependabotAlertDismissed(untypedContext);
    }
  });

  app.on("code_scanning_alert", async (context) => {
    app.log.info(`Processing code_scanning_alert with action ${context.payload.action}`);
  });

  // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#installation
  app.on("installation", async (context) => {
    app.log.info(`Processing installation with action ${context.payload.action}`);
  });

  // Implement event handlers

  // https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#code_scanning_alert
  app.on("code_scanning_alert.closed_by_user", codeScanningAlertDismissed);

  app.on("secret_scanning_alert.resolved", secretScanningAlertDismissed);

  // When Probot adds support
  // app.on("dependabot_alert.dismissed", dependabotAlertDismissed);
};
