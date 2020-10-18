import IKernelProvider from '../interfaces/IKernelProvider';
import { bytesToString } from '../services/stringToBytes';

const BP_PREFIX = 'BP_';

class BrowserProvider implements IKernelProvider {
    async init(key: string) {

    }

    async fetchFile(id: string) {
        const item = localStorage.getItem(`${BP_PREFIX}${id}`);

        if (!item) {
            return null;
        }

        console.log('[] JSON.parse(item).data -> ', JSON.parse(item).data);

        return Buffer.from(JSON.parse(item).data);
    }

    async storeFile(file: Buffer, path?: string) {
        const buf = Buffer.from(file);
        localStorage.setItem(`${BP_PREFIX}${path}`, JSON.stringify(buf.toJSON()));
        return path || '';
    }
}

export default BrowserProvider;
