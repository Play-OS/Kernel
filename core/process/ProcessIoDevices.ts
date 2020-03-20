import { WasmFs } from '@wasmer/wasmfs';
import { IoDevices } from '@wasmer/io-devices';
import { createTargetedPostMessageInstance } from './helpers/postWorkerMessage';

function debounce(func: Function, wait: number, immediate?: boolean) {
    let timeout: any;
    let counter: number = 0;

    return function executedFunction(...args: any[]) {
        if (counter === wait) {
            counter = 0;
            func(...args);
        }

        counter += 1;
    };
}

export default function attachIoDevicesToFs(wasmFs: WasmFs, canvas: OffscreenCanvas) {
    const ioDevices = new IoDevices(wasmFs);
    const context = canvas.getContext('2d');
    const windowPostMessage = createTargetedPostMessageInstance('process', 'window');

    if (!context) {
        throw new Error('Attaching failed, could not find context');
    }

    let imageData: ImageData;
    let windowSizeW = 160;
    let windowSizeH = 144;
    let count = 0;

    ioDevices.setWindowSizeCallback(() => {
        const windowSize = ioDevices.getWindowSize();
        [windowSizeW, windowSizeH] = windowSize;
        imageData = context.getImageData(0, 0, windowSize[0], windowSize[1]);
    });

    ioDevices.setBufferIndexDisplayCallback(async () => {
        const frameBuffer = ioDevices.getFrameBuffer();

        windowPostMessage({
            args: [frameBuffer],
            type: 'render',
        });

        // imageData.data.set(frameBuffer);
        // context.putImageData(imageData, 0, 0);
    });
}
