import * as Comlink from 'comlink';
import { ProcessEnvOptions } from 'child_process';
import VirtualMachine from './core/VirtualMachine';
import { WasmFs } from '@wasmer/wasmfs';
import VirtualMachineContext from './core/VirtualMachineContext';

class KernelWorker {
    binary: Uint8Array;
    args: string[];
    options: ProcessEnvOptions;
    wasmFs: WasmFs;
    sharedValuesBuffer: SharedArrayBuffer;
    sharedNotifierBuffer: SharedArrayBuffer;
    context: VirtualMachineContext;

    async prepare(binary: Uint8Array, args: string[], options: ProcessEnvOptions) {
        this.binary = binary;
        this.args = args;
        this.options = options;
        // This is just a stub fs and not our real fs
        // This way we can always catch the synchrounus and asynchronous call
        // beforehand and map the real files on the fly
        this.wasmFs = new WasmFs();
        this.wasmFs.fs.writeFileSync('/test.txt', 'Hello world');
        this.sharedNotifierBuffer = new SharedArrayBuffer(4);
        this.sharedValuesBuffer = new SharedArrayBuffer(4096);
        this.context = new VirtualMachineContext(this.wasmFs, this.sharedNotifierBuffer, this.sharedValuesBuffer);


        return {
            notifierBuffer: this.sharedNotifierBuffer,
            valuesBuffer: this.sharedValuesBuffer,
        };
    }

    async spawn() {
        const vm = new VirtualMachine(this.wasmFs);
        const preparedBinary = await vm.prepareBin(this.binary);

        const result = await vm.execute(preparedBinary, this.args, this.options.env);
        return result;
    }
}

Comlink.expose(new KernelWorker());

export default KernelWorker;
