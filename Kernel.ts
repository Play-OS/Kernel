import Registry from './core/Registry';
import FileSystem from './core/FileSystem';
import IKernelProvider from './interfaces/IKernelProvider';
import VirtualMachine from './core/VirtualMachine';
import Encryption from './core/Encryption';
import WasmParser from './core/WasmParser';
import KernelWorker from './KernelWorker';
import { ProcessEnvOptions } from 'child_process';
import Process from './core/Process';

class Kernel {
    registry: Registry;

    fs: FileSystem;

    vm: VirtualMachine;

    encryption: Encryption;

    privateSeed: string;

    provider: IKernelProvider;

    wasmParser: WasmParser;

    constructor(privateSeed: string, provider: IKernelProvider) {
        this.privateSeed = privateSeed;
        this.provider = provider;
    }

    /**
     * "Boots" the kernel. This sets everything up (fs, vm, enc, etc)
     *
     * @memberof Kernel
     */
    async boot(): Promise<void> {
        this.registry = new Registry({}, this.provider);
        this.encryption = new Encryption(this.privateSeed);

        await this.provider.init(this.encryption.createKey('provider'));

        this.fs = await FileSystem.create(this.registry, this.provider);
        this.wasmParser = new WasmParser(this.fs);
        this.vm = new VirtualMachine(this.fs.wasmFs);
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
        const process = new Process(this.fs, bin, args, options);
        return process;
    }
}

export default Kernel;
