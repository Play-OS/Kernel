import './polyfill';
import { ProcessEnvOptions, spawn } from 'child_process';
import FileSystem from './core/FileSystem';
import Registry from './core/Registry';
import VirtualMachine from './core/VirtualMachine';
import { EventEmitter } from 'events';
import { bytesToString } from './services/stringToBytes';
import { workerAddEventListener, workerPostMessage, extractMessageFromEvent } from './services/workerUtils';
import { RequestMessage, MessageType } from './models/WorkerMessage';
import WorkerMessageProvider from './provider/WorkerMessageProvider';

export interface ProcessWorkerParams {
    binary: Uint8Array;
    args: string[];
    options?: ProcessEnvOptions;
    notifyBuffer: SharedArrayBuffer;
}

export class ProcessWorker extends EventEmitter {
    binary: Uint8Array;
    args: string[];
    options?: ProcessEnvOptions;
    provider: WorkerMessageProvider;
    fs?: FileSystem;
    notifierBuffer?: SharedArrayBuffer;

    constructor(params: ProcessWorkerParams) {
        super();

        this.binary = params.binary;
        this.args = params.args;
        this.options = params.options;
        this.provider = new WorkerMessageProvider(params.notifyBuffer);
    }

    async spawn() {
        try {
            this.fs = await FileSystem.create(this.provider);
            this.fs.on('message', (message: Uint8Array) => this.emit('message', bytesToString(message)));

            const vm = new VirtualMachine(this.fs.wasmFs);
            const preparedBinary = await vm.prepareBin(this.binary);

            await vm.execute(preparedBinary, this.args, this.options);

            this.emit('exit', 0);
        } catch (error) {
            if (error?.code === 0) {
                this.emit('exit', 0);
                return;
            }

            console.error('[Process exited]', error);
            console.error('[Process exited]', await this.fs?.wasmFs.getStdOut());
            this.emit('exit', 1);
        }
    }
}

workerAddEventListener('message', (event: MessageEvent) => {
    const data = extractMessageFromEvent<ProcessWorkerParams>(event);

    if (data.type !== MessageType.Spawn) {
        return;
    }

    const processWorker = new ProcessWorker(data.value);

    // Tunnel through the process messages to the main thread
    processWorker.on('message', (message) => {
        workerPostMessage({
            type: MessageType.Message,
            value: message,
        });
    });

    processWorker.on('exit', (code: number) => {
        workerPostMessage({
            type: MessageType.Exit,
            value: code,
        });
    });

    processWorker.spawn();
});
