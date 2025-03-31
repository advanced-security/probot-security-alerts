import {jest} from '@jest/globals';

// Dynamically loaded import to access the original configuration
const configOriginal = await import('../../src/config/index.js');

/**
 * Helper function to ensure that the services loaded by
 * helpers are using the mocked configuration. If the helpers
 * are loaded before the configuration is mocked, the original
 * configuration implementation will be used since ESM module loads
 * are read-only.
 */
async function getApiMocks() {
  const helpers = await import('../utils/helpers.js');
  return helpers;
}

/**
 * Gets the mocked services and probot instance used for testing
 * with support for mocking the configuration used by those services.
 * @returns the mocked testing service components
 */
export async function getConfigurableMockServices() {
  // Unstable_mockModule is used due to a bug/limitation in jest.mock
  // that prevents the ESM modules from properly loading and being mocked.
  // This usage is centralized here so that it can eventually be replaced
  // with a stable implementation (once available).
  jest.unstable_mockModule('../../src/config/index.js', async () => {
    return {
      ...(configOriginal ?? {}),
      getConfiguration: jest.fn(configOriginal.getConfiguration)
    };
  });
  const config = await import('../../src/config/index.js');
  const api = await getApiMocks();
  const probot = api.getTestableProbot();
  return {
    config,
    api,
    probot
  };
}
