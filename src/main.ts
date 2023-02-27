/**
 * Entrypoint for debugging.
 */
import { run, Server } from 'probot';
import app from './index';

/** The supported signal types (see https://nodejs.org/api/process.html#signal-events)  */
type SignalType = 'SIGINT' | 'SIGTERM';

/**
 * Responds to a shutdown request from a specific signal.
 * @param signal The type of signal
 * @param server The server instance
 */
async function shutdown(signal: SignalType, server: Server){
    server.log.info(`${signal} received. Stopping ...`);
    await server.stop();
    server.log.info('Server stopped');
}

/**
 * Registers with the process to receive shutdown events
 * @param signal The type of signal
 * @param server The server instance
 */
function registerShutdown(signal: SignalType, server: Server){
    process.on(signal, async () => await shutdown(signal, server));
}

// Start application. This replaces using the probot binary to launch the application.
run(app).then(server => {
    server.log.info('Server instance started successfully');
    registerShutdown('SIGINT', server);
    registerShutdown('SIGTERM', server);
});


