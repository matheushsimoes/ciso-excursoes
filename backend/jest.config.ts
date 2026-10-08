import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],

  // O projeto é ESM ("type": "module"), então os arquivos .ts são módulos ES.
  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },

  // Com "nodenext", o import aponta para o arquivo que existirá em runtime
  // (./person.service.js), mas nos testes o arquivo no disco é o .ts.
  // O TypeScript faz essa tradução sozinho; o resolver do Jest não.
  // Esta regra ensina ao Jest a mesma convenção do TypeScript.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage',
};

export default config;
