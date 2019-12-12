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
        return Buffer.from(localStorage.getItem(id));
    }

    async storeFile(file: Buffer, path?: string) {
        const fileId = Math.random().toString();
        localStorage.setItem(fileId, file.toString());
        return fileId;
    }
}

export default BrowserProvider;
