import { WasmFs } from "@wasmer/wasmfs";
import { TFilePath, TFlags, IReaddirOptions, TFileId, IReadFileOptions } from "memfs/lib/volume";
import { workerRequest } from "../services/workerUtils";
import { waitAndLoad, reset } from '../services/sharedBufferUtils';
import { toHex } from "../services/hexUtils";
import createFsStats from "../services/createFsStats";

interface OpenFiles {
    fd: number;
    path: string;
    buffer?: Buffer;
}

class VirtualMachineContext {
    wasmFs: WasmFs;
    notifierBuffer: SharedArrayBuffer;
    valuesBuffer: SharedArrayBuffer;
    openFiles: OpenFiles[] = [];

    constructor(wasmFs: WasmFs, notifierBuffer: SharedArrayBuffer, valuesBuffer: SharedArrayBuffer) {
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

        this.wasmFs.fs.readSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('readSync', args);
            return parseInt(toHex(result), 16);
        }

        this.wasmFs.fs.writeSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('writeSync', args);
            return parseInt(toHex(result), 16);
        }

        this.wasmFs.fs.openSync = (...args: any[]) => {
            const newFs = this.callMethodOnProcess('openSync', args);
            return parseInt(toHex(newFs), 16);
        }

        this.wasmFs.fs.closeSync = (...args: any[]) => {
            this.callMethodOnProcess('closeSync', args);
        }

        // @ts-ignore
        this.wasmFs.fs.statSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('statSync', args);
            return createFsStats(JSON.parse(result.toString()));
        }

        // @ts-ignore
        this.wasmFs.fs.fstatSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('fstatSync', args);
            return createFsStats(JSON.parse(result.toString()));
        }

        this.wasmFs.fs.realpathSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('realpathSync', args);

            if (!args[1] || (args[1] && args[1].encoding === 'utf8')) {
                return result.toString();
            }

            return result;
        }

        // @ts-ignore
        this.wasmFs.fs.readFileSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('readFileSync', args);

            if (!args[1] || args[1] === 'utf8' || (args[1] && args[1].encoding === 'utf8')) {
                return result.toString();
            }

            return result;
        }

        const originalExistsSync = this.wasmFs.fs.existsSync;
        this.wasmFs.fs.existsSync = (path: TFilePath) => {
            console.log('[EXISTS] path -> ', path);
            return originalExistsSync(path);
        }

        const originalReadDirSync = this.wasmFs.fs.readdirSync;
        this.wasmFs.fs.readdirSync = (path: TFilePath, options: string | IReaddirOptions) => {
            console.log('[READDIR] path -> ', path);

            return originalReadDirSync(path, options);
        }
    }
}

export default VirtualMachineContext;
