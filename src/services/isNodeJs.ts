export default function isNodeJs(): boolean {
    if (typeof global.require === 'undefined') {
        return false;
    }

    if (typeof window === 'undefined') {
        return true;
    }

    return false;
}
