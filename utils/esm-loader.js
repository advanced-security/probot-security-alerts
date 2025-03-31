/* istanbul ignore file */
/**
 * Provides TS Node ESM support.
 */
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
register('ts-node/esm', pathToFileURL('./'));
