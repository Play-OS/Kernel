import { WASI } from '@wasmer/wasi/lib/index';
import wasiBrowserBindings from '../services/wasiBrowserBindings';
// @ts-ignore
import { lowerI64Imports } from "@wasmer/wasm-transformer";
import { WasmFs } from '@wasmer/wasmfs';
import isNodeJs from '../services/isNodeJs';
import createWasiBindings from '../services/wasiBrowserBindings';

class VirtualMachine {
    private wasmFs: WasmFs;

    constructor(wasmFs: WasmFs) {
        this.wasmFs = wasmFs;
    }

    /**
     * Prepares a binary for executing on JavaScript.
     * This includes converting 64bit integeres aswell as metering calls
     *
     * @todo Replace the loweri64imports with a custom function due unnecasary package includes
     * @param {Buffer} bin
     * @returns {Buffer} The converted binary
     * @memberof VirtualMachine
     */
    async prepareBin(bin: Uint8Array): Promise<Uint8Array> {
        if (!isNodeJs()) {
            return lowerI64Imports(bin);
        } else {
            // @ts-ignore
            return __non_webpack_require__('@wasmer/wasm-transformer').lowerI64Imports(bin);
        }
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
                ...createWasiBindings(),
                fs: this.wasmFs.fs,
                // @ts-ignore
                abort: (msgPtr: number, filePtr: number, line: number, column: number) => {
                    console.log(`⛔️ An error occured while running the assembly ${line}:${column}`);
                }
            }
        });

        const wasmBytes = bin.buffer;
        const { instance } = await WebAssembly.instantiate(wasmBytes, {
            wasi_unstable: wasi.wasiImport,
            wasi_snapshot_preview1: wasi.wasiImport,
        });

        wasi.start(instance);
    }
}

export default VirtualMachine;
