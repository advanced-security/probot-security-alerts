// For implementation details, see https://probot.github.io/docs/README/
import { Probot, Context } from "probot";
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
    app.log.info(`Received event: ${context.name}`);
    switch (context.name as string){
      case "secret_scanning_alert.revoked": 
        await secretScanningAlertDismissed(context as Context<"secret_scanning_alert">);
        break;
      case "dependabot_alert.dismissed":
        await dependabotAlertDismissed(context as any);
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

  // app.on("secret_scanning_alert.revoked", secretScanningAlertDismissed);
  // app.on("dependabot_alert.dismissed", dependabotAlertDismissed);
};
