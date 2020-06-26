import { RequestMessage } from "../../../models/WorkerMessage";
import IKernelProvider from "../../../interfaces/IKernelProvider";
import { postMessageOnWorker } from "../../../services/workerUtils";

export default async function processProviderMessageHandler(data: RequestMessage<any>, provider: IKernelProvider, worker: Worker) {
    if (data.method === 'storageGet') {
        const result = await provider.storageGet(data.value.key);

        postMessageOnWorker(worker, {
            ...data,
            value: result,
        });
    } else if (data.method === 'storageSet') {
        await provider.storageSet(data.value.key, data.value.value);

        postMessageOnWorker(worker, {
            ...data,
        });
    } else if (data.method === 'fetchFile') {
        const result = await provider.fetchFile(data.value.id);

        postMessageOnWorker(worker, {
            ...data,
            value: result,
        });
    } else if (data.method === 'storeFile') {
        const result = await provider.storeFile(data.value.file, data.value.path);

        postMessageOnWorker(worker, {
            ...data,
            value: result,
        });
    }
}
