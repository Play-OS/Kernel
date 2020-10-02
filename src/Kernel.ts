import { ProcessEnvOptions } from 'child_process';

import Registry from './core/Registry';
import FileSystem from './core/FileSystem';
import IKernelProvider from './interfaces/IKernelProvider';
import VirtualMachine from './core/VirtualMachine';
import Encryption from './core/Encryption';
import WasmParser from './core/WasmParser';
import Process from './core/process/Process';
import Application from './models/Application';

class Kernel {
    registry: Registry;

    fs: FileSystem;

    vm: VirtualMachine;

    encryption: Encryption;

    wasmParser: WasmParser;

    openProcesses: Process[] = [];

    processCounter: number = 0;

    provider: IKernelProvider;

    constructor(registry: Registry, fs: FileSystem, vm: VirtualMachine, encryption: Encryption, wasmParser: WasmParser, provider: IKernelProvider) {
        this.registry = registry;
        this.fs = fs;
        this.vm = vm;
        this.encryption = encryption;
        this.wasmParser = wasmParser;
        this.provider = provider;
    }

    /**
     * creates a new process
     *
     * @param {Uint8Array} bin
     * @param {string[]} args
     * @param {ProcessEnvOptions} options
     * @returns {Promise<Process>}
     * @memberof Kernel
     */
    async createProcess(bin: Uint8Array, args: string[], options: ProcessEnvOptions['env']): Promise<Process> {
        this.processCounter += 1;

        const process = new Process(this.provider, bin, args, this.processCounter, options);
        this.openProcesses.push(process);
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

    return new Kernel(registry, fs, vm, encryption, wasmParser, provider);
}

export default Kernel;
