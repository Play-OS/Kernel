import IKernelProvider from '../interfaces/IKernelProvider';
import { workerRequest } from '../services/workerUtils';
import { MessageType } from '../models/WorkerMessage';

class WorkerMessageProvider implements IKernelProvider {
    async init(key: string) {

    }

    async setMapping(mapping: {[key: string]: object}) {

    }

    setMappingListener(listener: any) {

    }

    async storageGet(key: string) {
        const result = await workerRequest<any, string>({
            type: MessageType.Provider,
            method: 'storageGet',
            value: {
                key,
            }
        });

        return result?.value || null;
    }

    async storageSet(key: string, value: any) {
        await workerRequest({
            type: MessageType.Provider,
            method: 'storageSet',
            value: {
                key,
                value,
            }
        });
    }

    async fetchFile(id: string) {
        const result = await workerRequest<any, Buffer>({
            type: MessageType.Provider,
            method: 'fetchFile',
            value: {
                id,
            }
        });

        return result?.value || null;
    }

    async storeFile(file: Buffer, path?: string) {
        const result = await workerRequest<any, string>({
            type: MessageType.Provider,
            method: 'storeFile',
            value: {
                file,
                path,
            }
        });

        return result?.value || '';
    }
}

export default WorkerMessageProvider;
