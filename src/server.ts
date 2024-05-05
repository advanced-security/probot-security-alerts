/**
 * Entrypoint for debugging.
 */
import { run, Server } from 'probot';
import app from './app.js';

/** The supported signal types (see https://nodejs.org/api/process.html#signal-events) */
export type SignalType = 'SIGINT' | 'SIGTERM';

/**
 * Responds to a shutdown request from a specific signal.
 * @param signal The type of signal
 * @param server The server instance
 */
export async function shutdown(signal: SignalType, server: Server){
    server.log.info(`${signal} received. Stopping ...`);
    await server.stop();
    server.log.info('Server stopped');
}

/**
 * Registers with the process to receive shutdown events
 * @param signal The type of signal
 * @param server The server instance
 */
export function registerShutdown(signal: SignalType, server: Server){
    process.on(signal, async () => await shutdown(signal, server));
}

/**
 * Ensures the server is configured to process termination signals.
 * @param server the server instance
 */
export function registerForSignals(server: Server){
    registerShutdown('SIGINT', server);
    registerShutdown('SIGTERM', server);
    return server;
}

/**
 * Initializes and starts a Probot server instance.
 */
export async function startServer(){
    const server = await run(app);
    registerForSignals(server);
    return server;
}
