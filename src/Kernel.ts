import { ProcessEnvOptions } from 'child_process';

import IKernelProvider from './interfaces/IKernelProvider';
import Encryption from './core/Encryption';
import Process from './core/process/Process';

class Kernel {
    encryption: Encryption;

    openProcesses: Process[] = [];

    processCounter: number = 0;

    provider: IKernelProvider;

    constructor(encryption: Encryption, provider: IKernelProvider) {
        this.encryption = encryption;
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
    const encryption = new Encryption(privateSeed);

    await provider.init(encryption.createKey('provider'));

    return new Kernel(encryption, provider);
}

export default Kernel;
