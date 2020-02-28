import * as Comlink from 'comlink';
import { EventEmitter } from 'events';

import KernelWorker from '../KernelWorker';
import { ProcessEnvOptions } from 'child_process';
import FileSystem from './FileSystem';
import { RequestMessage } from '../services/workerUtils';
import { storeAndNotify } from '../services/sharedBufferUtils';
import { numberToHex } from '../services/hexUtils';
import stringToBytes from '../services/stringToBytes';
// @ts-ignore
import createKernelWorker from 'workerize-loader?name=kernel-process!../KernelWorker'; // eslint-disable-line import/no-webpack-loader-syntax

class Process extends EventEmitter {
    args: string[];
    options?: ProcessEnvOptions;
    bin: Uint8Array;
    worker?: Comlink.Remote<KernelWorker>;
    workerRaw?: Worker;
    fs: FileSystem;

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
    constructor(fs: FileSystem, bin: Uint8Array, args: string[], options?: ProcessEnvOptions) {
        super();

        this.args = args;
        this.options = options;
        this.bin = bin;
        this.fs = fs;
    }

    async onWorkerMessage(event: any) {
        // Typescript checks
        if (!this.valuesBuffer || !this.notifierBuffer) {
            throw new Error('Worker message was called without spawn()');
        }

        const message: RequestMessage = event.data;

        if (!message.type || !message.type.startsWith('context::') || !message.bufferIndex) {
            return;
        }

        const methodToCall = message.type.replace('context::', '');
        let result: any = null;

        if (methodToCall === 'readSync') {
            // @ts-ignore
            const bytesRead = await this.fs.read(...message.value);
            const position = message.value[4] === null ? 0 : message.value[4];
            const inputBuffer = new Uint8Array(message.value[1]);
            result = inputBuffer.slice(position, bytesRead);
        } else if (methodToCall === 'readFileSync') {
            // @ts-ignore
            result = await this.fs.readFile(...message.value);
        } else if (methodToCall === 'message') {
            this.emit('message', message.value);
        } else if (methodToCall === 'error') {
            this.emit('error', message.value);
        } else {
            result = this.fs.wasmFs.fs[methodToCall].call(this, ...message.value);
        }

        let bufferResult: Buffer | null = null;

        if (result instanceof Uint8Array) {
            bufferResult = Buffer.from(result);
        } else if (typeof result === 'number') {
            bufferResult = Buffer.from(numberToHex(result), 'hex');
        } else if (typeof result === 'object') {
            bufferResult = Buffer.from(stringToBytes(JSON.stringify(result)));
        } else if (typeof result === 'string') {
            bufferResult = Buffer.from(stringToBytes(result));
        }

        if (bufferResult) {
            const dataLength = bufferResult.length;
            const u8ValuesBuffer = new Uint8Array(this.valuesBuffer);

            // Clear the shared values
            u8ValuesBuffer.fill(0, 0, u8ValuesBuffer.length);

            // The first 4 bytes are the length of the data (32-bit integer)
            u8ValuesBuffer.set(Buffer.from(numberToHex(dataLength, 8), 'hex'));

            // Skip 4 bytes and write the leading values.
            u8ValuesBuffer.set(bufferResult, 4);
        }

        // Notify the buffer that we are done writing and it can continue
        storeAndNotify(this.notifierBuffer, message.bufferIndex, 1)
    }

    async spawn(): Promise<string> {
        const worker: Worker = createKernelWorker();
        this.workerRaw = worker;
        this.worker = Comlink.wrap<KernelWorker>(worker);

        const canvas: HTMLCanvasElement | null = document.querySelector('#windowCanvas');

        if (!canvas) {
            throw new Error('Could not run process without canvas');
        }

        const offscreenCanvas = canvas.transferControlToOffscreen();
        // @ts-ignore
        const transferableCanvas = Comlink.transfer(offscreenCanvas, [offscreenCanvas]);
        await this.worker.setCanvas(transferableCanvas);

        const preparedResult = await this.worker.prepare(this.bin, this.args, this.options);

        this.valuesBuffer = preparedResult.valuesBuffer;
        this.notifierBuffer = preparedResult.notifierBuffer;

        worker.addEventListener('message', this.onWorkerMessage.bind(this));

        // const output = await this.worker.spawn();
        const fsOutput = await this.fs.wasmFs.getStdOut() as string;
        return fsOutput;
    }
}

export default Process;
