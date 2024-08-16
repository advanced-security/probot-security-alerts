import {
  spawn,
  ChildProcessWithoutNullStreams,
  SpawnOptionsWithoutStdio
} from 'node:child_process';
import {setTimeout} from 'timers/promises';

/**
 * Stops the specified process and returns an async promise
 * @param process the process instance
 */
export async function stopProcess(process: ChildProcessWithoutNullStreams) {
  if (process && !process.killed) {
    process.stderr.destroy();
    process.stdout.destroy();
    const killer = new Promise<void>(function (resolve) {
      process.on('exit', function () {
        resolve();
      });
      process.on('close', function () {
        resolve();
      });
      process.kill();
    });

    // Wait for the exit or close event to be raised
    await killer;

    // Allow the process to fully close and release and network resources
    await setTimeout(500);
  }
}

/**
 * Converts returned process data into a string.
 * @param data the process data
 * @returns a string representation of the data
 */
function getString(data: Buffer | string): string {
  if (data instanceof Buffer) {
    return new TextDecoder().decode(data);
  }
  return data;
}

/** Warnings present in stderr from Docker pulls */
export const DockerWarningMessages = [
  'Unable to find image',
  'Pulling from',
  'Verifying Checksum',
  'Download complete',
  'Waiting',
  'Pull complete',
  'Digest: sha256:',
  'Downloaded newer image',
  '[a-f0-9]{12}: '
] as const;

/**
 * Default options for a process being spawned
 */
export const DefaultSpawnOptions: SpawnOptionsWithoutStdio = {
  env: {
    // Provide the current environment path
    PATH: process.env.PATH,

    // Provide access to the containers IPC
    REMOTE_CONTAINERS_IPC: process.env.REMOTE_CONTAINERS_IPC
  },
  // Directly invoke the command without a shell
  shell: false,
  // Start in the current folder
  cwd: process.cwd(),
  // Keep the process attached to the current terminal
  detached: false
};

/** Creates a timer that can be aborted.
 * @param timeInMilliseconds the time to wait before the timer is aborted
 * @returns a promise for the timer and a signal to abort the timer
 */
function createAbortableTimer(timeInMilliseconds: number) {
  const ac = new AbortController();
  const timeout = setTimeout(timeInMilliseconds, null, {
    signal: ac.signal
  }).catch(e => {
    if (e.name != 'AbortError') {
      throw e;
    }
  });
  return {
    abortSignal: ac,
    timeout: timeout
  };
}

/**
 * Checks if the process data contains any of the messages.
 * @param data the process piped data
 * @param messages the messages to check
 * @returns true if the data contains any of the messages
 */
function containsMessage(data: string, messages: readonly string[]) {
  //return messages.some(m => data.includes(m));
  return messages.some(m => new RegExp(m, 'g').test(data));
}

/**
 * Spawns a process that can be aborted if it does not see
 * a start message within a specified time.
 * @param command the command to execute
 * @param args the parameters to pass to the command
 * @param options the options for the process
 * @param waitToAbortMilliseconds the time to wait for the start message before the process is aborted
 * @param waitToResolveMilliseconds the time to wait after the start message before the process is resolved
 * @param startMessages the messages that indicate the process has started
 * @param ignoredMessages the messages that are piped to stderr but do not indicate an error state
 * @returns a promise for the process
 */
export async function startProcess(
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio,
  waitToAbortMilliseconds: number,
  waitToResolveMilliseconds: number,
  startMessages: readonly string[],
  ignoredMessages: readonly string[]
): Promise<ChildProcessWithoutNullStreams> {
  const result = new Promise<ChildProcessWithoutNullStreams>(function (
    resolve,
    reject
  ) {
    const abortTimer = createAbortableTimer(waitToAbortMilliseconds);
    const app = spawn(command, args, options);
    let isResolved = false;
    function resolveOnStartMessage(message: string) {
      if (!isResolved && containsMessage(message, startMessages)) {
        isResolved = true;
        abortTimer.abortSignal.abort();
        // Wait to let the port start listening
        setTimeout(waitToResolveMilliseconds).then(() => resolve(app));

        return true;
      }

      return false;
    }

    function canIgnoreMessage(message: string) {
      return isResolved || containsMessage(message, ignoredMessages);
    }

    function rejectWithError(message: string, kill = false) {
      if (!isResolved) {
        isResolved = true;
        if (kill) {
          abortTimer.abortSignal.abort();
          app.stderr.destroy();
          app.stdout.destroy();
          app.kill();
        }
        reject(new Error(message));
      }
    }

    app.stdout.on('data', function (data) {
      const msg = getString(data);
      resolveOnStartMessage(msg);
    });

    app.stderr.on('data', function (data) {
      const msg = getString(data);
      if (!resolveOnStartMessage(msg)) {
        if (!canIgnoreMessage(msg)) {
          rejectWithError(msg, true);
        }
      }
    });

    app.on('close', function (code) {
      rejectWithError(`Process cosed: ${code}`);
    });

    app.on('error', function (code) {
      rejectWithError(`Process error: ${code}`);
    });

    abortTimer.timeout.then(() => {
      rejectWithError('Process did not start in time', true);
    });
  });

  return result;
}
