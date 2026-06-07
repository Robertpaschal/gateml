import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir:              'src',
  testRegex:            '.*\\.spec\\.ts$',
  transform:            { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom:  ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory:    '../coverage',
  testEnvironment:      'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/../tsconfig.json',
    },
  },
};

export default config;
