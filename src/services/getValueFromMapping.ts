/**
 * Gets a path from the mapping. It corrects where needed
 *
 * @export
 * @param {string} key
 * @param {{[ key: string ]: any}} mapping
 * @returns {Buffer}
 */
export default function getValueFromMapping(key: string, mapping: {[ key: string ]: any}): Buffer | null {
    if (mapping[key]) {
        return Buffer.from(mapping[key]);
    }

    // Key does not exist. Lets try stripping the first slash
    const slicedKey = key.slice(1);
    const value = mapping[slicedKey];

    if (!value) {
        return null;
    }

    return Buffer.from(value);
}
