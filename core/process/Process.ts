import * as Comlink from 'comlink';
import { EventEmitter } from 'events';

import { ProcessEnvOptions } from 'child_process';
// @ts-ignore
import createProcessWorker from 'workerize-loader?inline!./ProcessWorker'; // eslint-disable-line import/no-webpack-loader-syntax
// @ts-ignore
import createFileSystemWorker from 'workerize-loader?inline!./FileSystemWorker'; // eslint-disable-line import/no-webpack-loader-syntax
import { ComlinkFileSystemWorkerMethods } from './FileSystemWorker';

import { ComlinkProcessWorkerMethods } from './ProcessWorker';
import IKernelProvider from '../../interfaces/IKernelProvider';
import redirectWorkerMessages from './helpers/redirectWorkerMessages';

class Process extends EventEmitter {
    args: string[];
    options?: ProcessEnvOptions;
    bin: Uint8Array;
    pid: number;
    provider: IKernelProvider;

    private notifierBuffer?: SharedArrayBuffer;
    private valuesBuffer?: SharedArrayBuffer;

    /**
     * Creates an instance of Process.
     *
     * @param {Uint8Array} bin WASM Binary to launc
     * @param {string[]} args Arguments to give to the binary
     * @param {ProcessOptions} [options] optional options
     * @memberof Process
     */
    constructor(provider: IKernelProvider, bin: Uint8Array, args: string[], pid: number, options?: ProcessEnvOptions) {
        super();

        this.args = args;
        this.options = options;
        this.bin = bin;
        this.pid = pid;
        this.provider = provider;
    }

    async spawn(): Promise<void> {
        try {
            const createdProcessWorker: Worker = createProcessWorker();
            const createdFileSystemWorker: Worker = createFileSystemWorker();
            const processWorker = Comlink.wrap<ComlinkProcessWorkerMethods>(createdProcessWorker);
            const fileSystemWorker = Comlink.wrap<ComlinkFileSystemWorkerMethods>(createdFileSystemWorker);

            // TEMP Canvas creating and attaching
            const canvas = document.createElement('canvas');
            canvas.className = 'CanvasYo';
            canvas.style.display = 'none';
            document.body.appendChild(canvas);

            const canvas2 = document.createElement('canvas');
            canvas2.className = 'CanvasYo';
            document.body.appendChild(canvas2);

            const context = canvas2.getContext('2d');

            if (!context) {
                throw new Error('No context');
            }

            const imageData = context?.getImageData(0, 0, 160, 144);


            const offscreenCanvas = canvas.transferControlToOffscreen();
            const transferableCanvas = Comlink.transfer(offscreenCanvas, [offscreenCanvas]);

            redirectWorkerMessages([
                {
                    worker: createdFileSystemWorker,
                    targetName: 'fileSystem',
                },
                {
                    worker: createdProcessWorker,
                    targetName: 'process',
                },
                {
                    // @ts-ignore
                    worker: window,
                    targetName: 'window'
                }
            ]);

            // @ts-ignore
            function onWindowMessage(message: MessageEvent) {
                const { type } = message.data;

                if (type === 'render') {
                    console.log('Render');
                    imageData.data.set(message.data.args[0]);
                    context?.putImageData(imageData, 0, 0);
                }
            }

            window.addEventListener('message', onWindowMessage);

            const spawnedFileSystemWorker = await fileSystemWorker.spawnFileSystem({}, Comlink.proxy(this.provider));
            const spawnedProcessWorker = await processWorker.spawnProcessWorker({
                args: this.args,
                binary: this.bin,
                options: this.options,
            }, Comlink.proxy(this.provider), transferableCanvas);

            spawnedProcessWorker.on('exit', Comlink.proxy((code: number) => {
                console.info(`🖥 Process exited with code ${code}`);
                this.emit('exit', code);
                createdProcessWorker.terminate();
                createdFileSystemWorker.terminate();
                const oldCanvas = document.querySelector('.CanvasYo');
                oldCanvas && oldCanvas.remove();
                window.removeEventListener('message', onWindowMessage);
                // worker.terminate();
            }));

            spawnedFileSystemWorker.on('message', Comlink.proxy((message: string) => {
                this.emit('message', message);
            }));

            await spawnedProcessWorker.spawn();
        } catch (error) {
            console.error('[Process.spawn]', error);
        }
    }
}

export default Process;
