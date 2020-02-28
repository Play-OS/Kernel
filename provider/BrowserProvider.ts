import IKernelProvider from '../interfaces/IKernelProvider';

class BrowserProvider implements IKernelProvider {
    async init(key: string) {

    }

    async setMapping(mapping: {[key: string]: object}) {

    }

    setMappingListener(listener: any) {

    }

    async storageGet(key: string) {
        return localStorage.getItem(key);
    }

    async storageSet(key: string, value: any) {
        localStorage.setItem(key, value);
    }

    async fetchFile(id: string) {
        const item = localStorage.getItem(id);

        if (!item) {
            return null;
        }

        return Buffer.from(JSON.parse(item));
    }

    async storeFile(file: Buffer, path?: string) {
        const buf = Buffer.from(file);
        const fileId = Math.random().toString();
        localStorage.setItem(fileId, JSON.stringify(buf.toJSON()));
        return fileId;
    }
}

export default BrowserProvider;
