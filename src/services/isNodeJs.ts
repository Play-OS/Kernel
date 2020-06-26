export default function isNodeJs(): boolean {
    // @ts-ignore
    if (typeof __non_webpack_require__ === 'undefined') {
        return false;
    } else {
        return true;
    }
}
