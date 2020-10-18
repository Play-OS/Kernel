import { RequestMessage } from "../../../models/WorkerMessage";
import IKernelProvider from "../../../interfaces/IKernelProvider";
import { postMessageOnWorker } from "../../../services/workerUtils";
import { numberToHex } from '../../../services/hexUtils';
import { storeAndNotify } from "../../../services/sharedBufferUtils";
import convertToBuffer from '../../../services/convertToBuffer';

const NOTIFIER_BUFFER_SIZE = 8;

export class ProcessMessageHandler {
    private notifierBuffer: SharedArrayBuffer;
    private provider: IKernelProvider;
    private methodCallResult?: Buffer | null;

    // Will be set by Process.ts on spawn()
    public worker?: Worker;

    constructor(provider: IKernelProvider, notifierBuffer: SharedArrayBuffer) {
        this.provider = provider;
        this.notifierBuffer = notifierBuffer;
    }

    private sendResultLengthToWorker(value: Buffer | null) {
        const u8NotifierBuffer = new Uint8Array(this.notifierBuffer);
        const lengthOfValueInHex = numberToHex(value?.length || 0, NOTIFIER_BUFFER_SIZE * 2);

        this.methodCallResult = value;

        // Write length to notifierbuffer
        u8NotifierBuffer.set(Buffer.from(lengthOfValueInHex, 'hex'), 1);
        storeAndNotify(this.notifierBuffer, 0, 1);
    }

    private writeResultToBuffer(valueBuffer: SharedArrayBuffer) {
        const u8WriteBuffer = new Uint8Array(valueBuffer);

        if (this.methodCallResult) {
            u8WriteBuffer.set(this.methodCallResult);
        } else {
            u8WriteBuffer.set([]);
        }

        storeAndNotify(this.notifierBuffer, 0, 1);
    }

    async handleProviderMessage(message: RequestMessage<any>) {
        if (message.method === 'writeResultToBuffer') {
            this.writeResultToBuffer(message.value);
        } else if (message.method === 'fetchFile') {
            const result = await this.provider.fetchFile(message.value.id);
            this.sendResultLengthToWorker(result);
        } else if (message.method === 'storeFile') {
            const result = await this.provider.storeFile(message.value.file, message.value.path);
            this.sendResultLengthToWorker(convertToBuffer(result));
        }
    }
}
