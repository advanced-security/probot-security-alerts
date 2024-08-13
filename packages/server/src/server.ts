/**
 * Entrypoint for debugging.
 */
import {run, Server} from 'probot';
import {join, dirname} from 'path';
import {existsSync} from 'fs';
import {Application, static as expressStatic} from 'express';
import {app} from '../../app/src/index.js';
import {fileURLToPath} from 'url';

/** The supported signal types (see https://nodejs.org/api/process.html#signal-events) */
export type SignalType = 'SIGINT' | 'SIGTERM';

/**
 * Responds to a shutdown request from a specific signal.
 * @param signal The type of signal
 * @param server The server instance
 */
export async function shutdown(signal: SignalType, server: Server) {
  server.log.info(`${signal} received. Stopping ...`);
  await server.stop();
  server.log.info('Server stopped');
}

/**
 * Registers with the process to receive shutdown events
 * @param signal The type of signal
 * @param server The server instance
 */
export function registerShutdown(signal: SignalType, server: Server) {
  process.on(signal, async () => await shutdown(signal, server));
}

/**
 * Ensures the server is configured to process termination signals.
 * @param server the server instance
 */
export function registerForSignals(server: Server) {
  registerShutdown('SIGINT', server);
  registerShutdown('SIGTERM', server);
  return server;
}

/**
 * Initializes and starts a Probot server instance.
 */
/* istanbul ignore next */
export async function startServer() {
  const server = await run(app);
  return configureServer(server);
}

/**
 * Configures additional routes and listeners on the server
 */
export function configureServer(server: Server) {
  addHealthChecks(server.expressApp);
  addStaticFiles(server.expressApp);
  registerForSignals(server);
  return server;
}

/**
 * Provides a health check endpoint.
 * @param express the instance of Express
 */
export function addHealthChecks(express: Application) {
  express.get('/health', (_request, response) => {
    response.status(200).send('OK');
  });
}

/**
 * Adds Probot static files when using the index.mjs entrypoint
 * and the static files are available.
 * @param express the instance of Express
 */
export function addStaticFiles(express: Application) {
  const fileName = fileURLToPath(import.meta.url);
  const directory = dirname(fileName);
  const staticDir = join(directory, 'static');
  /* istanbul ignore next */
  if (fileName.indexOf('index.mjs') > 0 && existsSync(staticDir)) {
    express.use('/probot/static', expressStatic(staticDir));
  }
}
