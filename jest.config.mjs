/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest',
  roots: [
    "<rootDir>/src/",
    "<rootDir>/test/"
  ],
  testEnvironment: 'node',
  testRegex: "(/test/.*\\.(test|spec))\\.m?[tj]s$",
  resolver: 'ts-jest-resolver',
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverage: true,
  collectCoverageFrom: [ "./src/**"],
  coverageDirectory: "./coverage",
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
    "<rootDir>/src/index.ts"
  ],
  //reporters: [['github-actions', {silent: false}], 'summary'],
};

export default config;
