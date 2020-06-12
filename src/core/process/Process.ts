import * as Comlink from 'comlink';
import { EventEmitter } from 'events';

import { ProcessEnvOptions } from 'child_process';
// // @ts-ignore
// import createProcessWorker from 'workerize-loader?inline!./ProcessWorker'; // eslint-disable-line import/no-webpack-loader-syntax
// // @ts-ignore
// import createFileSystemWorker from 'workerize-loader?inline!./FileSystemWorker'; // eslint-disable-line import/no-webpack-loader-syntax
import { ComlinkFileSystemWorkerMethods } from '../../filesystem.worker';
import { ComlinkProcessWorkerMethods } from '../../process.worker';
import IKernelProvider from '../../interfaces/IKernelProvider';
import redirectWorkerMessages from './helpers/redirectWorkerMessages';
import { appConfig } from '../Configuration';
import { createWorker, wrapWithComlink } from '../../services/workerUtils';

class Process extends EventEmitter {
    args: string[];
    options?: ProcessEnvOptions;
    bin: Uint8Array;
    pid: number;
    provider: IKernelProvider;

    private notifierBuffer?: SharedArrayBuffer;
    private valuesBuffer?: SharedArrayBuffer;

    /**
     * Creates an instance of Process.
     *
     * @param {Uint8Array} bin WASM Binary to launc
     * @param {string[]} args Arguments to give to the binary
     * @param {ProcessOptions} [options] optional options
     * @memberof Process
     */
    constructor(provider: IKernelProvider, bin: Uint8Array, args: string[], pid: number, options?: ProcessEnvOptions) {
        super();

        this.args = args;
        this.options = options;
        this.bin = bin;
        this.pid = pid;
        this.provider = provider;
    }

    async spawn(): Promise<void> {
        try {
            const createdProcessWorker = createWorker(appConfig.processWorkerUrl);
            const processWorker = wrapWithComlink<ComlinkProcessWorkerMethods>(createdProcessWorker);

            const spawnedProcessWorker = await processWorker.spawnProcessWorker({
                args: this.args,
                binary: this.bin,
                options: this.options,
            }, Comlink.proxy(this.provider));

            spawnedProcessWorker.on('exit', Comlink.proxy((code: number) => {
                this.emit('exit', code);
                createdProcessWorker.terminate();
            }));

            spawnedProcessWorker.on('message', Comlink.proxy((message: string) => {
                this.emit('message', message);
            }));

            await spawnedProcessWorker.spawn();
        } catch (error) {
            console.error('[Process.spawn]', error);
        }
    }
}

export default Process;
