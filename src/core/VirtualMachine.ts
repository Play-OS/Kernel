import { WASI } from '@wasmer/wasi';
// @ts-ignore
// import { lowerI64Imports } from "@wasmer/wasm-transformer";
import { WasmFs } from '@wasmer/wasmfs';

class VirtualMachine {
    private wasmFs: WasmFs;

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
        // const loweredBinary = await lowerI64Imports(bin);

        return bin;
    }

    async execute(bin: Uint8Array, args: string[] = [], env: any = {}): Promise<void> {
        const wasi = new WASI({
            preopenDirectories: {
                '/': '/',
            },
            args,
            env: {
                ...env,
                CWD: '/',
                $CWD: '/',
                PWD: '/',
                $PWD: '/',
                PATH: '/',
                $PATH: '/',
                LS_COLORS: 1,
            },
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
    }
}

export default VirtualMachine;