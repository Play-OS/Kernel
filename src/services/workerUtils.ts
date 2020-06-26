import * as Comlink from 'comlink';
import isNodeJs from './isNodeJs';
import nodeEndpoint from './comlinkNodeEndpoint';
import { MessageType, RequestMessage } from '../models/WorkerMessage';

export function proxyWithComlink(obj: any): Comlink.ProxyMarked {
    if (isNodeJs()) {
        // @ts-ignore
        return Comlink.proxy<T>(nodeEndpoint(obj));
    }

    return Comlink.proxy(obj);
}

export function wrapWithComlink<T>(worker: Worker): Comlink.Remote<T> {
    if (isNodeJs()) {
        // @ts-ignore
        return Comlink.wrap<T>(nodeEndpoint(worker));
    }

    return Comlink.wrap<T>(worker);
}

export function exposeWithComlink(obj: any): void {
    if (isNodeJs()) {
        // @ts-ignore
        const workerThreads =  __non_webpack_require__('worker_threads');
        const { parentPort } =  workerThreads;
        console.log('Via node');
        return Comlink.expose(obj, nodeEndpoint(parentPort));
    }

    return Comlink.expose(obj);
}

export function createWorker(stringUrl: string, options?: any): Worker {
    let WorkerConstructor: any = null;

    if (isNodeJs()) {
        // @ts-ignore
        const workerThreads =  __non_webpack_require__('worker_threads');
        WorkerConstructor = workerThreads.Worker;
    } else {
        WorkerConstructor = Worker;
    }

    return new WorkerConstructor(stringUrl, options);
}

export function workerPostMessage<T>(message: RequestMessage<T>) {
    if (isNodeJs()) {
        // @ts-ignore
        const workerThreads = __non_webpack_require__('worker_threads');
        workerThreads.parentPort.postMessage(message);
    } else {
        // @ts-ignore
        self.postMessage(message);
    }
}

export function workerRequest<T, R>(message: RequestMessage<T>, listenForChanges: boolean = true): Promise<RequestMessage<R> | null> {
    return new Promise((resolve) => {
        message.id = Math.random().toString();

        if (listenForChanges) {
            const listener = (event: any) => {
                const receivedMessage = extractMessageFromEvent<R>(event);

                if (receivedMessage.id === message.id) {
                    workerRemoveEventListener('message', listener);
                    resolve(receivedMessage);
                }
            }

            workerPostMessage(message);
            workerAddEventListener('message', listener);
        } else {
            workerPostMessage(message);
            resolve(null);
        }
    });
}

export function workerAddEventListener(eventType: string, callback: (event: any) => void) {
    if (isNodeJs()) {
        // @ts-ignore
        const workerThreads =  __non_webpack_require__('worker_threads');
        workerThreads.parentPort.on(eventType, callback);
    } else {
        self.addEventListener(eventType, callback);
    }
}

export function workerRemoveEventListener(eventType: string, callback: (event: any) => void) {
    if (isNodeJs()) {
        // @ts-ignore
        const workerThreads =  __non_webpack_require__('worker_threads');
        workerThreads.parentPort.off(eventType, callback);
    } else {
        self.removeEventListener(eventType, callback);
    }
}

export function addEventListenerOnWorker(worker: Worker, evenType: string, callback: (event: any) => void) {
    if (isNodeJs()) {
        // @ts-ignore
        worker.on(evenType, callback);
    } else {
        worker.addEventListener(evenType, callback);
    }
}

export function postMessageOnWorker<T>(worker: Worker, message: RequestMessage<T>) {
    worker.postMessage(message);
}

export function extractMessageFromEvent<T>(event: any): RequestMessage<T> {
    try {
        if (isNodeJs()) {
            return event;
        }

        return event.data;
    } catch (error) {
        return event;
    }
}

