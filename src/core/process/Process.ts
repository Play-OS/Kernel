import { EventEmitter } from 'events';

import { ProcessEnvOptions } from 'child_process';
import IKernelProvider from '../../interfaces/IKernelProvider';
import { appConfig } from '../Configuration';
import { createWorker, addEventListenerOnWorker, postMessageOnWorker, extractMessageFromEvent } from '../../services/workerUtils';
import { MessageType, RequestMessage } from '../../models/WorkerMessage';
import { ProcessWorkerParams } from '../../process.worker';
import { ProcessMessageHandler } from './helpers/processProviderMessageHandler';

class Process extends EventEmitter {
    args: string[];
    options?: ProcessEnvOptions;
    bin: Uint8Array;
    pid: number;
    provider: IKernelProvider;

    private notifierBuffer: SharedArrayBuffer;
    private processWorker?: Worker;
    private processMessageHandler: ProcessMessageHandler;

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
        this.notifierBuffer = new SharedArrayBuffer(16);
        this.processMessageHandler = new ProcessMessageHandler(provider, this.notifierBuffer);
    }

    /**
     * Listens for messages in the process.worker.ts
     *
     * @private
     * @param {MessageEvent} event
     * @memberof Process
     */
    private handleWorkerMessage(event: MessageEvent) {
        const data: RequestMessage<any> = extractMessageFromEvent<any>(event);

        if (data.type === MessageType.Provider) {
            this.processMessageHandler.handleProviderMessage(data);
        } else if (data.type === MessageType.Message) {
            this.emit('message', data.value);
        } else if (data.type === MessageType.Exit) {
            this.emit('exit', data.value);
            // this.processWorker?.terminate();
        }
    }

    /**
     * Spawns a worker that will run the WASM file
     *
     * @returns {Promise<void>}
     * @memberof Process
     */
    async spawn(): Promise<void> {
        try {
            this.processWorker = createWorker(appConfig.processWorkerUrl);
            this.processMessageHandler.worker = this.processWorker;

            addEventListenerOnWorker(this.processWorker, 'message', this.handleWorkerMessage.bind(this));
            postMessageOnWorker<ProcessWorkerParams>(this.processWorker, {
                type: MessageType.Spawn,
                value: {
                    args: this.args,
                    binary: this.bin,
                    options: this.options,
                    notifyBuffer: this.notifierBuffer,
                },
            });
        } catch (error) {
            console.error('[Process.spawn]', error);
        }
    }
}

export default Process;
