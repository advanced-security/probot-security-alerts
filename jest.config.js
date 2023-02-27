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
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  }
};
