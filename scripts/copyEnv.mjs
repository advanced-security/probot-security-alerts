import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

const ROOT_ENV_PATH = '.env';
const SERVER_ENV_PATH = 'packages/server/.env';
const AWS_ENV_JSON_PATH = 'packages/aws/.env.json';
const AZURE_ENV_PATH = 'packages/azure/.env';
const AZURE_ENV_JSON_PATH = 'packages/azure/local.settings.json';

/**
 * Gets the base directory for the project.
 * @returns {string} The absolute path of the base directory for the project.
 */
function getProjectBaseDirectory(){
    const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
    const baseDirectory = path.join(scriptDirectory, '../');
    return baseDirectory;
}

/**
 * Copies the .env settings from the server folder to the appropriate 
 * folder and converts them to the required JSON format.
 * @param {string} target The target JSON environment file
 * @param transformer Optional settings to apply to the environment
 */
function copyServerEnv(target, transformer = (settings) => settings, overwrite = true){
  const baseDirectory = getProjectBaseDirectory();
  const serverEnvPath = path.join(baseDirectory, SERVER_ENV_PATH);
  const targetPath = path.join(baseDirectory, target);

  // eslint-disable-next-line no-undef
  console.log(`Copying environment settings from ${serverEnvPath} to ${targetPath}`);

  if (!fs.existsSync(serverEnvPath)){
    throw new Error(`A .env file must exist at ${SERVER_ENV_PATH} or in the project root.`);
  }
  if (overwrite || !fs.existsSync(targetPath)){
      let settings = dotenv.parse(fs.readFileSync(serverEnvPath));
      delete settings.WEBHOOK_PROXY_URL;
      settings = transformer(settings);
      const jsonSettings = JSON.stringify(settings, null, '  ');
      fs.writeFileSync(targetPath, jsonSettings);
  }
}

/**
 * Copies the .env file from the project root to the server folder
 * if it doesn't already exist.
 */
function copyEnv(source, target){
  const baseDirectory = getProjectBaseDirectory();
  const originalEnvPath = path.join(baseDirectory, source);
  const targetEnvPath = path.join(baseDirectory, target);

  // eslint-disable-next-line no-undef
  console.log(`Copying ${originalEnvPath} to ${targetEnvPath}`);
  if (fs.existsSync(originalEnvPath) && !fs.existsSync(targetEnvPath)) {
    fs.copyFileSync(originalEnvPath, targetEnvPath);
  }
}

/** 
 * Configure environment settings for all packages based on either
 * an .env in the root folder or an .env in the server folder.
 */
copyEnv(ROOT_ENV_PATH, SERVER_ENV_PATH);
copyEnv(SERVER_ENV_PATH, AZURE_ENV_PATH);
copyServerEnv(AWS_ENV_JSON_PATH);
copyServerEnv(
  AZURE_ENV_JSON_PATH,
  (settings) => {
    return {
      IsEncrypted: false,
      Values: {
        ...{
          FUNCTIONS_WORKER_RUNTIME: "node",
          AzureWebJobsFeatureFlags: "EnableWorkerIndexing",
          AzureWebJobsStorage: "UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://127.0.0.1:10000",
          NODE_ENV: "development",
        },
        ...settings}
      }
  });
