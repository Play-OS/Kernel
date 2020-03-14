import { numberToHex } from "./hexUtils";
import stringToBytes from "./stringToBytes";

export default function convertToBuffer(value: any): Buffer {
    let bufferResult: Buffer | null = null;

    if (value instanceof Uint8Array) {
        bufferResult = Buffer.from(value);
    } else if (typeof value === 'number') {
        bufferResult = Buffer.from(numberToHex(value), 'hex');
    } else if (typeof value === 'object') {
        bufferResult = Buffer.from(stringToBytes(JSON.stringify(value)));
    } else if (typeof value === 'string') {
        bufferResult = Buffer.from(stringToBytes(value));
    }

    if (!bufferResult) {
        throw new Error(`Could not convert value ${value} to Buffer`);
    }

    return bufferResult;
}
