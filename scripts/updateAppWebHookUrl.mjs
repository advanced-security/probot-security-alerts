import { Octokit} from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import process from "process";
import console from "console"

if (!process.env.APP_ID || !process.env.PRIVATE_KEY) {
  console.error("APP_ID and PRIVATE_KEY environment variables are required");
  process.exit(1);
}

if (!process.argv[2]) {
  console.error("URL argument is required");
  process.exit(1);
}

const webhookUrl = process.argv[2];

const certificate = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
const appId = process.env.APP_ID;

console.log(`Using App Id: ${appId}`);

const options =  {
  appId : appId,
  privateKey: certificate,
  installationId: 51520851,
};

if(!options.appId) {
  console.error("APP_ID environment variable is required");
  process.exit(1);
}

const appAuth = createAppAuth({
  appId : appId,
  privateKey: certificate,
});

const auth = await appAuth({ type: "app" });
const octokit = new Octokit({auth: auth.token});

const appData = await octokit.request("GET /app/hook/config");
console.log(`Current WebHook URL [${appData.data.url}]`);


if (appData.data.url === webhookUrl) {
  console.log("  WebHook URL is already up to date. Exiting.");
  process.exit(0);
}

console.log(`Updating WebHook URL to [${webhookUrl}]`);	

const updateResult = await octokit.request("PATCH /app/hook/config", 
  {
    data: {
      url: webhookUrl,
    },
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  }
);

if (updateResult.status !== 200) {
  console.error(`Update failed with status: ${updateResult.status}`);
  updateResult.data.errors.forEach((error) => {
    console.error(`Error: ${error.message}`);
  });
  process.exit(1);
} else {  
  console.log(`  WebHook URL updated to [${webhookUrl}]`);
}
