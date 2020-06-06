/**
 * Converts a string to a byte array
 *
 * @export
 * @param {string} str
 * @returns {Uint8Array}
 */
export default function stringToBytes(str: string): Uint8Array {
    const byteArray = new Uint8Array(str.length);

    for (let i = 0; i < str.length; i += 1) {
        byteArray[i] = str.charCodeAt(i);
    }

    return byteArray;
}

/**
 * Converts bytes to a string
 *
 * @export
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToString(bytes: Uint8Array): string {
    return new TextDecoder('utf-8').decode(bytes);
}
