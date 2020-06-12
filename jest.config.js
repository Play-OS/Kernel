const { jsWithTs: tsjPreset } = require('ts-jest/presets');

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        ...tsjPreset.transform,
    },
    testPathIgnorePatterns: [
        'resources/app/lib/',
    ],
};
