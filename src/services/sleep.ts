/**
 * Sets a timeout for x seconds
 *
 * @export
 * @param {number} ms
 * @returns {Promise<void>}
 */
export default function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
