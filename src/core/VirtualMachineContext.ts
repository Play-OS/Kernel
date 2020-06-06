import { WasmFs } from "@wasmer/wasmfs";
import { EventEmitter } from "events";

import { workerRequest } from "../services/workerUtils";
import { waitAndLoad, reset } from '../services/sharedBufferUtils';
import { toHex } from "../services/hexUtils";
import createFsStats from "../services/createFsStats";
import { bytesToString } from "../services/stringToBytes";
import { ConsoleLevel } from '../models/Console';
import { PathLike } from "fs";
import { FsMapping } from "./FileSystem";

interface OpenFiles {
    fd: number;
    path: string;
    buffer?: Buffer;
}

const SKIP_FOLDERS = [
    '/_wasmer',
    '/dev',
];

const CONSOLE_FD = [
    0,
    1,
    2,
];

function isInSkipFolder(path: string): boolean {
    return !!SKIP_FOLDERS.find((folder) => path.startsWith(folder));
}

class VirtualMachineContext extends EventEmitter {
    wasmFs: WasmFs;

    notifierBuffer: SharedArrayBuffer;

    valuesBuffer: SharedArrayBuffer;

    openFiles: OpenFiles[] = [];

    fsMapping: FsMapping;

    constructor(wasmFs: WasmFs, fsMapping: FsMapping, notifierBuffer: SharedArrayBuffer, valuesBuffer: SharedArrayBuffer) {
        super();

        this.wasmFs = wasmFs;
        this.fsMapping = fsMapping;
        this.notifierBuffer = notifierBuffer;
        this.valuesBuffer = valuesBuffer;
        this.attachFsToContext();
    }

    /**
     * Calls a method on the process, this is usually used for drawing, fs interactions, etc.
     *
     * @param {string} method
     * @param {any[]} [args]
     * @returns
     * @memberof VirtualMachineContext
     */
    callMethodOnProcess(method: string, args?: any[]) {
        console.log('[callMethodOnProcess] method -> ', method);
        workerRequest({
            type: `context::${method}`,
            value: args || [],
            bufferIndex: 0,
        }, false);

        // Waits on the request to be completed in a synchronous matter
        waitAndLoad(this.notifierBuffer, 0);
        reset(this.notifierBuffer, 0);

        // Fetch the value from the shared value buffer
        const u8ValueBuffer = new Uint8Array(this.valuesBuffer);
        const lengthHex = '0x' + toHex(u8ValueBuffer.slice(0, 4));
        const length = parseInt(lengthHex);
        const slicedValue = u8ValueBuffer.slice(4, length + 4);
        const valueBuffer = Buffer.from(slicedValue);

        return valueBuffer;
    }

    callFileMethodOnProcess(method: string, args?: any[]) {
        workerRequest({
            type: `file::${method}`,
            value: args || [],
            bufferIndex: 0,
        }, false);

        waitAndLoad(this.notifierBuffer, 0);
        reset(this.notifierBuffer, 0);

        // Fetch the value from the shared value buffer
        return new Uint8Array(this.valuesBuffer);
    }

    attachFsToContext() {
        // TODODODODODOODODODODODODODODODOD
        // YOU MIGHT RATHER WANT TO TRANSFER THE MAPPING SINCE ITS MUCH SIMPELER TO WORK WITH THAN SYNCING BACK AND FORWARD
        // OR OTHERWISE CHECK WHAT CAT IS CALLING

        //  Object.keys(this.wasmFs.fs).forEach((key) => {
        //     const originalFunction = this.wasmFs.fs[key];

        //     this.wasmFs.fs[key] = (...args: any[]) => {
        //         // console.log('[] originalFunction -> ', originalFunction);
        //         console.log('!!!!! Not implemented: ', key, args);
        //         return originalFunction.call(this, ...args);
        //     }
        // });

        // const originalReadSync = this.wasmFs.fs.readSync;
        // this.wasmFs.fs.readSync = (...args: any[]) => {
        //     console.log('[Readsync] args -> ', args, this.openFiles);
        //     // @ts-ignore
        //     return originalReadSync(...args);
        // };

        const originalFsWriteSync = this.wasmFs.fs.writeSync;
        this.wasmFs.fs.writeSync = (...args: any[]) => {
            const fd: number = args[0];

            if (CONSOLE_FD.includes(fd)) {
                if (fd === ConsoleLevel.LOG) {
                    console.log('[message] args[1] -> ', bytesToString(args[1]));
                    this.emit('message', bytesToString(args[1]));
                } else if (fd === ConsoleLevel.ERROR) {
                    console.log('[error] args[1] -> ', bytesToString(args[1]));
                    this.emit('error', bytesToString(args[1]));
                }
            }

            // @ts-ignore
            return originalFsWriteSync(...args);
        };

        const originalOpenSync = this.wasmFs.fs.openSync;
        // @ts-ignore
        this.wasmFs.fs.openSync = (...args: any[]) => {
            const path: string = args[0];

            if (path !== '/' && !path.startsWith('/_wasmer') && !path.startsWith('/dev')) {
                console.log('[OpenSync] path -> ', path, this.fsMapping);
                const buffer: any = this.callFileMethodOnProcess('fetchFile', [path]);
                const mapping = this.wasmFs.toJSON();
                mapping[path] = buffer;
                console.log('[] mapping -> ', mapping);
                this.wasmFs.fromJSONFixed(this.wasmFs.volume, mapping);
            }


            // @ts-ignore
            const fd = originalOpenSync(...args);

            if (!isInSkipFolder(path)) {
                this.openFiles.push({
                    fd,
                    path,
                });

                return fd;
            }

            return fd;
            // const newFs = this.callMethodOnProcess('openSync', args);
            // return parseInt(toHex(newFs), 16);
        };

        // const originalReadFileSync = this.wasmFs.fs.readFileSync;
        // // @ts-ignore
        // this.wasmFs.fs.readFileSync = (...args: any[]) => {
        //     console.log('[readFileSync] args -> ', args);
        //     const filePath: string = args[0];



        //     if (isInSkipFolder(filePath)) {
        //         // @ts-ignore
        //         return originalReadFileSync(...args);
        //     }

        //     const result = this.callMethodOnProcess('readFileSync', args);

        //     if (!args[1] || args[1] === 'utf8' || (args[1] && args[1].encoding === 'utf8')) {
        //         return result.toString();
        //     }

        //     return result;
        // };
    }
}

export default VirtualMachineContext;
