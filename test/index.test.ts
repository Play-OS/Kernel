// @ts-ignore
import { readFileSync } from 'fs';
import * as PlayOS from '../build/kernel';
import { TestProvider, fileStorage, keyStorage } from './TestProvider';

PlayOS.config.setConfig({
    processWorkerUrl: './build/process.worker.js',
});


describe('index', () => {
    const provider = new TestProvider();

    beforeEach(() => {
        provider.reset();
    });

    it('should be able to boot', async (done) => {
        const kernel = await PlayOS.bootKernel('TEST_SEED', provider);

        expect(kernel).toBeDefined();
        done();
    });

    it('should write to disk', async (done) => {
        const kernel = await PlayOS.bootKernel('TEST_SEED', provider);
        const bin = readFileSync('./test/bin/read-write.wasm');
        const process = await kernel.createProcess(bin, ['playos', '0x00000001', 'Key123', 'test'], {});

        // @ts-ignore
        process.on('exit', (code) => {
            expect(code).toBe(0);
            expect(fileStorage['/home/Key123']).toStrictEqual(new Uint8Array([116, 101, 115, 116]))
            done();
        });

        process.spawn();
    });

    it('should read from disk', async (done) => {
        const kernel = await PlayOS.bootKernel('TEST_SEED', provider);
        const bin = readFileSync('./test/bin/read-write.wasm');
        const process = await kernel.createProcess(bin, ['playos', '0x00000001', 'Key123', 'test'], {});

        // @ts-ignore
        process.on('exit', async (code) => {
            expect(code).toBe(0);
            expect(fileStorage['/home/Key123']).toStrictEqual(new Uint8Array([116, 101, 115, 116]));

            const readProcess = await kernel.createProcess(bin, ['playos', '0x00000002', 'Key123'], {});

            // @ts-ignore
            readProcess.on('message', (msg) => {
                console.log('[] msg -> ', msg);
            });

            // @ts-ignore
            readProcess.on('exit', (readCode) => {
                expect(readCode).toBe(0);
                done();
            });

            readProcess.spawn();
        });

        process.spawn();
    });
});
