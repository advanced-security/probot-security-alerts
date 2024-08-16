import {MockServerClient} from 'mockserver-client/mockServerClient';
import {
  startProcess,
  stopProcess,
  DefaultSpawnOptions,
  DockerWarningMessages
} from './spawn';
import {ChildProcessWithoutNullStreams} from 'node:child_process';

/**
 * Configuration settings for the mock server
 */
export const MockServerSettings = {
  /** The port to use for the mock server */
  DEFAULT_PORT: 5555 as number,
  /** The host name to use when accessing the server from another container */
  CONTAINER_HOST: 'host.docker.internal',
  /** The hostname to use when accessing the server from within the host environment */
  MOCKSERVER_HOST: 'localhost'
} as const;

/**
 * Timeout settings for the mock server
 */
export const MockServerTimeouts = {
  /** The time to wait for a test to start */
  TEST_START: 40000,
  /** The time to wait for a test to stop */
  TEST_STOP: 15000,

  /** The time to wait for container to download and start listening */
  WAIT_TO_ABORT: 30000,

  /** Additional time to wait for the listening port to become available after the process reports being ready */
  WAIT_TO_RESOLVE: 500
};

/**
 * Configures mock server to respond to the sample fixture
 * @returns the mock client
 */
export async function getMockClientForFixture(
  port = MockServerSettings.DEFAULT_PORT
) {
  const {mockServerClient} = await import('mockserver-client');
  const client: MockServerClient = mockServerClient(
    MockServerSettings.MOCKSERVER_HOST,
    port
  );
  // Remove any mocks that already exist
  client.reset();
  await client.mockAnyResponse({
    httpRequest: {
      method: 'GET',
      path: '/api/v3/orgs/_orgname/teams/scan-managers/memberships/_magicuser'
    },
    httpResponse: {
      statusCode: 404
    }
  });
  await client.mockAnyResponse({
    httpRequest: {
      method: 'PATCH',
      path: '/api/v3/repos/_orgname/_myrepo/code-scanning/alerts/1'
    },
    httpResponse: {
      statusCode: 200
    }
  });
  await client.mockAnyResponse({
    httpRequest: {
      method: 'POST',
      path: '/api/v3/app/installations/10000004/access_tokens'
    },
    httpResponse: {
      statusCode: 200,
      body: {
        token: 'test',
        permissions: {
          security_events: 'read'
        }
      }
    }
  });

  return client;
}

/**
 * Ensures the mocked API calls are invoked in the expected order
 * @param client the mock server client
 * @returns null if the calls are invoked in the expected order, otherwise an error message
 */
export async function mockedApiCallsAreInvoked(client: MockServerClient) {
  try {
    await client.verifySequence(
      {
        path: '/api/v3/app/installations/10000004/access_tokens',
        method: 'POST'
      },
      {
        path: '/api/v3/orgs/_orgname/teams/scan-managers/memberships/_magicuser',
        method: 'GET'
      },
      {
        path: '/api/v3/repos/_orgname/_myrepo/code-scanning/alerts/1',
        method: 'PATCH'
      }
    );
  } catch (e) {
    return String(e);
  }

  return null;
}

/**
 * Starts the Mock Server.
 * @param port The port to use for the server
 */
export async function start(
  port = MockServerSettings.DEFAULT_PORT
): Promise<MockServer> {
  return await new MockServerImpl(port).start();
}

/**
 * Interface for interacting with the mock server.
 */
export interface MockServer {
  /** The port the server is running on */
  port: number;
  /** Stops the server */
  stop(): Promise<void>;
}

/**
 * Messages used to indicate the server has started.
 */
const StartMessages = ['started on port: 1080'] as const;

/**
 * Messages on stderr to ignore when waiting for the server to start.
 */
const IgnoredMessages = [
  'does not match the detected host platform',
  ...DockerWarningMessages
] as const;

/**
 * Implementation of the Mock Server using Docker rather than
 * the mockserver-node package. This is because the mockserver-node
 * package does not seem to be getting continued updates.
 */
class MockServerImpl implements MockServer {
  /** The port the server is running on */
  port: number;

  /** The underlying process instance */
  private process?: ChildProcessWithoutNullStreams;

  /**
   * Creates an instance of the class
   * @param port the port to use for the server
   */
  constructor(port = MockServerSettings.DEFAULT_PORT) {
    this.port = port;
  }

  /**
   * Starts the server.
   */
  async start() {
    if (this.process) {
      throw new Error('Mock server process already started');
    }

    const args = [
      'run',
      '--rm',
      '-p',
      `${this.port}:1080`,
      'mockserver/mockserver'
    ];

    this.process = await startProcess(
      'docker',
      args,
      DefaultSpawnOptions,
      MockServerTimeouts.WAIT_TO_ABORT,
      MockServerTimeouts.WAIT_TO_RESOLVE,
      StartMessages,
      IgnoredMessages
    );
    return this;
  }

  /**
   * Stops the server.
   */
  public async stop() {
    if (!this.process) {
      return;
    }
    await stopProcess(this.process);
    this.process = undefined;
  }
}
