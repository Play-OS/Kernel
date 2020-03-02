import * as Comlink from 'comlink';
import { ProcessEnvOptions } from 'child_process';
import FileSystem from '../FileSystem';
import IKernelProvider from '../../interfaces/IKernelProvider';
import Registry from '../Registry';
import VirtualMachine from '../VirtualMachine';
import { EventEmitter } from 'events';

export interface ProcessWorkerParams {
    binary: Uint8Array;
    args: string[];
    options?: ProcessEnvOptions;
    canvas?: OffscreenCanvas;
}

export class ProcessWorker extends EventEmitter {
    binary: Uint8Array;

    args: string[];

    options?: ProcessEnvOptions;

    canvas?: OffscreenCanvas;

    provider: IKernelProvider;

    fs?: FileSystem;

    constructor(params: ProcessWorkerParams, provider: IKernelProvider) {
        super();

        this.binary = params.binary;
        this.args = params.args;
        this.options = params.options;
        this.canvas = params.canvas;
        this.provider = provider;
    }

    async init() {
        this.fs = await FileSystem.create(new Registry({}, this.provider), this.provider);
    }

    async spawn() {
        try {
            if (!this.fs) {
                throw new Error('File system was missing');
            }
            const vm = new VirtualMachine(this.fs.wasmFs);
            const preparedBinary = await vm.prepareBin(this.binary);
            const result = await vm.execute(preparedBinary, this.args, this.options);
            console.log('[] result -> ', result);
            this.emit('exit', 0);
        } catch (error) {
            console.error('[Process exited]', error);
            console.error('[Process exited]', await this.fs?.wasmFs.getStdOut());
            this.emit('exit', 1);
        }
    }
}

export async function spawnProcessWorker(params: ProcessWorkerParams, provider: IKernelProvider): Promise<ProcessWorker> {
    const processWorker = new ProcessWorker(params, provider);
    console.log('[] provider -> ', provider);
    await processWorker.init();
    return Comlink.proxy(processWorker);
}

export interface ComlinkProcessWorkerMethods {
    spawnProcessWorker: (params: ProcessWorkerParams, provider: IKernelProvider) => Promise<ProcessWorker>
}

Comlink.expose({
    spawnProcessWorker,
});
