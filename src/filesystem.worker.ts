import * as Comlink from 'comlink';
import { EventEmitter } from 'events';
import FileSystem from './core/FileSystem';
import Registry from './core/Registry';
import IKernelProvider from './interfaces/IKernelProvider';
import { bytesToString } from './services/stringToBytes';
import attachMethodsToMessages from './core/process/helpers/attachMethodsToMessages';
import { createTargetedPostMessageInstance } from './core/process/helpers/postWorkerMessage';
import { postMethodResultLengthToProcess } from './core/process/helpers/processMethodCalling';
import convertToBuffer from './services/convertToBuffer';
import { storeAndNotify } from './services/sharedBufferUtils';
import attachIoDevicesToFs from './core/process/ProcessIoDevices';

export enum FileSystemWorkerTypes {
    Init = 'FSW:Init',
}

interface Params {
    canvas: OffscreenCanvas;
}

const PROCESS_TARGET_NAME = 'process';
const FS_TARGET_NAME = 'fileSystem';

export default class FileSystemWorker extends EventEmitter {
    fs?: FileSystem;

    provider: IKernelProvider;

    writeBuffer?: SharedArrayBuffer;

    notifierBuffer?: SharedArrayBuffer;

    methodCallResult?: Buffer;

    canvas: OffscreenCanvas;

    constructor(params: Params, provider: IKernelProvider) {
        super();

        this.canvas = params.canvas;
        this.provider = provider;
    }

    async init() {
        this.fs = await FileSystem.create(new Registry({}, this.provider), this.provider);
        this.fs.on('message', (message: Uint8Array) => this.emit('message', bytesToString(message)));

        // attachIoDevicesToFs(this.fs.wasmFs, this.canvas);

        attachMethodsToMessages(FS_TARGET_NAME, [
            this.getFsMapping.bind(this),
            this.writeMethodResultToBuffer.bind(this),
            this.setNotifierBuffer.bind(this),
            this.callMethodOnFs.bind(this),
        ]);
    }

    getFsMapping() {
        return this.fs?.wasmFs.toJSON();
    }

    writeMethodResultToBuffer(buffer: SharedArrayBuffer) {
        if (!this.methodCallResult || !this.notifierBuffer) {
            throw new Error('Panic, no method result found but it was requested');
        }

        const u8WriteBuffer = new Uint8Array(buffer);
        u8WriteBuffer.set(this.methodCallResult);
        storeAndNotify(this.notifierBuffer, 0, 1);
    }

    setNotifierBuffer(buffer: SharedArrayBuffer) {
        this.notifierBuffer = buffer;
    }

    async callMethodOnFs(methodName: string, ...args: any[]) {
        // @ts-ignore
        const method: any = this.fs?.wasmFs.fs[methodName];

        if (!this.notifierBuffer) {
            throw new Error('Could not call methods without a notifier');
        }

        if (!method) {
            console.warn(`[callMethodOnFs] Missing method ${methodName}, aborting..`);
            return;
        }

        const result = await method.apply(method, args);

        if (result) {
            const resultBuffer = convertToBuffer(result);
            this.methodCallResult = resultBuffer;
        } else {
            this.methodCallResult = Buffer.from([]);
        }

        // Tell the process the length of the file
        postMethodResultLengthToProcess(this.methodCallResult, this.notifierBuffer);
    }
}

export async function spawnFileSystem(params: any, provider: IKernelProvider, canvas: OffscreenCanvas) {
    const fs = new FileSystemWorker({
        ...params,
        // canvas,
    }, provider);
    await fs.init();
    return Comlink.proxy(fs);
}

export interface ComlinkFileSystemWorkerMethods {
    FileSystemWorker: FileSystemWorker,
    spawnFileSystem: (params: any, provider: IKernelProvider) => Promise<FileSystemWorker>
}

Comlink.expose({
    spawnFileSystem,
});
