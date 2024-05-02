/* eslint-disable @typescript-eslint/naming-convention */
import type { JestConfigWithTsJest } from 'ts-jest';
import preset from 'ts-jest/presets/index.js';


const config: JestConfigWithTsJest = {
    ...preset.defaultsESM,
  roots: ["<rootDir>/src/", "<rootDir>/test/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.[tj]sx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testEnvironment: "node",
  collectCoverage: true,
  collectCoverageFrom: [ "./src/**"],
  coverageThreshold:{
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  coveragePathIgnorePatterns: [
    "node_modules",
    "<rootDir>/src/main.ts"
  ],
  verbose: false,
  resolver: 'ts-jest-resolver',
  extensionsToTreatAsEsm: ['.ts']
};

export default config;
