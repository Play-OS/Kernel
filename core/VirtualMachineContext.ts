import { WasmFs } from "@wasmer/wasmfs";
import * as Logger from 'js-logger';
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
            console.debug('⚙️ Calling readSync', args);
            const result = this.callMethodOnProcess('readSync', args);
            const inputBuffer: Buffer = args[1];

            inputBuffer.set(result, args[2]);

            return result.length;
        }

        this.wasmFs.fs.writeSync = (...args: any[]) => {
            console.debug('⚙️ Calling writeSync', args);
            const result = this.callMethodOnProcess('writeSync', args);
            return parseInt(toHex(result), 16);
        }

        this.wasmFs.fs.openSync = (...args: any[]) => {
            console.debug('⚙️ Calling openSync', args);
            const newFs = this.callMethodOnProcess('openSync', args);
            return parseInt(toHex(newFs), 16);
        }

        this.wasmFs.fs.closeSync = (...args: any[]) => {
            console.debug('⚙️ Calling closeSync', args);
            this.callMethodOnProcess('closeSync', args);
        }

        // @ts-ignore
        this.wasmFs.fs.statSync = (...args: any[]) => {
            console.debug('⚙️ Calling statSync', args);
            const result = this.callMethodOnProcess('statSync', args);
            return createFsStats(JSON.parse(result.toString()));
        }

        // @ts-ignore
        this.wasmFs.fs.fstatSync = (...args: any[]) => {
            console.debug('⚙️ Calling fstatSync', args);
            const result = this.callMethodOnProcess('fstatSync', args);
            return createFsStats(JSON.parse(result.toString()));
        }

        this.wasmFs.fs.realpathSync = (...args: any[]) => {
            console.debug('⚙️ Calling realpathSync', args);
            const result = this.callMethodOnProcess('realpathSync', args);

            if (!args[1] || (args[1] && args[1].encoding === 'utf8')) {
                return result.toString();
            }

            return result;
        }

        // @ts-ignore
        this.wasmFs.fs.readFileSync = (...args: any[]) => {
            console.debug('⚙️ Calling readFileSync', args);
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

        this.wasmFs.fs.readdirSync = (...args: any[]) => {
            const result = this.callMethodOnProcess('readdirSync', args);
            console.debug('⚙️ Calling readdirSync', args);

            if (!args[1] || args[1] === 'utf8' || (args[1] && !args[1].encoding) || (args[1] && args[1].encoding === 'utf8')) {
                return JSON.parse(result.toString());
            }

            return result;
        }
    }
}

export default VirtualMachineContext;
