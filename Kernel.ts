import Registry from './core/Registry';
import FileSystem from './core/FileSystem';
import IKernelProvider from './interfaces/IKernelProvider';
import VirtualMachine from './core/VirtualMachine';
import Encryption from './core/Encryption';
import WasmParser from './core/WasmParser';
import { ProcessEnvOptions } from 'child_process';
import Process from './core/Process';

class Kernel {
    registry: Registry;

    fs: FileSystem;

    vm: VirtualMachine;

    encryption: Encryption;

    wasmParser: WasmParser;

    constructor(registry: Registry, fs: FileSystem, vm: VirtualMachine, encryption: Encryption, wasmParser: WasmParser) {
        this.registry = registry;
        this.fs = fs;
        this.vm = vm;
        this.encryption = encryption;
        this.wasmParser = wasmParser;
    }

    /**
     * Spawns a new process
     *
     * @param {Uint8Array} bin
     * @param {string[]} args
     * @param {ProcessEnvOptions} options
     * @returns {Promise<Process>}
     * @memberof Kernel
     */
    async spawnProcess(bin: Uint8Array, args: string[], options: ProcessEnvOptions): Promise<Process> {
        if (!this.fs) {
            throw new Error('System is not booted');
        }

        const process = new Process(this.fs, bin, args, options);
        return process;
    }
}

export async function bootKernel(privateSeed: string, provider: IKernelProvider): Promise<Kernel> {
    const registry = new Registry({}, provider);
    const encryption = new Encryption(privateSeed);

    await provider.init(encryption.createKey('provider'));

    const fs = await FileSystem.create(registry, provider);
    const wasmParser = new WasmParser(fs);
    const vm = new VirtualMachine(fs.wasmFs);

    return new Kernel(registry, fs, vm, encryption, wasmParser);
}

export default Kernel;
