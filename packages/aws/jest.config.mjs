import {default as config} from '../../jest.config.mjs';

const ignored = config.coveragePathIgnorePatterns;

// Include index.ts in coverage since it's not just an entry point
config.coveragePathIgnorePatterns = ignored.filter((pattern) => !pattern.includes('<rootDir>/src/index.ts'));
export default config;
