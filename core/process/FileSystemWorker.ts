import * as Comlink from 'comlink';
import { EventEmitter } from 'events';
import FileSystem from '../FileSystem';
import Registry from '../Registry';
import IKernelProvider from '../../interfaces/IKernelProvider';
import { bytesToString } from '../../services/stringToBytes';
import attachMethodsToMessages from './helpers/attachMethodsToMessages';
import { createTargetedPostMessageInstance } from './helpers/postWorkerMessage';
import { postMethodResultLengthToProcess } from './helpers/processMethodCalling';
import convertToBuffer from '../../services/convertToBuffer';
import { storeAndNotify } from '../../services/sharedBufferUtils';

export enum FileSystemWorkerTypes {
    Init = 'FSW:Init',
}

interface InitParams {
    provider: IKernelProvider;
}

const PROCESS_TARGET_NAME = 'process';
const FS_TARGET_NAME = 'fileSystem';

function initFileSystemWorker(params: InitParams) {
    console.log('Hey!', params.provider.storageGet('hi'));
}

// eslint-disable-next-line no-restricted-globals
self.addEventListener('message', (message: MessageEvent) => {
    switch(message.data.type) {
        case FileSystemWorkerTypes.Init:
            initFileSystemWorker(message.data.value);
        break;
    }
});

export default class FileSystemWorker extends EventEmitter {
    fs?: FileSystem;

    provider: IKernelProvider;

    writeBuffer?: SharedArrayBuffer;

    notifierBuffer?: SharedArrayBuffer;

    methodCallResult?: Buffer;

    constructor(params: any, provider: IKernelProvider) {
        super();

        this.provider = provider;
    }

    async init() {
        this.fs = await FileSystem.create(new Registry({}, this.provider), this.provider);
        this.fs.on('message', (message: Uint8Array) => this.emit('message', bytesToString(message)));

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
        const method = this.fs?.wasmFs.fs[methodName];

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

export async function spawnFileSystem(params: any, provider: IKernelProvider) {
    const fs = new FileSystemWorker(params, provider);
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
