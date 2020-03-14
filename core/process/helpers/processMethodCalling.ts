import { waitAndLoad, reset, storeAndNotify } from "../../../services/sharedBufferUtils";
import { createTargetedPostMessageInstance } from "./postWorkerMessage";
import { numberToHex, bufferToNumber } from "../../../services/hexUtils";
import stringToBytes from "../../../services/stringToBytes";
import convertToBuffer from "../../../services/convertToBuffer";

const PROCESS_TARGET_NAME = 'process';
const FS_TARGET_NAME = 'fileSystem';
const NUMBER_BYTES_LENGTH = 8;

export function callMethodOnFileSystemWorker(type: string, args: any[], notifierBuffer: SharedArrayBuffer): Buffer {
    const postFileWorkerMessage = createTargetedPostMessageInstance(PROCESS_TARGET_NAME, FS_TARGET_NAME);

    postFileWorkerMessage({
        args: [type, ...args],
        type: 'callMethodOnFs',
    });

    // Lock our thread and wait for a change
    waitAndLoad(notifierBuffer, 0);
    reset(notifierBuffer, 0);

    const u8NotifierBuffer = new Uint8Array(notifierBuffer);

    // Skip the first byte because this was our notify byte
    const lengthBuffer = Buffer.from(u8NotifierBuffer.slice(1, NUMBER_BYTES_LENGTH + 1));
    const length = bufferToNumber(lengthBuffer);

    // Now that we know our length we can create a sharedArrayBuffer to write on
    const valueBuffer = new SharedArrayBuffer(length);
    postFileWorkerMessage({
        args: [valueBuffer],
        type: 'writeMethodResultToBuffer',
    });

    // Relock our thread and wait again..
    waitAndLoad(notifierBuffer, 0);
    reset(notifierBuffer, 0);

    return Buffer.from(new Uint8Array(valueBuffer));
}

export function postMethodResultLengthToProcess(value: Buffer, notifierBuffer: SharedArrayBuffer) {
    const u8NotifierBuffer = new Uint8Array(notifierBuffer);
    const lengthHex = numberToHex(value.length, NUMBER_BYTES_LENGTH * 2);

    // Skip 1 byte for notifying and convert the number to a 32 bit
    u8NotifierBuffer.set(Buffer.from(lengthHex, 'hex'), 1);
    storeAndNotify(notifierBuffer, 0, 1);
}
