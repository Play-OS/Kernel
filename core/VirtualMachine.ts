import { WASI } from '@wasmer/wasi';
import * as Comlink from 'comlink';
// @ts-ignore
import { lowerI64Imports } from "@wasmer/wasm-transformer";
import FileSystem from './FileSystem';
import KernalWorker from '../KernelWorker';
import { WasmFs } from '@wasmer/wasmfs';

class VirtualMachine {
    private wasmFs: WasmFs;
    private kernalWorker: Comlink.Remote<KernalWorker>;

    constructor(wasmFs: WasmFs) {
        this.wasmFs = wasmFs;
    }

    /**
     * Prepares a binary for executing on JavaScript.
     * This includes converting 64bit integeres aswell as metering calls
     *
     * @param {Buffer} bin
     * @returns {Buffer} The converted binary
     * @memberof VirtualMachine
     */
    async prepareBin(bin: Uint8Array): Promise<Uint8Array> {
        const loweredBinary = await lowerI64Imports(bin);

        return loweredBinary;
    }

    async execute(bin: Uint8Array, args: string[] = [], env: any = {}): Promise<string> {
        try {
            const wasi = new WASI({
                preopenDirectories: {
                    '/': '/',
                },
                args,
                env,
                bindings: {
                    ...WASI.defaultBindings,
                    fs: this.wasmFs.fs,
                }
            });

            const wasmBytes = bin.buffer;

            const { instance } = await WebAssembly.instantiate(wasmBytes, {
                wasi_unstable: wasi.wasiImport,
            });

            wasi.start(instance);

            const stdout = await this.wasmFs.getStdOut();

            return stdout as string;
        } catch (error) {
            const output = await this.wasmFs.getStdOut()

            console.error(`⛔️ An error occured while running a binary`, error);
            console.error(`⛔️ Output of StdOut after crash`, output);

            return output as string;
        }
    }
}

export default VirtualMachine;
