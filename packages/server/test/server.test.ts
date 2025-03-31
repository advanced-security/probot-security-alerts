import request from 'supertest';
import express from 'express';
import {jest} from '@jest/globals';
import {
  registerShutdown,
  shutdown,
  SignalType,
  configureServer,
  addHealthChecks
} from '../src/server.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createMockServer(probotMock: any) {
  const server = new probotMock.Server({
    Probot: probotMock.Probot.defaults({
      appId: 123,
      privateKey: 'notakey',
      logLevel: 'fatal'
    }),
    loggingOptions: {
      level: 'silent',
      enabled: false
    }
  });

  // Capture the log messages to prevent them from being written to the console.
  // and allow them to be analyzed in tests.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  jest.spyOn(server.log, 'info').mockImplementation(() => {});
  return server;
}

describe('Additional server routes', () => {
  test('health endpoint returns 200', async () => {
    const app = express();
    addHealthChecks(app);
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.text).toEqual('OK');
  });
});

describe('When configuring a server', () => {
  const SIGNALS = ['SIGINT', 'SIGTERM'] as const;

  beforeEach(() => {
    jest.mock('probot', () => {
      const probotModule = jest.requireActual('probot');
      return {
        __esModule: true,
        ...(probotModule ?? {})
      };
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test.each(SIGNALS)('receiving %s shuts down the server', async signal => {
    const probotMock = await import('probot');
    const server = await createMockServer(probotMock);
    const stopMethod = jest.spyOn(server, 'stop');
    const infolog = server.log.info as jest.Mock;

    await shutdown(signal as SignalType, server);
    expect(stopMethod).toHaveBeenCalledTimes(1);
    expect(infolog).toBeCalled();
  });

  test.each(SIGNALS)('process listens for %s', async signal => {
    const probotMock = await import('probot');
    const processMock = jest.spyOn(process, 'on');
    const server = await createMockServer(probotMock);
    registerShutdown(signal as SignalType, server);
    expect(processMock).toHaveBeenCalledTimes(2);
    expect(processMock.mock.calls[0][0]).toBe('exit');
    expect(processMock.mock.calls[1][0]).toBe(signal as SignalType);
  });

  test('configureServer ensures the signals are observed', async () => {
    // Prevent server implementation from starting.
    await import('probot');
    const probotMock = await import('probot');
    const processMock = jest.spyOn(process, 'on');
    const server = await createMockServer(probotMock);
    configureServer(server);

    const params = processMock.mock.calls.map(item => item[0]);
    SIGNALS.forEach(signal => expect(params).toContain(signal));
  });
});
