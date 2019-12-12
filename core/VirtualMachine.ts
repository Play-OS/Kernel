import { WASI } from '@wasmer/wasi';
// @ts-ignore
import { lowerI64Imports } from "@wasmer/wasm-transformer/lib/unoptimized/wasm-transformer.esm";
import FileSystem from './FileSystem';

class VirtualMachine {
    private fs: FileSystem;

    constructor(fs: FileSystem) {
        this.fs = fs;
    }

    /**
     * Prepares a binary for executing on JavaScript.
     * This includes converting 64bit integeres aswell as converting synchronous
     * calls to asynchronous.
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
                    fs: this.fs.wasmFs.fs,
                }
            });

            const wasmBytes = bin.buffer;

            const { instance } = await WebAssembly.instantiate(wasmBytes, {
                wasi_unstable: wasi.wasiImport,
            });

            wasi.start(instance);

            const stdout = await this.fs.wasmFs.getStdOut();

            return stdout as string;
        } catch (error) {
            const output = await this.fs.wasmFs.getStdOut()

            console.error(`⛔️ An error occured while running a binary`, error);
            console.error(`⛔️ Output of StdOut after crash`, output);

            return output as string;
        }
    }
}

export default VirtualMachine;
