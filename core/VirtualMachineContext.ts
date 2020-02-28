import { WasmFs } from "@wasmer/wasmfs";
import { EventEmitter } from "events";

import { workerRequest } from "../services/workerUtils";
import { waitAndLoad, reset } from '../services/sharedBufferUtils';
import { toHex } from "../services/hexUtils";
import createFsStats from "../services/createFsStats";
import { bytesToString } from "../services/stringToBytes";
import { ConsoleLevel } from '../models/Console';
import { PathLike } from "fs";

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
    return !!SKIP_FOLDERS.find(folder => path.startsWith(folder));
}

class VirtualMachineContext extends EventEmitter {
    wasmFs: WasmFs;
    notifierBuffer: SharedArrayBuffer;
    valuesBuffer: SharedArrayBuffer;
    openFiles: OpenFiles[] = [
        {
            fd: 0,
            path: '/dev/stdin'
        },
        {
            fd: 1,
            path: '/dev/stdout'
        },
        {
            fd: 2,
            path: '/dev/stderr'
        }
    ];

    constructor(wasmFs: WasmFs, notifierBuffer: SharedArrayBuffer, valuesBuffer: SharedArrayBuffer) {
        super();

        this.wasmFs = wasmFs;
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

        const originalReadSync = this.wasmFs.fs.readSync;
        this.wasmFs.fs.readSync = (...args: any[]) => {
            const fd: number = args[0];
            const isOpen = !!this.openFiles.find(openFile => openFile.fd === fd);

            if (isOpen) {
                // @ts-ignore
                return originalReadSync(...args);
            }

            const result = this.callMethodOnProcess('readSync', args);
            const inputBuffer: Buffer = args[1];

            inputBuffer.set(result, args[2]);

            return result.length;
        }

        const originalFsWriteSync = this.wasmFs.fs.writeSync;
        this.wasmFs.fs.writeSync = (...args: any[]) => {
            const fd: number = args[0];

            // Check if the folder is open in our worker
            const isOpen = !!this.openFiles.find(openFile => openFile.fd === fd);

            if (isOpen) {
                // @ts-ignore
                const result = originalFsWriteSync(...args);

                if (CONSOLE_FD.includes(fd)) {
                    if (fd === ConsoleLevel.LOG) {
                        this.emit('message', bytesToString(args[1]));
                    } else if (fd === ConsoleLevel.ERROR) {
                        this.emit('error', bytesToString(args[1]));
                    }
                }

                return result;
            }

            const result = this.callMethodOnProcess('writeSync', args);
            return parseInt(toHex(result), 16);
        }

        const originalOpenSync = this.wasmFs.fs.openSync;
        this.wasmFs.fs.openSync = (...args: any[]) => {
            const path: string = args[0];

            if (isInSkipFolder(path)) {
                // @ts-ignore
                const fd = originalOpenSync(...args);

                this.openFiles.push({
                    fd,
                    path,
                });

                return fd;
            }

            const newFs = this.callMethodOnProcess('openSync', args);
            return parseInt(toHex(newFs), 16);
        }

        this.wasmFs.fs.closeSync = (...args: any[]) => {
            this.callMethodOnProcess('closeSync', args);
        }

        // @ts-ignore
        this.wasmFs.fs.statSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('statSync', args);
            console.log('[] result, args -> ', result.toString(), args);
            return createFsStats(JSON.parse(result.toString()));
        }

        const originalFstatSync = this.wasmFs.fs.fstatSync;
        // @ts-ignore
        this.wasmFs.fs.fstatSync = (...args: any[]) => {
            const fd: number = args[0];
            const isOpen = !!this.openFiles.find(openFile => openFile.fd === fd);

            if (isOpen) {
                // @ts-ignore
                return originalFstatSync(...args);
            }

            const result = this.callMethodOnProcess('fstatSync', args);
            return createFsStats(JSON.parse(result.toString()));
        }

        const originalRealPathSync = this.wasmFs.fs.realpathSync;
        this.wasmFs.fs.realpathSync = (...args: any[]) => {
            const path: string = args[0];

            if (isInSkipFolder(path)) {
                // @ts-ignore
                return originalRealPathSync(...args);
            }

            const result = this.callMethodOnProcess('realpathSync', args);

            if (!args[1] || (args[1] && args[1].encoding === 'utf8')) {
                return result.toString();
            }

            return result;
        }

        const originalReadFileSync = this.wasmFs.fs.readFileSync;
        // @ts-ignore
        this.wasmFs.fs.readFileSync = (...args: any[]) => {
            const filePath: string = args[0];

            if (isInSkipFolder(filePath)) {
                // @ts-ignore
                return originalReadFileSync(...args);
            }

            const result = this.callMethodOnProcess('readFileSync', args);

            if (!args[1] || args[1] === 'utf8' || (args[1] && args[1].encoding === 'utf8')) {
                return result.toString();
            }

            return result;
        }

        const originalExistsSync = this.wasmFs.fs.existsSync;
        this.wasmFs.fs.existsSync = (path: PathLike) => {
            return originalExistsSync(path);
        }

        this.wasmFs.fs.readdirSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('readdirSync', args);

            if (!args[1] || args[1] === 'utf8' || (args[1] && !args[1].encoding) || (args[1] && args[1].encoding === 'utf8')) {
                return JSON.parse(result.toString());
            }

            return result;
        }
    }
}

export default VirtualMachineContext;
