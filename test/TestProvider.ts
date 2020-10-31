import IKernelProvider from '../src/interfaces/IKernelProvider';

export const fileStorage: { [key: string]: Buffer } = {};
export const keyStorage: { [key: string]: string } = {};

export class TestProvider implements IKernelProvider {
    fileStorage: { [key: string]: Buffer } = {};

    reset() {
        this.fileStorage = {};
    }

    async init() {

    }

    async fetchFile(id: string): Promise<Buffer> {
        return fileStorage[id];
    }

    async storeFile(file: Buffer, path: string) {
        const fileId = path;
        fileStorage[fileId] = file;
        return fileId;
    }
}
