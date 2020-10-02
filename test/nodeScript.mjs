import { readFileSync } from 'fs';
import PlayOS from '../build/kernel.js';

PlayOS.config.setConfig({
    processWorkerUrl: '../build/process.worker.js',
});

// const TEST_WASM = './bin/cowsay.wasm';
// const ARGS = ['cowsay', 'hello'];
const TEST_WASM = '../../PlayOS-core-v2/build/untouched.wasm';
const ARGS = ['playos', '0x00000001', 'Key123', 'Value123'];

const bin = readFileSync(TEST_WASM);
export const fileStorage = {};
export const keyStorage = {};

export const TestProvider = {
    async init() {

    },
    async fetchFile(id){
        return fileStorage[id];
    },
    async storageGet(key){
        return keyStorage[key];
    },
    async storageSet(key, value) {
        keyStorage[key] = value;
    },
    async storeFile(file, path) {
        const fileId = Math.random().toString();
        fileStorage[fileId] = file;
        return fileId;
    },
    async setMapping() {},
    setMappingListener() {},
};

async function run() {
    try {
        const kernel = await PlayOS.bootKernel('N_A', TestProvider);
        const process = await kernel.createProcess(bin, ARGS, {});
        const output = [];

        process.on('message', (message) => {
            output.push(message);
        });

        process.on('exit', (code) => {
            console.log('[] fileStorage -> ', fileStorage);
            console.log({
                code,
                output,
            });
        });

        process.spawn();
    } catch (error) {
        console.error(error);
    }
}

run();

