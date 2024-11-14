// jest.config.js
module.exports = {
    preset: 'ts-jest', // Use ts-jest to handle TypeScript files
    testEnvironment: 'jest-environment-jsdom', // Required for window, fetch, etc.
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleFileExtensions: ['js', 'ts', 'tsx'],
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest',
    },
};
