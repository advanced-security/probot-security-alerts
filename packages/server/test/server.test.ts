import { Server, Probot } from 'probot';
import * as pb from 'probot';
import request from 'supertest';
import express from 'express';
import { registerShutdown, shutdown, SignalType, startServer, addHealthChecks } from '../src/server.js';

function createMockServer(){
    const server = new Server({
        Probot: Probot.defaults({
            appId: 123,
            privateKey: 'notakey',
            logLevel: 'fatal'
        }),
        loggingOptions: {
            level: 'silent',
            enabled: false
        }
    });
    server.log.info = jest.fn().mockImplementation();
    return server;
}

describe("Additional server routes", () => {
    test('health endpoint returns 200', async () => {
        const app = express();
        addHealthChecks(app);
        const res = await request(app)
                          .get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.text).toEqual('OK');
    });
});

describe('When configuring a server', () => {
    const SIGNALS = ['SIGINT', 'SIGTERM'] as const;

    let server: Server;
    const processMock = jest.spyOn(process, 'on');
    const probotMock = jest.mock('probot');

    // Prevent server implementation from starting.
    jest.spyOn(Server.prototype, 'start').mockImplementation();

    beforeEach(() => {
        probotMock.clearAllMocks();
        processMock.mockClear();
        server = createMockServer();
    });

    test.each(SIGNALS)('receiving %s shuts down the server', async(signal) => {
        const stopMethod = jest.spyOn(server, 'stop').mockImplementation(() => Promise.resolve());
        const infolog = server.log.info as jest.Mock;

        await shutdown(signal as SignalType, server);
        expect(stopMethod).toHaveBeenCalledTimes(1);
        expect(infolog).toBeCalled();
    });

    test.each(SIGNALS)('process listens for %s', async(signal) => {
        registerShutdown(signal as SignalType, server);
        expect(processMock).toHaveBeenCalledTimes(1);
        expect(processMock.mock.calls[0][0]).toBe(signal as SignalType);
    });

    test('startServer ensures the signals are observed', async () => {
       jest.spyOn(pb, 'run').mockResolvedValue(server);
       await startServer();
       const params = processMock.mock.calls.map(item => item[0]);
       SIGNALS.forEach(signal => expect(params).toContain(signal));
    });
});
