const { jsWithTs: tsjPreset } = require('ts-jest/presets');

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    transform: {
        ...tsjPreset.transform,
    },
    testPathIgnorePatterns: [
        'resources/app/lib/',
    ],
};
