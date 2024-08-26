import {
  LambdaClient,
  InvokeCommand,
  InvocationType,
  LogType,
  InvokeCommandInput
} from '@aws-sdk/client-lambda';

import axios from 'axios';

import * as emulator from './utils/emulator.js';
import * as mockserver from './utils/mockserver.js';
import * as fixtures from './utils/fixtures.js';

/**
 * Integration tests using Lambda emulator
 */
describe('Integration: AWS Lambda emulator', () => {
  let emulatorProcess: emulator.Emulator;
  let apiServer: mockserver.MockServer;

  beforeAll(async () => {
    const results = await Promise.all([
      mockserver.start(),
      emulator.startAwsLambdaEmulator(
        mockserver.MockServerSettings.CONTAINER_HOST,
        mockserver.MockServerSettings.DEFAULT_PORT
      )
    ]);
    apiServer = results[0];
    emulatorProcess = results[1];
  }, emulator.EmulatorTimeouts.TEST_START + mockserver.MockServerTimeouts.TEST_START);

  afterAll(async () => {
    if (emulatorProcess) {
      await emulatorProcess.stop();
    }
    if (apiServer) {
      await apiServer.stop();
    }
  }, emulator.EmulatorTimeouts.TEST_STOP + mockserver.MockServerTimeouts.TEST_STOP);

  test('Can invoke Lambda', async () => {
    const client = await mockserver.getMockClientForFixture(apiServer.port);
    const lambda = new LambdaClient(emulator.LambdaEmulatorClientSettings);
    const payload = await fixtures.createLocalAlertClosedFixtureMessage(
      mockserver.MockServerSettings.CONTAINER_HOST,
      apiServer.port
    );
    const params: InvokeCommandInput = {
      FunctionName: 'SecurityWatcher',
      InvocationType: InvocationType.RequestResponse,
      Payload: JSON.stringify(payload),
      LogType: LogType.None
    };
    const command = new InvokeCommand(params);
    try {
      const result = await lambda.send(command);
      expect(result.StatusCode).toBe(200);
    } catch (e) {
      console.log(JSON.stringify(e, null, 2));
    }
    expect(await mockserver.mockedApiCallsAreInvoked(client)).toBeNull();
  }, 35000);
});

/**
 * Integration tests using API Gateway emulator
 */
describe('Integration: AWS API Gateway emulator', () => {
  let emulatorProcess: emulator.Emulator;
  let apiServer: mockserver.MockServer;

  beforeAll(async () => {
    const apiPort = mockserver.MockServerSettings.DEFAULT_PORT + 1;
    const results = await Promise.all([
      mockserver.start(apiPort),
      emulator.startAwsApiGatewayEmulator(
        mockserver.MockServerSettings.CONTAINER_HOST,
        apiPort
      )
    ]);
    apiServer = results[0];
    emulatorProcess = results[1];
  }, emulator.EmulatorTimeouts.TEST_START + mockserver.MockServerTimeouts.TEST_START);

  afterAll(async () => {
    if (emulatorProcess) {
      await emulatorProcess.stop();
    }
    if (apiServer) {
      await apiServer.stop();
    }
  }, emulator.EmulatorTimeouts.TEST_STOP + mockserver.MockServerTimeouts.TEST_STOP);

  test(
    'Can invoke Lambda via API Gateway',
    async () => {
      const client = await mockserver.getMockClientForFixture(apiServer.port);

      const message = await fixtures.createLocalAlertClosedFixtureMessage(
        mockserver.MockServerSettings.CONTAINER_HOST,
        apiServer.port
      );
      const http = axios.create({
        baseURL: emulator.AwsEmulatorSettings.AWS_API_EMULATOR,
        timeout: emulator.EmulatorTimeouts.CLIENT_RESPONSE
      });

      try {
        const response = await http.post('/', message.body, {
          headers: message.headers
        });

        // Message should be successfully accepted by the emulated gateway
        expect(response.status).toBe(200);

        // And expected API server calls should have been made
        expect(await mockserver.mockedApiCallsAreInvoked(client)).toBeNull();
      } catch (e) {
        // Used to prevent circular serialization of the error until Jest 30 releases
        throw new Error(`Error invoking Lambda via API Gateway: ${e}`);
      }
    },
    emulator.EmulatorTimeouts.TEST_START +
      mockserver.MockServerTimeouts.TEST_START
  );
});
