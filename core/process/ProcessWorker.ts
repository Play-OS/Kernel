import * as Comlink from 'comlink';
import { ProcessEnvOptions } from 'child_process';
import FileSystem from '../FileSystem';
import IKernelProvider from '../../interfaces/IKernelProvider';
import Registry from '../Registry';
import VirtualMachine from '../VirtualMachine';
import { EventEmitter } from 'events';
import { bytesToString } from '../../services/stringToBytes';
import FileSystemWorker from './FileSystemWorker';
import createVirtualFs from './ProcessVirtualFs';
import { WasmFs } from '@wasmer/wasmfs';
import postWorkerMessage from './helpers/postWorkerMessage';
import { DirectoryJSON } from 'memfs/lib/volume';

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

    fs?: WasmFs;

    constructor(params: ProcessWorkerParams, provider: IKernelProvider) {
        super();

        this.binary = params.binary;
        this.args = params.args;
        this.options = params.options;
        this.canvas = params.canvas;
        this.provider = provider;
    }

    async spawn() {
        try {
            this.fs = await createVirtualFs();
            const vm = new VirtualMachine(this.fs);
            const preparedBinary = await vm.prepareBin(this.binary);
            await vm.execute(preparedBinary, this.args, this.options);

            this.emit('exit', 0);
        } catch (error) {
            if (error.code === 0) {
                this.emit('exit', 0);
                return;
            }

            console.error('[Process exited]', error);
            console.error('[Process exited]', await this.fs?.getStdOut());
            this.emit('exit', 1);
        }
    }
}

export async function spawnProcessWorker(params: ProcessWorkerParams, provider: IKernelProvider): Promise<ProcessWorker> {
    const processWorker = new ProcessWorker(params, provider);
    return Comlink.proxy(processWorker);
}

export interface ComlinkProcessWorkerMethods {
    spawnProcessWorker: (params: ProcessWorkerParams, provider: IKernelProvider) => Promise<ProcessWorker>
}

Comlink.expose({
    spawnProcessWorker,
});
