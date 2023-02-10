module.exports = {
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
  }
};
