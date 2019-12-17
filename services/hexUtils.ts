/**
 * Converts an byte array to a hex string
 *
 * @export
 * @param {ArrayLike<number>} byteArray
 * @returns {string}
 */
export function toHex(byteArray: ArrayLike<number>): string {
    return Array.prototype.map.call(byteArray, function(byte: number) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

/**
 * Converst numbers to a hex format
 * Makes sure that small numbers are in 2 byte pairs
 *
 * @export
 * @param {number} num
 * @returns
 */
export function numberToHex(num: number, padBytes: number = 2) {
    let result = num.toString(16);

    if ((result.length % 2) > 0) {
        result = '0' + result;
    }

    if (result.length < padBytes) {
        const missingAmountOfBytes = new Array(padBytes - result.length).fill('0');
        result = missingAmountOfBytes.join('') + result;
    }

    return result;
}
