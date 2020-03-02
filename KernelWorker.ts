import * as Comlink from 'comlink';
import { ProcessEnvOptions } from 'child_process';
import VirtualMachine from './core/VirtualMachine';
import { WasmFs } from '@wasmer/wasmfs';
import { IoDevices } from "@wasmer/io-devices";
import VirtualMachineContext from './core/VirtualMachineContext';
import { workerRequest } from './services/workerUtils';
import { FsMapping } from './core/FileSystem';

class KernelWorker {
    binary?: Uint8Array;
    args?: string[];
    options?: ProcessEnvOptions;
    wasmFs?: WasmFs;
    sharedValuesBuffer?: SharedArrayBuffer;
    sharedNotifierBuffer?: SharedArrayBuffer;
    context?: VirtualMachineContext;
    canvas?: OffscreenCanvas;

    setCanvas(canvas: OffscreenCanvas) {
        this.canvas = canvas;
    }

    async prepare(binary: Uint8Array, fsMapping: FsMapping, args: string[], options?: ProcessEnvOptions) {
        if (!this.canvas) {
            throw new Error('Canvas should be available');
        }

        this.binary = binary;
        this.args = args;
        this.options = options;
        // This is just a stub fs and not our real fs
        // This way we can always catch the synchrounus and asynchronous call
        // beforehand and map the real files on the fly
        this.wasmFs = new WasmFs();
        this.wasmFs.fromJSON(fsMapping);
        const ioDevices = new IoDevices(this.wasmFs);

        this.sharedNotifierBuffer = new SharedArrayBuffer(4);
        this.sharedValuesBuffer = new SharedArrayBuffer(700000);
        this.context = new VirtualMachineContext(this.wasmFs, fsMapping, this.sharedNotifierBuffer, this.sharedValuesBuffer);

        const context = this.canvas.getContext('2d');

        if (!context) {
            throw new Error('Context could not be created');
        }

        let imageData: ImageData;
        context.moveTo(0, 0);
        context.lineTo(200, 100);
        context.stroke();

        let windowSizeW = 160;
        let windowSizeH = 144;

        // let frame: Uint8Array = new Uint8Array();

        ioDevices.setWindowSizeCallback(() => {
            const windowSize = ioDevices.getWindowSize();
            windowSizeW = windowSize[0];
            windowSizeH = windowSize[1];
            imageData = context.getImageData(0, 0, windowSize[0], windowSize[1]);
        });

        ioDevices.setBufferIndexDisplayCallback(() => {
            setImmediate(() => {
                const frameBuffer = ioDevices.getFrameBuffer();
                console.log('[] frameBuffer -> ', frameBuffer);
                imageData.data.set(frameBuffer);
                context.putImageData(imageData, 0, 0);
            });
        });

        this.context.on('error', (message: string) => {
            workerRequest({
                type: `context::error`,
                value: message,
                bufferIndex: 0,
            });
        });

        this.context.on('message', (message: string) => {
            workerRequest({
                type: `context::message`,
                value: message,
                bufferIndex: 0,
            });
        });

        return {
            notifierBuffer: this.sharedNotifierBuffer,
            valuesBuffer: this.sharedValuesBuffer,
        };
    }

    async spawn() {
        if (!this.wasmFs || !this.binary) {
            throw new Error('Worker was not prepared');
        }

        const vm = new VirtualMachine(this.wasmFs);
        const preparedBinary = await vm.prepareBin(this.binary);

        const result = await vm.execute(preparedBinary, this.args, this.options?.env);
        return result;
    }
}

Comlink.expose(KernelWorker);

export default KernelWorker;
