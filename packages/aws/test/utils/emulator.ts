import {ChildProcessWithoutNullStreams} from 'node:child_process';
import {startProcess, stopProcess, DockerWarningMessages} from './spawn.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getDefaultProbotOptions,
  IDENTIFIERS,
  WEBHOOK_SECRET
} from '../../../app/test/utils/helpers.js';

export const EmulatorTimeouts = {
  /** Delay before test hook is killed if emulator has not stopped or errored. */
  TEST_STOP: 6000,

  /** Delay before test hook is killed if emulator has not started or errored. */
  TEST_START: 30000,

  /** Delay before emulator process is automatically killed if it hasn't started listening. */
  WAIT_TO_ABORT: 25000,

  /** Delay before the emulator process is resolved to allow time for it to begin listening. The message occurs several seconds before the port is actually available. */
  WAIT_TO_RESOLVE: 500,

  /** Maximum wait time for client response from Lambda before failing. Includes time to download docker image if needed. */
  CLIENT_RESPONSE: 20000
} as const;

export const AwsEmulatorSettings = {
  AWS_API_EMULATOR: 'http://localhost:3000',
  AWS_LAMBDA_EMULATOR: 'http://localhost:3001'
} as const;

export const LambdaEmulatorClientSettings = {
  endpoint: AwsEmulatorSettings.AWS_LAMBDA_EMULATOR,
  tls: false,
  region: 'us-west-1',
  credentials: {
    accessKeyId: 'any',
    secretAccessKey: 'any'
  }
};

/**
 * Gets the settings for the emulated APIs in the AWS environment.
 * @param host the host name to use
 * @param port the port number
 * @param protocol the protocol (http)
 * @returns the settings
 */
export function getEmulatedAwsEnvSettings(
  host: string,
  port: number,
  protocol = 'http'
) {
  const options = getDefaultProbotOptions();
  return {
    SecurityWatcher: {
      GH_ORG: IDENTIFIERS.organizationName,
      APP_ID: options.appId,
      PRIVATE_KEY: options.privateKey,
      WEBHOOK_SECRET: WEBHOOK_SECRET,
      GHE_HOST: `${host}:${port}`,
      GHE_PROTOCOL: protocol,
      LOG_LEVEL: 'debug'
    }
  };
}

/**
 * Starts the AWS Lambda emulator.
 * @param apiHost the host name to use
 * @param apiPort the port number
 */
export async function startAwsLambdaEmulator(apiHost: string, apiPort: number) {
  return await startSamProcess('start-lambda', apiHost, apiPort);
}

/**
 * Starts the AWS API Gateway emulator.
 * @param apiHost the host name to use
 * @param apiPort the port number
 */
export async function startAwsApiGatewayEmulator(
  apiHost: string,
  apiPort: number
) {
  return await startSamProcess('start-api', apiHost, apiPort);
}

/**
 * Messages that are piped to stderr but do not actually indicate
 * and error state.
 */
const SamIgnoredMessages = [
  'No current session found, using default AWS::AccountId',
  'WARNING: This is a development server',
  'Mounting SecurityWatcher',
  'Starting the Local Lambda Service.',
  'You can now browse to the above endpoints to invoke your functions',
  "SAM CLI now collects telemetry to better understand customer needs.",
  "Learn more",
  ...DockerWarningMessages
] as const;

/**
 * Messages that indicate the emulator has started.
 */
const SamStartedMessages = [
  'Running on http://127.0.0.1:',
  'Running on http://localhost:',
  'Press CTRL+C to quit'
] as const;

/**
 * Gets the process options for starting an AWS emulator process.
 * @returns the options for the process
 */
function getAwsProcessOptions() {
  return {
    env: {
      // Required AWS credential variables (not used, but process requires)
      AWS_ACCESS_KEY: 'any',
      AWS_SECRET_ACCESS: 'any',
      // Spawn needs access to the current path to find the CLI tools
      PATH: process.env.PATH,
      // Required for the SAM CLI to work in a dev container since it uses docker
      REMOTE_CONTAINERS_IPC: process.env.REMOTE_CONTAINERS_IPC
    },
    // Directly invoke the command without a shell
    shell: false,
    // Start in the current folder
    cwd: process.cwd(),
    // Keep the process attached to the current terminal
    detached: false
  };
}

/**
 * Creates a SAM emulator process and waits for it to start.
 * @param feature the emulator to start
 * @param apiHost the host name for the GitHub API services
 * @param apiPort the port number for the GitHub API services
 * @returns the process instance
 */
async function startSamProcess(
  feature: 'start-api' | 'start-lambda',
  apiHost: string,
  apiPort: number
): Promise<Emulator> {
  const options = getAwsProcessOptions();
  const fsp = fs.promises;

  const tempPath = await fsp.realpath(os.tmpdir());
  const tmpDir = await fsp.mkdtemp(path.join(tempPath, path.sep));
  const envSettings = path.join(tmpDir, 'env.emulator.json');
  fs.writeFileSync(
    envSettings,
    JSON.stringify(getEmulatedAwsEnvSettings(apiHost, apiPort), null, 2)
  );

  const args = [
    'local',
    feature,
    '--env-vars',
    envSettings,
    '--docker-network',
    'host',
    '--add-host',
    'host.docker.internal:host-gateway'
  ];
  const process = await startProcess(
    'sam',
    args,
    options,
    EmulatorTimeouts.WAIT_TO_ABORT,
    EmulatorTimeouts.WAIT_TO_RESOLVE,
    SamStartedMessages,
    SamIgnoredMessages
  );
  return new EmulatorImpl(process, tmpDir);
}

/**
 * Interface for an emulator process, used to abstract
 * the underlying process usage.
 */
export interface Emulator {
  /**
   * Stops the emulator process.
   */
  stop(): Promise<void>;
}

/**
 * Implementation of an Emulator process.
 */
class EmulatorImpl implements Emulator {
  /** The underlying process instance. */
  private process?: ChildProcessWithoutNullStreams;

  /** Temporary directory used for storing settings file */
  private tmpDir: string;

  /**
   * Creates an instance of class
   * @param process the underlying process instance
   * @param tmpDir the temporary directory used for storing settings file
   */
  constructor(process: ChildProcessWithoutNullStreams, tmpDir: string) {
    this.process = process;
    this.tmpDir = tmpDir;
  }

  /**
   * Stops the emulator process.
   */
  public async stop() {
    if (!this.process) {
      return;
    }
    fs.promises.rmdir(this.tmpDir, {recursive: true});
    await stopProcess(this.process);
  }
}
