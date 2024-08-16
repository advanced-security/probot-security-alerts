import {ChildProcessWithoutNullStreams} from 'node:child_process';
import {startProcess, stopProcess, DockerWarningMessages} from './spawn.js';
import path from 'path';
import {fileURLToPath} from 'url';

const fileName = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileName);

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
 * Starts the AWS Lambda emulator.
 */
export async function startAwsLambdaEmulator() {
  return await startSamProcess('start-lambda');
}

/**
 * Starts the AWS API Gateway emulator.
 */
export async function startAwsApiGatewayEmulator() {
  return await startSamProcess('start-api');
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
 * @returns the process instance
 */
async function startSamProcess(
  feature: 'start-api' | 'start-lambda'
): Promise<Emulator> {
  const options = getAwsProcessOptions();
  const args = [
    'local',
    feature,
    '--env-vars',
    `${path.join(__dirname, '.env.emulator.json')}`,
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
  return new EmulatorImpl(process);
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

  /**
   * Creates an instance of class
   * @param process the underlying process instance
   */
  constructor(process: ChildProcessWithoutNullStreams) {
    this.process = process;
  }

  /**
   * Stops the emulator process.
   */
  public async stop() {
    if (!this.process) {
      return;
    }
    await stopProcess(this.process);
  }
}
