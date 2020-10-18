import { workerRequest } from '../services/workerUtils';
import { MessageType } from '../models/WorkerMessage';
import { reset, waitAndLoad } from '../services/sharedBufferUtils';
import { bufferToNumber } from '../services/hexUtils';

const NOTIFIER_BUFFER_SIZE = 8;

class WorkerMessageProvider {
    private notifierBuffer: SharedArrayBuffer;

    constructor(notifierBuffer: SharedArrayBuffer) {
        this.notifierBuffer = notifierBuffer;
    }

    private callMethodOnMainThread(method: string, value: any): Buffer | null {
        // Request the main thread to execute a method
        workerRequest<any, string>({
            type: MessageType.Provider,
            method,
            value,
        });

        // Freezes the thread and waits for the main thread to respond
        waitAndLoad(this.notifierBuffer, 0);
        reset(this.notifierBuffer, 0);

        // The main thread only wrote the current length of the value
        // We need to find out what it is and give back a big enough shared buffer
        const u8NotifierBuffer = new Uint8Array(this.notifierBuffer);
        const lenghtBuffer = Buffer.from(u8NotifierBuffer.slice(1, NOTIFIER_BUFFER_SIZE + 1));
        const length = bufferToNumber(lenghtBuffer);

        if (length === 0) {
            return null;
        }

        const valueBuffer = new SharedArrayBuffer(length);

        workerRequest<any, any>({
            type: MessageType.Provider,
            method: 'writeResultToBuffer',
            value: valueBuffer,
        });

        // Freeze the thread again to get our final result
        waitAndLoad(this.notifierBuffer, 0);
        reset(this.notifierBuffer, 0);

        return Buffer.from(new Uint8Array(valueBuffer));
    }

    async init(key: string) {

    }

    fetchFileSync(id: string) {
        const result = this.callMethodOnMainThread('fetchFile', {
            id,
        });

        return result;
    }

    storeFileSync(file: Buffer, path?: string) {
        const result = this.callMethodOnMainThread('storeFile', {
            file,
            path,
        });

        return result?.toString() || '';
    }
}

export default WorkerMessageProvider;
