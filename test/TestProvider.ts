import IKernelProvider from '../src/interfaces/IKernelProvider';

export const fileStorage: { [key: string]: Buffer } = {};
export const keyStorage: { [key: string]: string } = {};

export const TestProvider: IKernelProvider = {
    async init() {

    },
    async fetchFile(id: string): Promise<Buffer> {
        return fileStorage[id];
    },
    async storageGet(key: string): Promise<string> {
        return keyStorage[key];
    },
    async storageSet(key: string, value: string) {
        keyStorage[key] = value;
    },
    async storeFile(file: Buffer, path: string) {
        const fileId = Math.random().toString();
        fileStorage[fileId] = file;
        return fileId;
    },
    async setMapping() {},
    setMappingListener() {},
};
