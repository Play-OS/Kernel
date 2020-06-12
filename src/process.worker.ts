import * as Comlink from 'comlink';
import { ProcessEnvOptions } from 'child_process';
import FileSystem from './core/FileSystem';
import IKernelProvider from './interfaces/IKernelProvider';
import Registry from './core/Registry';
import VirtualMachine from './core/VirtualMachine';
import { EventEmitter } from 'events';
import { bytesToString } from './services/stringToBytes';
import FileSystemWorker from './filesystem.worker';
import createVirtualFs from './core/process/ProcessVirtualFs';
import { WasmFs } from '@wasmer/wasmfs';
import postWorkerMessage from './core/process/helpers/postWorkerMessage';
import { DirectoryJSON } from 'memfs/lib/volume';
import attachIoDevicesToFs from './core/process/ProcessIoDevices';
import { exposeWithComlink } from './services/workerUtils';

export interface ProcessWorkerParams {
    binary: Uint8Array;
    args: string[];
    options?: ProcessEnvOptions;
}

export class ProcessWorker extends EventEmitter {
    binary: Uint8Array;

    args: string[];

    options?: ProcessEnvOptions;

    provider: IKernelProvider;

    fs?: FileSystem;

    constructor(params: ProcessWorkerParams, provider: IKernelProvider) {
        super();

        this.binary = params.binary;
        this.args = params.args;
        this.options = params.options;
        this.provider = provider;
    }

    async spawn() {
        try {
            this.fs = await FileSystem.create(new Registry({}, this.provider), this.provider);
            this.fs.on('message', (message: Uint8Array) => this.emit('message', bytesToString(message)));

            const vm = new VirtualMachine(this.fs.wasmFs);
            const preparedBinary = await vm.prepareBin(this.binary);
            await vm.execute(preparedBinary, this.args, this.options);

            this.emit('exit', 0);
        } catch (error) {
            if (error.code === 0) {
                this.emit('exit', 0);
                return;
            }

            console.error('[Process exited]', error);
            console.error('[Process exited]', await this.fs?.wasmFs.getStdOut());
            this.emit('exit', 1);
        }
    }
}

export async function spawnProcessWorker(params: ProcessWorkerParams, provider: IKernelProvider): Promise<ProcessWorker> {
    const processWorker = new ProcessWorker({
        ...params,
    }, provider);
    return Comlink.proxy(processWorker);
}

export interface ComlinkProcessWorkerMethods {
    spawnProcessWorker: (params: ProcessWorkerParams, provider: IKernelProvider) => Promise<ProcessWorker>
}

exposeWithComlink({
    spawnProcessWorker,
});
